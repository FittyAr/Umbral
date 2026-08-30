import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CardSchema, CategorySchema } from '../src/lib/schema/index.ts';
import {
  cardGroups,
  adminCardsLayout,
  moveCardToCategory,
  moveCardToUngrouped,
  syncOrderFromDom,
  renumberOrdersByCategories,
  pruneEmptyGhosts,
  mergeAdjacentGhosts,
  reorderRealCategories,
  createGhostCategory,
  realCategories,
  ORPHAN_CATEGORY_ID,
  GAP_CATEGORY_ID,
  UNGROUPED_SELECT_ID,
} from '../src/lib/cards-admin.ts';
import {
  isSystemCard,
  reconcileSystemCards,
  restoreSystemCardProtectedFields,
} from '../src/lib/system-card.ts';
import { JSDOM } from 'jsdom';

function makeCategory(id: string, name: string, extra: Record<string, unknown> = {}) {
  return CategorySchema.parse({ id, name, ...extra });
}

function makeGhost(id: string) {
  return CategorySchema.parse({ id, isGhost: true });
}

function makeCard(id: string, category: string, order: number, title = id, extra: Record<string, unknown> = {}) {
  return CardSchema.parse({
    id,
    title,
    category,
    order,
    url: extra.url ?? 'https://example.com',
    ...extra,
  });
}

describe('CategorySchema ghosts', () => {
  test('real category requires a name', () => {
    assert.throws(() => CategorySchema.parse({ id: 'prod' }));
    assert.throws(() => CategorySchema.parse({ id: 'prod', name: '', isGhost: false }));
  });

  test('ghost allows empty name and kebab-case id', () => {
    const ghost = CategorySchema.parse({ id: 'ghost-ab12cd', isGhost: true });
    assert.equal(ghost.isGhost, true);
    assert.equal(ghost.name, '');
    assert.match(ghost.id, /^[a-z0-9-]+$/);
  });

  test('ghost cannot be subpage or locked', () => {
    assert.throws(() => CategorySchema.parse({ id: 'ghost-x', isGhost: true, isSubpage: true }));
    assert.throws(() => CategorySchema.parse({ id: 'ghost-x', isGhost: true, isLocked: true }));
  });

  test('legacy category without isGhost defaults to false', () => {
    const cat = CategorySchema.parse({ id: 'prod', name: 'Productividad' });
    assert.equal(cat.isGhost, false);
  });
});

describe('cards-admin', () => {
  const categories = [
    makeCategory('prod', 'Productividad'),
    makeCategory('infra', 'Infraestructura'),
  ];

  test('cardGroups orders by category array and detects orphans', () => {
    const cards = [
      makeCard('a', 'prod', 0),
      makeCard('b', 'infra', 1),
      makeCard('c', 'deleted-cat', 2),
    ];

    const groups = cardGroups(categories, cards, '', 'Sin categoría');
    assert.equal(groups.length, 3);
    assert.equal(groups[0].categoryId, 'prod');
    assert.equal(groups[0].cards.length, 1);
    assert.equal(groups[1].categoryId, 'infra');
    assert.equal(groups[2].categoryId, ORPHAN_CATEGORY_ID);
    assert.equal(groups[2].cards[0].id, 'c');
  });

  test('cardGroups keeps ghost buckets in array order', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeGhost('ghost-mid'),
      makeCategory('infra', 'Infraestructura'),
    ];
    const cards = [
      makeCard('a', 'prod', 0),
      makeCard('loose', 'ghost-mid', 1),
      makeCard('b', 'infra', 2),
    ];
    const groups = cardGroups(cats, cards, '', 'Sin categoría', 'Sin grupo');
    assert.equal(groups.map((g) => g.categoryId).join(','), 'prod,ghost-mid,infra');
    assert.equal(groups[1].isGhost, true);
    assert.equal(groups[1].categoryName, 'Sin grupo');
    assert.equal(groups[1].cards[0].id, 'loose');
  });

  test('cardGroups applies text filter', () => {
    const cards = [makeCard('a', 'prod', 0, 'Alpha'), makeCard('b', 'prod', 1, 'Beta')];
    const groups = cardGroups(categories, cards, 'beta');
    assert.equal(groups[0].cards.length, 1);
    assert.equal(groups[0].cards[0].id, 'b');
  });

  test('adminCardsLayout inserts gaps around real groups, not next to ghosts', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeGhost('ghost-mid'),
      makeCategory('infra', 'Infraestructura'),
    ];
    const cards = [makeCard('a', 'prod', 0), makeCard('loose', 'ghost-mid', 1), makeCard('b', 'infra', 2)];
    const layout = adminCardsLayout(cats, cards, '', 'Sin categoría', 'Sin grupo');
    const types = layout.map((item) => (item.type === 'gap' ? 'gap' : item.group.categoryId));
    assert.deepEqual(types, ['gap', 'prod', 'ghost-mid', 'infra', 'gap']);
  });

  test('moveCardToCategory reassigns category and appends at end by default', () => {
    const cards = [makeCard('a', 'prod', 0), makeCard('b', 'prod', 1), makeCard('c', 'infra', 2)];
    moveCardToCategory(categories, cards, 'a', 'infra');
    assert.equal(cards.find((c) => c.id === 'a')?.category, 'infra');
    assert.equal(cards.find((c) => c.id === 'b')?.order, 0);
    assert.equal(cards.find((c) => c.id === 'c')?.order, 1);
    assert.equal(cards.find((c) => c.id === 'a')?.order, 2);
  });

  test('moveCardToCategory rejects orphan and ungrouped sentinels', () => {
    const cards = [makeCard('a', 'prod', 0)];
    assert.equal(moveCardToCategory(categories, cards, 'a', ORPHAN_CATEGORY_ID), false);
    assert.equal(moveCardToCategory(categories, cards, 'a', GAP_CATEGORY_ID), false);
    assert.equal(moveCardToCategory(categories, cards, 'a', UNGROUPED_SELECT_ID), false);
  });

  test('moveCardToCategory does not move system cards', () => {
    const cards = [makeCard('docs', 'prod', 0, 'Documentación', { url: '/docs' })];
    assert.equal(moveCardToCategory(categories, cards, 'docs', 'infra'), false);
    assert.equal(cards[0].category, 'prod');
  });

  test('moveCardToUngrouped creates a ghost after the current group', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeCategory('infra', 'Infraestructura'),
    ];
    const cards = [makeCard('a', 'prod', 0), makeCard('b', 'infra', 1)];
    assert.equal(moveCardToUngrouped(cats, cards, 'a'), true);
    const card = cards.find((c) => c.id === 'a');
    const ghost = cats.find((c) => c.id === card?.category);
    assert.equal(ghost?.isGhost, true);
    assert.equal(cats[1].id, ghost?.id);
    assert.equal(cats[2].id, 'infra');
  });

  test('renumberOrdersByCategories normalizes global order', () => {
    const cards = [
      makeCard('a', 'infra', 5),
      makeCard('b', 'prod', 0),
      makeCard('c', 'prod', 10),
    ];
    renumberOrdersByCategories(categories, cards);
    assert.deepEqual(
      cards.sort((a, b) => a.order - b.order).map((c) => c.id),
      ['b', 'c', 'a'],
    );
  });

  test('renumberOrdersByCategories does not change system card order', () => {
    const cards = [
      makeCard('docs', 'prod', 7, 'Documentación', { url: '/docs' }),
      makeCard('a', 'prod', 0),
      makeCard('b', 'infra', 2),
    ];
    renumberOrdersByCategories(categories, cards);
    assert.equal(cards.find((c) => c.id === 'docs')?.order, 7);
    assert.notEqual(cards.find((c) => c.id === 'a')?.order, 7);
    assert.notEqual(cards.find((c) => c.id === 'b')?.order, 7);
  });

  test('syncOrderFromDom resolves by data-id not filtered indices', () => {
    const dom = new JSDOM(`
      <div id="root">
        <div data-category="prod">
          <div class="card-item" data-id="b"></div>
          <div class="card-item" data-id="a"></div>
        </div>
        <div data-category="infra">
          <div class="card-item" data-id="c"></div>
        </div>
      </div>
    `);

    const cards = [
      makeCard('a', 'prod', 0),
      makeCard('b', 'prod', 1),
      makeCard('c', 'infra', 2),
    ];

    syncOrderFromDom(categories, cards, dom.window.document.getElementById('root')!);

    assert.equal(cards.find((c) => c.id === 'b')?.order, 0);
    assert.equal(cards.find((c) => c.id === 'a')?.order, 1);
    assert.equal(cards.find((c) => c.id === 'c')?.order, 2);
    assert.equal(cards.find((c) => c.id === 'a')?.category, 'prod');
  });

  test('syncOrderFromDom creates a ghost from a gap drop-zone', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeCategory('infra', 'Infraestructura'),
    ];
    const cards = [makeCard('a', 'prod', 0), makeCard('b', 'infra', 1)];
    const dom = new JSDOM(`
      <div id="root">
        <div data-category="${GAP_CATEGORY_ID}">
          <div class="cards-drop-filler"></div>
          <div class="card-item" data-id="a"></div>
        </div>
        <div data-category="prod">
          <div class="cards-drop-filler"></div>
        </div>
        <div data-category="infra">
          <div class="cards-drop-filler"></div>
          <div class="card-item" data-id="b"></div>
        </div>
      </div>
    `);

    syncOrderFromDom(cats, cards, dom.window.document.getElementById('root')!);

    const ghost = cats.find((c) => c.isGhost);
    assert.ok(ghost);
    assert.equal(cats[0].id, ghost.id);
    assert.equal(cards.find((c) => c.id === 'a')?.category, ghost.id);
    assert.equal(cards.find((c) => c.id === 'b')?.category, 'infra');
  });

  test('syncOrderFromDom ignores empty gaps that only have a drop filler', () => {
    const cats = [makeCategory('prod', 'Productividad')];
    const cards = [makeCard('a', 'prod', 0)];
    const dom = new JSDOM(`
      <div id="root">
        <div data-category="${GAP_CATEGORY_ID}">
          <div class="cards-drop-filler"></div>
        </div>
        <div data-category="prod">
          <div class="card-item" data-id="a"></div>
        </div>
      </div>
    `);

    syncOrderFromDom(cats, cards, dom.window.document.getElementById('root')!);

    assert.equal(cats.length, 1);
    assert.equal(cats[0].id, 'prod');
    assert.equal(cards[0].category, 'prod');
  });

  test('syncOrderFromDom does not change system card category or order', () => {
    const cats = [...categories];
    const cards = [
      makeCard('docs', 'prod', 3, 'Documentación', { url: '/docs' }),
      makeCard('a', 'prod', 0),
    ];
    const dom = new JSDOM(`
      <div id="root">
        <div data-category="infra">
          <div class="card-item" data-id="docs"></div>
          <div class="card-item" data-id="a"></div>
        </div>
      </div>
    `);
    syncOrderFromDom(cats, cards, dom.window.document.getElementById('root')!);
    const docs = cards.find((c) => c.id === 'docs')!;
    assert.equal(docs.category, 'prod');
    assert.equal(docs.order, 3);
  });

  test('pruneEmptyGhosts removes unused ghosts only', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeGhost('ghost-empty'),
      makeGhost('ghost-used'),
    ];
    const cards = [makeCard('a', 'ghost-used', 0)];
    pruneEmptyGhosts(cats, cards);
    assert.equal(cats.some((c) => c.id === 'ghost-empty'), false);
    assert.equal(cats.some((c) => c.id === 'ghost-used'), true);
  });

  test('mergeAdjacentGhosts moves cards onto the first ghost', () => {
    const cats = [
      makeGhost('ghost-a'),
      makeGhost('ghost-b'),
      makeCategory('prod', 'Productividad'),
    ];
    const cards = [makeCard('x', 'ghost-b', 0)];
    mergeAdjacentGhosts(cats, cards);
    assert.equal(cats.filter((c) => c.isGhost).length, 1);
    assert.equal(cards[0].category, 'ghost-a');
  });

  test('reorderRealCategories keeps trailing ghosts attached', () => {
    const cats = [
      makeCategory('prod', 'Productividad'),
      makeGhost('ghost-after-prod'),
      makeCategory('infra', 'Infraestructura'),
    ];
    reorderRealCategories(cats, 0, 1);
    assert.deepEqual(cats.map((c) => c.id), ['infra', 'prod', 'ghost-after-prod']);
  });

  test('realCategories hides ghosts', () => {
    const cats = [makeCategory('prod', 'Productividad'), makeGhost('ghost-x')];
    assert.equal(realCategories(cats).length, 1);
    assert.equal(realCategories(cats)[0].id, 'prod');
  });

  test('createGhostCategory id is kebab-case', () => {
    const ghost = createGhostCategory();
    assert.match(ghost.id, /^[a-z0-9-]+$/);
    assert.equal(ghost.isGhost, true);
    assert.ok(ghost.id.length <= 40);
  });
});

describe('Card.astro kind', () => {
  test('renders note vs link via card.kind', async () => {
    const src = await readFile(new URL('../src/components/Card.astro', import.meta.url), 'utf8');
    assert.match(src, /card\.kind === 'note'/);
    assert.match(src, /data-card-kind="note"/);
    assert.match(src, /data-card-kind="link"/);
    assert.match(src, /noteBadge/);
  });
});

describe('dashboard card Sortable', () => {
  test('uses card-item draggable, drop filler, frozen layout, and reconcile lifecycle', async () => {
    // El guard se instala dentro del loader diferido de Sortable, no en el
    // dashboard: así el panel no arrastra los ~45 kB en el chunk inicial.
    const loader = await readFile(new URL('../src/scripts/admin/sortable-loader.ts', import.meta.url), 'utf8');
    assert.match(loader, /installSortableGuard\(Sortable\)/);
    assert.match(loader, /import\('sortablejs'\)/);
    const dashboard = await readFile(new URL('../src/pages/admin/dashboard.astro', import.meta.url), 'utf8');
    assert.doesNotMatch(dashboard, /import Sortable from 'sortablejs'/);
    // El drag&drop de cards vive en el fragmento Alpine del dominio cards.
    const src = await readFile(new URL('../src/scripts/admin/cards.ts', import.meta.url), 'utf8');
    assert.match(src, /draggable:\s*['"]\.card-item['"]/);
    assert.doesNotMatch(src, /forceFallback|fallbackOnBody/);
    assert.match(src, /emptyInsertThreshold:\s*0/);
    assert.match(src, /cards-drop-filler/);
    assert.match(src, /_cardsDragLayout/);
    assert.match(src, /_cardsDragging/);
    assert.match(src, /reconcileCardSortables/);
    assert.match(src, /Sortable\.get\(groupEl\)/);
    assert.match(src, /requestAnimationFrame/);
    assert.match(src, /pruneCardSortables/);
  });
});

describe('system-card', () => {
  test('isSystemCard matches id docs and /docs urls', () => {
    assert.equal(isSystemCard({ id: 'docs', url: 'https://example.com' }), true);
    assert.equal(isSystemCard({ id: 'other', url: '/docs' }), true);
    assert.equal(isSystemCard({ id: 'other', url: '/docs/install' }), true);
    assert.equal(isSystemCard({ id: 'other', url: 'https://example.com' }), false);
  });

  test('restoreSystemCardProtectedFields keeps enabled', () => {
    const incoming = { id: 'docs', title: 'Hacked', order: 99, enabled: false, category: 'x' };
    const original = { id: 'docs', title: 'Documentación', order: 0, enabled: true, category: 'dev' };
    restoreSystemCardProtectedFields(incoming, original);
    assert.equal(incoming.title, 'Documentación');
    assert.equal(incoming.order, 0);
    assert.equal(incoming.category, 'dev');
    assert.equal(incoming.enabled, false);
  });

  test('reconcileSystemCards reinserts missing docs and reverts protected fields', () => {
    const docs = makeCard('docs', 'dev', 0, 'Documentación', { url: '/docs' });
    const incoming = [
      makeCard('docs', 'hacked', 99, 'Nope', { url: '/docs' }),
      makeCard('a', 'prod', 1),
    ];
    incoming[0].enabled = false;
    const result = reconcileSystemCards(incoming, [docs], docs);
    const sys = result.find((c) => c.id === 'docs')!;
    assert.equal(sys.category, 'dev');
    assert.equal(sys.order, 0);
    assert.equal(sys.title, 'Documentación');
    assert.equal(sys.enabled, false);
  });
});

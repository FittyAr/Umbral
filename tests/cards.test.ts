import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CardSchema, CategorySchema } from '../src/lib/schema.ts';
import {
  cardGroups,
  moveCardToCategory,
  syncOrderFromDom,
  renumberOrdersByCategories,
  ORPHAN_CATEGORY_ID,
} from '../src/lib/cards-admin.ts';
import { JSDOM } from 'jsdom';

function makeCategory(id: string, name: string) {
  return CategorySchema.parse({ id, name });
}

function makeCard(id: string, category: string, order: number, title = id) {
  return CardSchema.parse({
    id,
    title,
    category,
    order,
    url: 'https://example.com',
  });
}

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

  test('cardGroups applies text filter', () => {
    const cards = [makeCard('a', 'prod', 0, 'Alpha'), makeCard('b', 'prod', 1, 'Beta')];
    const groups = cardGroups(categories, cards, 'beta');
    assert.equal(groups[0].cards.length, 1);
    assert.equal(groups[0].cards[0].id, 'b');
  });

  test('moveCardToCategory reassigns category and appends at end by default', () => {
    const cards = [makeCard('a', 'prod', 0), makeCard('b', 'prod', 1), makeCard('c', 'infra', 2)];
    moveCardToCategory(categories, cards, 'a', 'infra');
    assert.equal(cards.find((c) => c.id === 'a')?.category, 'infra');
    assert.equal(cards.find((c) => c.id === 'b')?.order, 0);
    assert.equal(cards.find((c) => c.id === 'c')?.order, 1);
    assert.equal(cards.find((c) => c.id === 'a')?.order, 2);
  });

  test('moveCardToCategory rejects orphan target', () => {
    const cards = [makeCard('a', 'prod', 0)];
    assert.equal(moveCardToCategory(categories, cards, 'a', ORPHAN_CATEGORY_ID), false);
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
});

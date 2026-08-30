/**
 * Dominio de la administracion de tarjetas: agrupado, categorias fantasma,
 * movimientos y renumeracion. Todo puro, sin DOM.
 *
 * Importa esto (y no el barrel) desde el servidor: el barrel arrastra el
 * modulo que lee el DOM, que en el grafo del servidor no tiene sentido.
 */
import type { Card, Category } from '../schema';
import { isSystemCard } from '../system-card.ts';
import { newId } from '../ids.ts';

export const ORPHAN_CATEGORY_ID = '__orphan__';
/** Drop-zone DOM-only entre grupos. Nunca se persiste como Category. */
export const GAP_CATEGORY_ID = '__gap__';
/** Valor del <select> "Sin grupo". Se resuelve a un ghost al aplicar. */
export const UNGROUPED_SELECT_ID = '__ungrouped__';
export const GHOST_ID_PREFIX = 'ghost-';

export interface CardGroup {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  isOrphan: boolean;
  isGhost: boolean;
  cards: Card[];
}

export type AdminCardsLayoutItem =
  | { type: 'gap'; key: string; insertAt: number }
  | { type: 'group'; key: string; group: CardGroup };

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });
}

function matchesFilter(card: Card, filter: string): boolean {
  const q = filter.toLowerCase().trim();
  if (!q) return true;
  return (
    (card.title || '').toLowerCase().includes(q) ||
    (card.description || '').toLowerCase().includes(q) ||
    (card.url || '').toLowerCase().includes(q)
  );
}

export function isGhostCategory(cat: Pick<Category, 'isGhost'> | null | undefined): boolean {
  return Boolean(cat?.isGhost);
}

export function realCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.isGhost);
}

export function getKnownCategoryIds(categories: Category[]): Set<string> {
  return new Set(categories.map((c) => c.id));
}

export function createGhostCategory(): Category {
  // El prefijo de ghost termina en guión y newId ya agrega el suyo.
  const id = newId(GHOST_ID_PREFIX.replace(/-$/, ''));
  return {
    id,
    name: '',
    icon: '',
    isLocked: false,
    password: '',
    isSubpage: false,
    isGhost: true,
  };
}

export function pruneEmptyGhosts(categories: Category[], cards: Card[]): void {
  const used = new Set(cards.map((c) => c.category));
  for (let i = categories.length - 1; i >= 0; i--) {
    const cat = categories[i];
    if (cat.isGhost && !used.has(cat.id)) {
      categories.splice(i, 1);
    }
  }
}

/** Dos ghosts consecutivos se fusionan (cards del segundo pasan al primero). */
export function mergeAdjacentGhosts(categories: Category[], cards: Card[]): void {
  for (let i = 0; i < categories.length - 1; ) {
    const a = categories[i];
    const b = categories[i + 1];
    if (a.isGhost && b.isGhost) {
      for (const card of cards) {
        if (card.category === b.id && !isSystemCard(card)) {
          card.category = a.id;
        }
      }
      categories.splice(i + 1, 1);
      continue;
    }
    i++;
  }
}

export function normalizeGhostCategories(categories: Category[], cards: Card[]): void {
  pruneEmptyGhosts(categories, cards);
  mergeAdjacentGhosts(categories, cards);
}

/**
 * Reordena sólo categorías reales (tab Categorías oculta ghosts).
 * Cada real conserva los ghosts que tenía inmediatamente después;
 * los ghosts del inicio se quedan al frente.
 */
export function reorderRealCategories(categories: Category[], from: number, to: number): void {
  const leading: Category[] = [];
  const blocks: { real: Category; trailing: Category[] }[] = [];
  let i = 0;
  while (i < categories.length && categories[i].isGhost) {
    leading.push(categories[i]);
    i++;
  }
  while (i < categories.length) {
    const real = categories[i];
    i++;
    const trailing: Category[] = [];
    while (i < categories.length && categories[i].isGhost) {
      trailing.push(categories[i]);
      i++;
    }
    if (!real.isGhost) {
      blocks.push({ real, trailing });
    }
  }
  if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length || from === to) {
    return;
  }
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  const next = [
    ...leading,
    ...blocks.flatMap((b) => [b.real, ...b.trailing]),
  ];
  categories.splice(0, categories.length, ...next);
}

export function assignOrderSkippingProtected(cardsInSequence: Card[]): void {
  const protectedOrders = new Set(
    cardsInSequence.filter((c) => isSystemCard(c)).map((c) => c.order),
  );
  let order = 0;
  for (const card of cardsInSequence) {
    if (isSystemCard(card)) continue;
    while (protectedOrders.has(order)) order++;
    card.order = order++;
  }
}

function collectInCategoryOrder(categories: Category[], cards: Card[]): Card[] {
  const knownIds = categories.map((c) => c.id);
  const sequence: Card[] = [];
  for (const catId of knownIds) {
    sequence.push(...sortCards(cards.filter((c) => c.category === catId)));
  }
  sequence.push(...sortCards(cards.filter((c) => !knownIds.includes(c.category))));
  return sequence;
}

/** Group cards by category for the admin cards tab. */
export function cardGroups(
  categories: Category[],
  cards: Card[],
  filter = '',
  orphanLabel = 'Sin categoría',
  ungroupedLabel = 'Sin grupo',
): CardGroup[] {
  const knownIds = getKnownCategoryIds(categories);
  const filtered = sortCards(cards).filter((c) => matchesFilter(c, filter));
  const byCategory = new Map<string, Card[]>();

  for (const card of filtered) {
    const key = knownIds.has(card.category) ? card.category : ORPHAN_CATEGORY_ID;
    const bucket = byCategory.get(key) ?? [];
    bucket.push(card);
    byCategory.set(key, bucket);
  }

  const groups: CardGroup[] = categories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.isGhost ? ungroupedLabel : cat.name,
    categoryIcon: cat.icon,
    isOrphan: false,
    isGhost: Boolean(cat.isGhost),
    cards: byCategory.get(cat.id) ?? [],
  }));

  const orphans = byCategory.get(ORPHAN_CATEGORY_ID);
  if (orphans?.length) {
    groups.push({
      categoryId: ORPHAN_CATEGORY_ID,
      categoryName: orphanLabel,
      categoryIcon: 'alert-circle',
      isOrphan: true,
      isGhost: false,
      cards: orphans,
    });
  }

  return groups;
}

/** Gaps (drop-zones) entre grupos reales y al inicio/fin; ghosts ocupan el hueco. */
export function adminCardsLayout(
  categories: Category[],
  cards: Card[],
  filter = '',
  orphanLabel = 'Sin categoría',
  ungroupedLabel = 'Sin grupo',
): AdminCardsLayoutItem[] {
  const groups = cardGroups(categories, cards, filter, orphanLabel, ungroupedLabel);
  const items: AdminCardsLayoutItem[] = [];
  const main = groups.filter((g) => !g.isOrphan);

  for (let i = 0; i < main.length; i++) {
    const g = main[i];
    const prev = main[i - 1];
    const needGapBefore = !g.isGhost && (!prev || !prev.isGhost);
    if (needGapBefore) {
      const insertAt = categories.findIndex((c) => c.id === g.categoryId);
      items.push({
        type: 'gap',
        key: `gap-${insertAt}-${i}`,
        insertAt: insertAt < 0 ? i : insertAt,
      });
    }
    items.push({ type: 'group', key: `group-${g.categoryId}`, group: g });
  }

  if (!main.length || !main[main.length - 1].isGhost) {
    items.push({
      type: 'gap',
      key: `gap-end-${categories.length}`,
      insertAt: categories.length,
    });
  }

  const orphan = groups.find((g) => g.isOrphan);
  if (orphan) {
    items.push({ type: 'group', key: `group-${orphan.categoryId}`, group: orphan });
  }

  return items;
}

/** Renumber global `order` following category array order, then card order within each group. */
export function renumberOrdersByCategories(categories: Category[], cards: Card[]): void {
  assignOrderSkippingProtected(collectInCategoryOrder(categories, cards));
}

export function moveCardToCategory(
  categories: Category[],
  cards: Card[],
  cardId: string,
  categoryId: string,
  index?: number,
): boolean {
  if (
    categoryId === ORPHAN_CATEGORY_ID ||
    categoryId === GAP_CATEGORY_ID ||
    categoryId === UNGROUPED_SELECT_ID
  ) {
    return false;
  }

  const card = cards.find((c) => c.id === cardId);
  if (!card || isSystemCard(card)) return false;
  if (!categories.some((c) => c.id === categoryId)) return false;

  card.category = categoryId;
  const knownIds = categories.map((c) => c.id);
  const sequence: Card[] = [];

  for (const catId of knownIds) {
    let bucket = sortCards(cards.filter((c) => c.category === catId));
    if (catId === categoryId) {
      bucket = bucket.filter((c) => c.id !== cardId);
      const insertAt = index ?? bucket.length;
      bucket.splice(Math.max(0, Math.min(insertAt, bucket.length)), 0, card);
    }
    sequence.push(...bucket);
  }

  sequence.push(...sortCards(cards.filter((c) => !knownIds.includes(c.category))));
  assignOrderSkippingProtected(sequence);
  normalizeGhostCategories(categories, cards);
  return true;
}

/** Saca la card a un ghost: reusa el adyacente o crea uno después de su grupo actual. */
export function moveCardToUngrouped(
  categories: Category[],
  cards: Card[],
  cardId: string,
): boolean {
  const card = cards.find((c) => c.id === cardId);
  if (!card || isSystemCard(card)) return false;

  const currentCat = categories.find((c) => c.id === card.category);
  if (currentCat?.isGhost) return true;

  const currentIdx = categories.findIndex((c) => c.id === card.category);
  const after = currentIdx >= 0 ? categories[currentIdx + 1] : undefined;
  if (after?.isGhost) {
    return moveCardToCategory(categories, cards, cardId, after.id);
  }

  const ghost = createGhostCategory();
  const insertAt = currentIdx >= 0 ? currentIdx + 1 : categories.length;
  categories.splice(insertAt, 0, ghost);
  return moveCardToCategory(categories, cards, cardId, ghost.id);
}

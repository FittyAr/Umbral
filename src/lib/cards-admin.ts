import type { Card, Category } from './schema';

export const ORPHAN_CATEGORY_ID = '__orphan__';

export interface CardGroup {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  isOrphan: boolean;
  cards: Card[];
}

function sortCards(cards: Card[]): Card[] {
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

export function getKnownCategoryIds(categories: Category[]): Set<string> {
  return new Set(categories.map((c) => c.id));
}

/** Group cards by category for the admin cards tab. */
export function cardGroups(
  categories: Category[],
  cards: Card[],
  filter = '',
  orphanLabel = 'Sin categoría',
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
    categoryName: cat.name,
    categoryIcon: cat.icon,
    isOrphan: false,
    cards: byCategory.get(cat.id) ?? [],
  }));

  const orphans = byCategory.get(ORPHAN_CATEGORY_ID);
  if (orphans?.length) {
    groups.push({
      categoryId: ORPHAN_CATEGORY_ID,
      categoryName: orphanLabel,
      categoryIcon: 'alert-circle',
      isOrphan: true,
      cards: orphans,
    });
  }

  return groups;
}

/** Renumber global `order` following category array order, then card order within each group. */
export function renumberOrdersByCategories(categories: Category[], cards: Card[]): void {
  let order = 0;
  const knownIds = categories.map((c) => c.id);

  for (const catId of knownIds) {
    const inCategory = sortCards(cards.filter((c) => c.category === catId));
    for (const card of inCategory) {
      card.order = order++;
    }
  }

  const orphans = sortCards(cards.filter((c) => !knownIds.includes(c.category)));
  for (const card of orphans) {
    card.order = order++;
  }
}

export function moveCardToCategory(
  categories: Category[],
  cards: Card[],
  cardId: string,
  categoryId: string,
  index?: number,
): boolean {
  if (categoryId === ORPHAN_CATEGORY_ID) return false;

  const card = cards.find((c) => c.id === cardId);
  if (!card) return false;

  card.category = categoryId;
  const knownIds = categories.map((c) => c.id);
  let order = 0;

  for (const catId of knownIds) {
    let bucket = sortCards(cards.filter((c) => c.category === catId));
    if (catId === categoryId) {
      bucket = bucket.filter((c) => c.id !== cardId);
      const insertAt = index ?? bucket.length;
      bucket.splice(Math.max(0, Math.min(insertAt, bucket.length)), 0, card);
    }
    for (const item of bucket) {
      item.order = order++;
    }
  }

  for (const orphan of sortCards(cards.filter((c) => !knownIds.includes(c.category)))) {
    orphan.order = order++;
  }

  return true;
}

/** Read DOM order after drag-and-drop and sync category + global order. */
export function syncOrderFromDom(
  categories: Category[],
  cards: Card[],
  container: ParentNode,
): void {
  const knownIds = getKnownCategoryIds(categories);
  const groupEls = container.querySelectorAll<HTMLElement>('[data-category]');
  let order = 0;

  for (const groupEl of groupEls) {
    const categoryId = groupEl.dataset.category;
    if (!categoryId) continue;

    const items = groupEl.querySelectorAll<HTMLElement>('.card-item[data-id]');
    for (const item of items) {
      const cardId = item.dataset.id;
      if (!cardId) continue;

      const card = cards.find((c) => c.id === cardId);
      if (!card) continue;

      if (categoryId !== ORPHAN_CATEGORY_ID && knownIds.has(categoryId)) {
        card.category = categoryId;
      }

      card.order = order++;
    }
  }

  const seen = new Set(
    Array.from(groupEls).flatMap((groupEl) =>
      Array.from(groupEl.querySelectorAll<HTMLElement>('.card-item[data-id]'))
        .map((item) => item.dataset.id)
        .filter(Boolean),
    ),
  );

  for (const card of sortCards(cards)) {
    if (!seen.has(card.id)) {
      card.order = order++;
    }
  }
}

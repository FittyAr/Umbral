/**
 * Lectura del orden que quedo en el DOM despues de un drag&drop.
 *
 * Es la unica parte de la administracion de tarjetas que toca el DOM, y
 * corre solo en el cliente.
 */
import type { Card, Category } from '../schema';
import {
  GAP_CATEGORY_ID,
  ORPHAN_CATEGORY_ID,
  assignOrderSkippingProtected,
  createGhostCategory,
  getKnownCategoryIds,
  normalizeGhostCategories,
  sortCards,
} from './domain.ts';
import { isSystemCard } from '../system-card.ts';

function assignCardFromDom(
  card: Card,
  categoryId: string,
  knownIds: Set<string>,
  gapGhostId: string | undefined,
): void {
  if (isSystemCard(card)) return;
  if (categoryId === ORPHAN_CATEGORY_ID) return;
  if (categoryId === GAP_CATEGORY_ID) {
    if (gapGhostId) card.category = gapGhostId;
    return;
  }
  if (knownIds.has(categoryId)) {
    card.category = categoryId;
  }
}

/** Read DOM order after drag-and-drop and sync category + global order. */
export function syncOrderFromDom(
  categories: Category[],
  cards: Card[],
  container: ParentNode,
): void {
  const originalById = new Map(categories.map((c) => [c.id, c]));
  const knownIds = getKnownCategoryIds(categories);
  const groupEls = Array.from(container.querySelectorAll<HTMLElement>('[data-category]'));

  const nextCategories: Category[] = [];
  const seen = new Set<string>();
  const gapGhostByEl = new Map<HTMLElement, string>();

  for (const groupEl of groupEls) {
    const categoryId = groupEl.dataset.category;
    if (!categoryId || categoryId === ORPHAN_CATEGORY_ID) continue;

    const itemCount = groupEl.querySelectorAll('.card-item[data-id]').length;

    if (categoryId === GAP_CATEGORY_ID) {
      if (itemCount === 0) continue;
      const ghost = createGhostCategory();
      nextCategories.push(ghost);
      gapGhostByEl.set(groupEl, ghost.id);
      continue;
    }

    const cat = originalById.get(categoryId);
    if (!cat || seen.has(categoryId)) continue;
    if (cat.isGhost && itemCount === 0) continue;
    seen.add(categoryId);
    nextCategories.push(cat);
  }

  for (const cat of categories) {
    if (!cat.isGhost && !seen.has(cat.id)) {
      nextCategories.push(cat);
    }
  }

  categories.splice(0, categories.length, ...nextCategories);
  const nextKnown = getKnownCategoryIds(categories);

  const sequence: Card[] = [];
  const seenCardIds = new Set<string>();

  for (const groupEl of groupEls) {
    const categoryId = groupEl.dataset.category;
    if (!categoryId) continue;
    const gapGhostId = gapGhostByEl.get(groupEl);

    const items = groupEl.querySelectorAll<HTMLElement>('.card-item[data-id]');
    for (const item of items) {
      const cardId = item.dataset.id;
      if (!cardId) continue;
      const card = cards.find((c) => c.id === cardId);
      if (!card) continue;
      assignCardFromDom(card, categoryId, nextKnown, gapGhostId);
      sequence.push(card);
      seenCardIds.add(card.id);
    }
  }

  for (const card of sortCards(cards)) {
    if (!seenCardIds.has(card.id)) sequence.push(card);
  }

  assignOrderSkippingProtected(sequence);
  normalizeGhostCategories(categories, cards);
}

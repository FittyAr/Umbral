import type { AdminFragment } from "../types";
import type { Card, Category } from "~/lib/schema";
import { cardGroups as buildCardGroups, adminCardsLayout as buildAdminCardsLayout, moveCardToCategory, moveCardToUngrouped, realCategories as filterRealCategories, ORPHAN_CATEGORY_ID, GAP_CATEGORY_ID, UNGROUPED_SELECT_ID } from "~/lib/cards-admin";
import { newId } from '~/lib/ids';
import { confirmAction } from '../confirm.ts';

/**
 * Listado del panel de cards: filtro de búsqueda, agrupado por categoría,
 * grupos colapsables, mover cards entre categorías y alta/baja de
 * categorías.
 */
export function createCardGroupsState(): AdminFragment {
  return {
    collapsedCardGroups: {},
    ungroupedSelectId: UNGROUPED_SELECT_ID,
    ungroupedGapId: GAP_CATEGORY_ID,
    cardFilter: '',

    cardGroups() {
      if (!this.cfg) return [];
      return buildCardGroups(
        this.cfg.categories,
        this.cfg.cards,
        this.cardFilter,
        this.cardsOrphanGroupLabel(),
        this.cardsUngroupedGroupLabel(),
      );
    },

    adminCardsLayout() {
      if (!this.cfg) return [];
      if (this._cardsDragLayout) return this._cardsDragLayout;
      return buildAdminCardsLayout(
        this.cfg.categories,
        this.cfg.cards,
        this.cardFilter,
        this.cardsOrphanGroupLabel(),
        this.cardsUngroupedGroupLabel(),
      );
    },

    realCategories() {
      if (!this.cfg) return [];
      return filterRealCategories(this.cfg.categories);
    },

    categorySelectValue(card: Card | null | undefined) {
      if (!card) return '';
      const cat = this.cfg.categories.find((c: Category) => c.id === card.category);
      if (!cat || cat.isGhost) return UNGROUPED_SELECT_ID;
      return card.category;
    },

    toggleCardGroup(categoryId: string) {
      this.collapsedCardGroups[categoryId] = !this.isCardGroupCollapsed(categoryId);
      if (this.tab === 'cards') {
        this.$nextTick(() => this.initCardSortables());
      }
    },

    isCardGroupCollapsed(categoryId: string) {
      return Boolean(this.collapsedCardGroups[categoryId]);
    },

    changeCardCategory(cardId: string, categoryId: string) {
      if (!categoryId || categoryId === ORPHAN_CATEGORY_ID || categoryId === GAP_CATEGORY_ID) return;
      const card = this.cfg.cards.find((c: Card) => c.id === cardId);
      if (!card || this.isSystemCard(card)) return;
      if (categoryId === UNGROUPED_SELECT_ID) {
        moveCardToUngrouped(this.cfg.categories, this.cfg.cards, cardId);
      } else {
        moveCardToCategory(this.cfg.categories, this.cfg.cards, cardId, categoryId);
      }
      this.markDirty();
      this.$nextTick(() => this.initCardSortables());
    },

    filteredCards() {
      if (!this.cfg) return [];
      const q = this.cardFilter.toLowerCase().trim();
      const sorted = [...this.cfg.cards].sort((a,b) => a.order - b.order);
      if (!q) return sorted;
      return sorted.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.url || '').toLowerCase().includes(q)
      );
    },

    addCategory() {
      this.cfg.categories.push({ id: newId('cat'), name: 'Nueva', icon: 'folder', isLocked: false, password: '', isSubpage: false, isGhost: false });
      this.markDirty();
    },
    removeCategoryById(id: string) {
      const reals = this.realCategories();
      if (reals.length <= 1) {
        window.umbralAdmin.toast(this.l('msgCategoriesLastOne'), 'error');
        return;
      }
      if (this.cfg.cards.some((c: Card) => c.category === id && this.isSystemCard(c))) {
        window.umbralAdmin.toast(this.l('msgCategoriesHasSystemCard'), 'error');
        return;
      }
      if (!confirmAction(this.l('msgCategoriesConfirmDelete'))) return;
      const idx = this.cfg.categories.findIndex((c: Category) => c.id === id);
      if (idx < 0) return;
      this.cfg.categories.splice(idx, 1);
      const fallback = this.realCategories()[0]?.id || '';
      this.cfg.cards.forEach((c: Card) => {
        if (c.category === id && !this.isSystemCard(c)) c.category = fallback;
      });
      this.markDirty();
    },
  };
}

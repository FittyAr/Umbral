import type { AdminFragment } from "../types";
import type Sortable from "sortablejs";
import { adminCardsLayout as buildAdminCardsLayout, syncOrderFromDom, reorderRealCategories } from "~/lib/cards-admin";
import { loadSortable, getSortable } from '../sortable-loader.ts';

/**
 * Drag & drop del panel de cards y del de categorías (SortableJS, cargado
 * de forma diferida). Mientras se arrastra, el layout queda congelado en
 * `_cardsDragLayout` para que Alpine no re-renderice bajo el cursor.
 */
export function createCardSortableState(): AdminFragment {
  return {
    _cardSortables: [],
    _cardsDragging: false,
    _cardsDragLayout: null,

    cardSortableOptions(container: HTMLElement) {
      return {
        group: { name: 'cards', pull: true, put: true },
        draggable: '.card-item',
        handle: '.drag-handle:not(.drag-disabled)',
        animation: 150,
        filter: '.card-system, .cards-drop-filler',
        preventOnFilter: false,
        emptyInsertThreshold: 0,
        ghostClass: 'card-sortable-ghost',
        onStart: () => {
          this._cardsDragging = true;
          this._cardsDragLayout = buildAdminCardsLayout(
            this.cfg.categories,
            this.cfg.cards,
            this.cardFilter,
            this.cardsOrphanGroupLabel(),
            this.cardsUngroupedGroupLabel(),
          );
        },
        onEnd: () => {
          syncOrderFromDom(this.cfg.categories, this.cfg.cards, container);
          this._cardsDragLayout = null;
          this._cardsDragging = false;
          this.markDirty();
          requestAnimationFrame(() => {
            this.$nextTick(() => this.reconcileCardSortables());
          });
        },
      };
    },

    async initSortable() {
      const Sortable = await loadSortable();
      const catsEl = document.getElementById('categories-sortable');
      if (catsEl && !Sortable.get(catsEl)) {
        Sortable.create(catsEl, {
          handle: '.drag-handle',
          animation: 150,
          onEnd: (evt) => {
            reorderRealCategories(this.cfg.categories, evt.oldIndex!, evt.newIndex!);
            this.markDirty();
          },
        });
      }
      this.reconcileCardSortables();
    },

    pruneCardSortables() {
      this._cardSortables = this._cardSortables.filter((s: Sortable) => {
        if (s.el && document.contains(s.el)) return true;
        try { s.destroy(); } catch { /* el may already be gone */ }
        return false;
      });
    },

    destroyAllCardSortables() {
      this._cardSortables.forEach((s: Sortable) => {
        try { s.destroy(); } catch { /* el may already be gone */ }
      });
      this._cardSortables = [];
    },

    reconcileCardSortables() {
      if (this._cardsDragging) return;

      // Camino sincrónico: si Sortable todavía no llegó, disparamos la carga y
      // volvemos a entrar. Los `$nextTick` que llaman acá no pueden esperar.
      const Sortable = getSortable();
      if (!Sortable) {
        loadSortable().then(() => this.reconcileCardSortables());
        return;
      }

      if (this.cardFilter.trim()) {
        this.destroyAllCardSortables();
        return;
      }

      const container = document.getElementById('cards-groups-container');
      if (!container) return;

      this.pruneCardSortables();

      const groups = container.querySelectorAll<HTMLElement>('.cards-group-list[data-category]');
      groups.forEach((groupEl) => {
        const wrap = groupEl.parentElement;
        if (wrap && window.getComputedStyle(wrap).display === 'none') return;

        const existing = Sortable.get(groupEl);
        if (existing) {
          if (!this._cardSortables.includes(existing)) {
            this._cardSortables.push(existing);
          }
          return;
        }

        const sortable = Sortable.create(groupEl, this.cardSortableOptions(container));
        this._cardSortables.push(sortable);
      });
    },

    initCardSortables() {
      this.reconcileCardSortables();
    },
  };
}

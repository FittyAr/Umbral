import { errMsg, type AdminFragment } from "../types";
import type { Card, Category } from "~/lib/schema";
import { createGhostCategory, ORPHAN_CATEGORY_ID, UNGROUPED_SELECT_ID } from "~/lib/cards-admin";
import { isSystemCard as checkSystemCard } from "~/lib/system-card";
import { clampCardSpan, MAX_CARD_SPAN } from "~/lib/card-span";
import { newId } from '~/lib/ids';
import { confirmAction } from '../confirm.ts';
import { isFeatureListed } from './shared.ts';

/**
 * Ciclo de vida de una card en el modal de edición: alta, edición, guardado,
 * cancelación con confirmación si hay cambios, borrado y protección de las
 * cards de sistema. También el selector de ancho (span).
 */
export function createCardEditorState(): AdminFragment {
  return {
    editingCard: null,
    editingIndex: -1,
    // i18n methods (Alpine 3: se llaman con `()` en el HTML)
    editingKey: 0,
    cardFormDirty: false,
    // Pinned (opt-in: features.pinned). El server fuerza pinned=false
    // si la feature está apagada.
    pinnedEnabled: isFeatureListed('pinned'),

    /** Elige el ícono de la card en edición (desde el picker). */
    setEditingIcon(icon: string) {
      this.editingCard.icon = icon;
      this.markDirty();
    },

    async prepareCardEditor() {
      this.resetIconPicker();
      await Promise.all([
        this.refreshIconCatalog(),
        this.assets.length === 0 ? this.refreshAssets() : Promise.resolve(),
      ]);
    },

    // Ancho de tarjeta en columnas. El select ofrece siempre el rango
    // completo del schema; el recorte a las columnas reales lo hace el
    // render (lib/card-span.ts) y el hint lo anticipa acá.
    cardSpanOptions() { return Array.from({ length: MAX_CARD_SPAN }, (_, i) => i + 1); },
    cardSpanOptionLabel(n: number) {
      if (n === 1) return this.l('cardSpanSingle');
      const tpl = this.l('cardSpanMultiple');
      return tpl.replace('{n}', String(n));
    },
    cardSpanEffectiveHint() {
      const cols = Number(this.cfg?.layout?.columnsDesktop) || 1;
      const effective = clampCardSpan(Number(this.editingCard?.span) || 1, cols);
      const tpl = this.l('cardSpanHint');
      return tpl.split('{cols}').join(String(cols)).split('{n}').join(String(effective));
    },
    cardSpanBadgeLabel(card: Card | null | undefined) {
      const span = Number(card?.span) || 1;
      return span > 1 ? this.cardSpanOptionLabel(span) : '';
    },

    addCardToCategory(categoryId: string) {
      if (categoryId === ORPHAN_CATEGORY_ID) return;
      this.addCard(categoryId);
    },

    editCardById(cardId: string) {
      const idx = this.filteredCards().findIndex((c: Card) => c.id === cardId);
      if (idx >= 0) this.editCard(idx);
    },

    removeCardById(cardId: string) {
      const idx = this.filteredCards().findIndex((c: Card) => c.id === cardId);
      if (idx >= 0) this.removeCard(idx);
    },

    addCard(categoryId?: string) {
      const reals = this.realCategories();
      if (!reals.length && categoryId !== UNGROUPED_SELECT_ID && !this.cfg.categories.some((c: Category) => c.id === categoryId)) {
        window.umbralAdmin.toast(this.l('msgCardsNeedCategory'), 'error');
        this.tab = 'categories';
        return;
      }
      let initialCategory = categoryId;
      if (!initialCategory || initialCategory === ORPHAN_CATEGORY_ID) {
        initialCategory = reals[0]?.id || UNGROUPED_SELECT_ID;
      }
      this.editingIndex = -1;
      this.editingKey = (this.editingKey || 0) + 1;
      this.editingCard = {
        id: newId('card'),
        title: this.l('cardsNewLabel'),
        kind: 'link',
        description: '',
        descriptionFormat: 'plain',
        url: 'https://',
        icon: this.availableIcons[0] || '',
        category: initialCategory,
        openInNewTab: true,
        color: this.cfg.theme.accentColor,
        order: this.cfg.cards.length,
        span: 1,
        enabled: true,
        healthCheck: false,
        tags: this.tagsEnabled ? [] : undefined,
      };
      this.prepareCardEditor();
    },
    async editCard(idx: number) {
      const cardId = this.filteredCards()[idx]?.id;
      if (cardId) {
        const target = this.cfg.cards.find((c: Card) => c.id === cardId);
        if (target && this.isSystemCard(target)) {
          window.umbralAdmin.toast(this.l('msgCardsSystemNoEdit'), 'error');
          return;
        }
      }
      if (!cardId) {
        window.umbralAdmin.toast(this.l('msgCardsNotFound'), 'error');
        return;
      }
      const realIdx = this.cfg.cards.findIndex((c: Card) => c.id === cardId);
      if (realIdx < 0) {
        window.umbralAdmin.toast(this.l('msgCardsNotFoundInConfig'), 'error');
        return;
      }
      try {
        // Re-validar contra el schema. Si la card en memoria tiene
        // campos faltantes (cards viejas sin kind/healthCheck), zod
        // los rellena con los defaults.
        const { CardSchema } = await import('~/lib/schema');
        const parsed = CardSchema.safeParse(this.cfg.cards[realIdx]);
        if (!parsed.success) {
          window.umbralAdmin.toast(this.l('msgCardsCorrupt', { message: parsed.error.issues.map(i => i.message).join('; ') }), 'error');
          return;
        }
        this.editingIndex = realIdx;
        // Spread shallow + parsed (que ya tiene defaults aplicados).
        // structuredClone o JSON.parse(JSON.stringify) sobre un proxy
        // de Alpine 3 puede perder tipos o referencias. Spread es
        // suficiente porque CardSchema es flat (sin objetos anidados).
        this.editingCard = { ...parsed.data };
        const currentCat = this.cfg.categories.find((c: Category) => c.id === this.editingCard.category);
        if (currentCat?.isGhost) this.editingCard.category = UNGROUPED_SELECT_ID;
        this.cardFormDirty = false;
        // Incrementar el key fuerza re-mount del form, eliminando
        // cualquier binding stale de la edición anterior.
        this.editingKey = (this.editingKey || 0) + 1;
        await this.prepareCardEditor();
        this.$nextTick(() => {
          const modal = document.querySelector('.modal--wide');
          if (modal) modal.scrollTop = 0;
        });
      } catch (err: unknown) {
        console.error('[umbral] editCard failed:', err);
        window.umbralAdmin.toast(this.l('msgCardsOpenError', { message: errMsg(err) }), 'error');
      }
    },
    saveCard() {
      if (!this.editingCard) return;
      const card = { ...this.editingCard };
      if (card.category === UNGROUPED_SELECT_ID) {
        const original = this.editingIndex >= 0 ? this.cfg.cards[this.editingIndex] : null;
        const origCat = original
          ? this.cfg.categories.find((c: Category) => c.id === original.category)
          : null;
        if (origCat?.isGhost) {
          card.category = origCat.id;
        } else {
          const ghost = createGhostCategory();
          this.cfg.categories.push(ghost);
          card.category = ghost.id;
        }
      }
      if (this.editingIndex < 0) {
        this.cfg.cards.push(card);
      } else {
        this.cfg.cards[this.editingIndex] = card;
      }
      this.cancelEdit();
      this.markDirty();
      this.$nextTick(() => this.initCardSortables());
    },
    cancelEdit() { this.editingCard = null; this.editingIndex = -1; this.cardFormDirty = false; },
    // Cierra el modal con confirmación si hay cambios sin guardar. Se usa
    // para ESC, click fuera, y botón Cancelar. Para "Guardar" no aplica
    // porque ahí los cambios van al cfg local.
    tryCancelEdit() {
      if (this.cardFormDirty) {
        const ok = confirmAction(this.l('msgCardsConfirmDiscard'));
        if (!ok) return;
      }
      this.cancelEdit();
    },

    removeCard(idx: number) {
      const target = this.filteredCards()[idx];
      if (target && this.isSystemCard(target)) {
        window.umbralAdmin.toast(this.l('msgCardsSystemNoDelete'), 'error');
        return;
      }
      const id = target.id;
      if (!confirmAction(this.l('msgCardsConfirmDelete'))) return;
      this.cfg.cards = this.cfg.cards.filter((c: Card) => c.id !== id);
      this.markDirty();
    },
    // ── System cards ───────────────────────────────────────────
    // La card de docs (id='docs' o url='/docs*') la crea el sistema y la
    // protege a nivel server. La UI tampoco expone Editar/Borrar — pero
    // defendemos también acá por si alguien la llama por código.
    // Heurística: cualquier card con id 'docs' o url que apunte a /docs
    // (incluyendo /docs/algo) es system. El user puede "ocultarla"
    // con el toggle "Activa", pero no editarla ni borrarla.
    isSystemCard(card: Card) {
      return checkSystemCard(card);
    },
  };
}

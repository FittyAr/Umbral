import type { AdminFragment } from "./types";
import { cardGroups as buildCardGroups, adminCardsLayout as buildAdminCardsLayout, moveCardToCategory, moveCardToUngrouped, syncOrderFromDom, realCategories as filterRealCategories, reorderRealCategories, createGhostCategory, ORPHAN_CATEGORY_ID, GAP_CATEGORY_ID, UNGROUPED_SELECT_ID } from "~/lib/cards-admin";
import { isSystemCard as checkSystemCard, SYSTEM_DOCS_ICON, SYSTEM_DOCS_ICON_PATH } from "~/lib/system-card";
import { clampCardSpan, MAX_CARD_SPAN } from "~/lib/card-span";
import { createInstalledIconLookup } from "~/lib/icon-url";
import Sortable from "sortablejs";
import { newId } from '~/lib/ids';
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio cards.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createCardsState(): AdminFragment {
  return {
    collapsedCardGroups: {},
    _cardSortables: [],
    _cardsDragging: false,
    _cardsDragLayout: null,
    ungroupedSelectId: UNGROUPED_SELECT_ID,
    ungroupedGapId: GAP_CATEGORY_ID,
    cardFilter: '',
    editingCard: null,
    editingIndex: -1,
    // Markdown (opt-in: features.markdown). El toggle aparece en el
    // form sólo si la feature está activa. descriptionFormat default
    // a 'plain' para cards nuevos; el user puede flippearlo.
    markdownEnabled: window.__featureList?.find?.((f) => f.name === 'markdown')?.enabled === true,
    markdownPreview: '',
    markdownPreviewDirty: true,
    // i18n methods (Alpine 3: se llaman con `()` en el HTML)
    editingKey: 0,
    cardFormDirty: false,
    autofillBusy: false,
    // Catálogo de nombres de íconos. Llega de GET /api/icon-names en el
    // init (no bloquea el render) en vez de viajar inline: son 229 KB que
    // además escalan con cada pack instalado.
    availableIcons: [],
    _iconNamesPromise: null,
    iconPickerSearch: '',
    iconPickerPack: 'all',
    iconPickerLimit: 120,
    iconPickerTab: 'icons',

    resetIconPicker() {
      this.iconPickerSearch = '';
      this.iconPickerPack = 'all';
      this.iconPickerLimit = 120;
      this.iconPickerTab = 'icons';
    },

    // Una sola request por sesión: el catálogo sólo cambia al instalar o
    // desinstalar un pack, y esos flujos lo reemplazan a mano.
    ensureAvailableIcons() {
      if (this.availableIcons.length > 0) return Promise.resolve();
      // En el demo estático no hay endpoint que responder: el catálogo
      // viene inline con el build.
      if (window.__availableIcons) {
        this.availableIcons = window.__availableIcons;
        return Promise.resolve();
      }
      if (!this._iconNamesPromise) {
        this._iconNamesPromise = window.umbralAdmin
          .api('GET', '/api/icon-names')
          .then((res) => {
            this.availableIcons = res.availableIcons || [];
          })
          .catch(() => {
            // Sin catálogo, resolveIcon() no muestra íconos, pero el
            // resto del admin sigue funcionando.
            this._iconNamesPromise = null;
          });
      }
      return this._iconNamesPromise;
    },

    async refreshIconCatalog() {
      if (!this.isFeatureOn('iconPacks')) return this.ensureAvailableIcons();
      try {
        const res = await window.umbralAdmin.api('GET', '/api/icon-packs');
        if (res.availableIcons) {
          this.availableIcons = res.availableIcons;
        }
      } catch {
        // usar catálogo en caché
      }
    },

    async prepareCardEditor() {
      this.resetIconPicker();
      await Promise.all([
        this.refreshIconCatalog(),
        this.assets.length === 0 ? this.refreshAssets() : Promise.resolve(),
      ]);
    },

    iconPickerPacks() {
      const packs = new Set();
      for (const i of this.availableIcons) {
        const slash = i.indexOf('/');
        if (slash > 0) packs.add(i.slice(0, slash));
      }
      return [...packs].sort();
    },

    iconPickerPackOptions() {
      return this.iconPickerPacks();
    },

    filteredIconPickerIcons() {
      let list = this.availableIcons;
      if (this.iconPickerPack !== 'all') {
        list = list.filter((i) => i.startsWith(this.iconPickerPack + '/'));
      }
      const q = this.iconPickerSearch.toLowerCase().trim();
      if (q) list = list.filter((i) => i.toLowerCase().includes(q));
      return list;
    },

    visibleIconPickerIcons() {
      return this.filteredIconPickerIcons().slice(0, this.iconPickerLimit);
    },

    iconPickerHasMore() {
      return this.visibleIconPickerIcons().length < this.filteredIconPickerIcons().length;
    },

    loadMoreIcons() {
      this.iconPickerLimit += 120;
    },

    iconPickerAssets() {
      return this.assets.filter((a) => /\.(svg|png|jpg|jpeg|webp|gif|ico)$/i.test(a.name));
    },

    iconPickerEmptyMessage() {
      if (!this.isFeatureOn('iconPacks')) {
        return this.l('iconPickerFeatureOff');
      }
      return this.l('iconPickerNoPacks');
    },

    iconPickerEmptyAction() {
      if (!this.isFeatureOn('iconPacks')) {
        return this.l('iconPickerGoFeatures');
      }
      return this.l('iconPickerGoIconPacks');
    },

    openIconPacksFromPicker() {
      if (!this.isFeatureOn('iconPacks')) {
        this.tab = 'advanced';
        return;
      }
      this.tab = 'iconpacks';
    },
    // Ancho de tarjeta en columnas. El select ofrece siempre el rango
    // completo del schema; el recorte a las columnas reales lo hace el
    // render (lib/card-span.ts) y el hint lo anticipa acá.
    cardSpanOptions() { return Array.from({ length: MAX_CARD_SPAN }, (_, i) => i + 1); },
    cardSpanOptionLabel(n) {
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
    cardSpanBadgeLabel(card) {
      const span = Number(card?.span) || 1;
      return span > 1 ? this.cardSpanOptionLabel(span) : '';
    },
    // Tags (opt-in: features.tags). El server dropea el array si la
    // feature está apagada. Acá solo manejamos el chip input + autocomplete.
    tagsEnabled: window.__featureList?.find?.((f) => f.name === 'tags')?.enabled === true,
    tagInput: '',
    // Pinned (opt-in: features.pinned). El server fuerza pinned=false
    // si la feature está apagada.
    pinnedEnabled: window.__featureList?.find?.((f) => f.name === 'pinned')?.enabled === true,
    // Presets (opt-in: features.presets)
    presetsEnabled: window.__featureList?.find?.((f) => f.name === 'presets')?.enabled === true,
    // 225 plantillas, 55 KB: se piden a /api/presets.json al abrir el
    // modal, no en cada carga del dashboard.
    appPresets: [],
    _appPresetsPromise: null,
    presetsLoading: false,
    showPresetsModal: false,
    presetFilter: '',
    presetCategoryFilter: '',
    presetCategories() {
      const map = new Map();
      for (const p of this.appPresets) {
        const catId = p.category;
        const catName = p.defaultCategoryName || p.category;
        if (!map.has(catId)) {
          map.set(catId, { id: catId, name: catName, count: 1 });
        } else {
          map.get(catId).count++;
        }
      }
      return Array.from(map.values());
    },
    filteredAppPresets() {
      let list = this.appPresets;
      if (this.presetCategoryFilter) {
        list = list.filter((p) => p.category === this.presetCategoryFilter);
      }
      if (this.presetFilter) {
        const q = this.presetFilter.toLowerCase().trim();
        list = list.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.defaultCategoryName && p.defaultCategoryName.toLowerCase().includes(q))
        );
      }
      return list;
    },
    ensureAppPresets() {
      if (this.appPresets.length > 0) return Promise.resolve();
      if (!this._appPresetsPromise) {
        this.presetsLoading = true;
        this._appPresetsPromise = window.umbralAdmin
          .api('GET', '/api/presets.json')
          .then((res) => {
            this.appPresets = res.presets || [];
          })
          .catch((e) => {
            this._appPresetsPromise = null;
            window.umbralAdmin.toast('No se pudieron cargar las plantillas: ' + e.message, 'error');
          })
          .finally(() => {
            this.presetsLoading = false;
          });
      }
      return this._appPresetsPromise;
    },

    async openPresetsModal() {
      this.presetFilter = '';
      this.presetCategoryFilter = '';
      this.showPresetsModal = true;
      await this.ensureAppPresets();
    },
    applyAppPreset(p) {
      this.showPresetsModal = false;
      let cat = this.realCategories().find((c) => c.name.toLowerCase() === (p.defaultCategoryName || '').toLowerCase() || c.id === p.category);
      if (!cat) cat = this.realCategories()[0];
      const newCard = {
        id: newId('card'),
        title: p.name,
        kind: 'link',
        description: p.description,
        descriptionFormat: 'plain',
        url: '',
        // Las plantillas referencian íconos Lucide. Si ese pack no está
        // instalado, guardar la referencia dejaría la tarjeta con un
        // ícono roto en la portada, así que la creamos sin ícono.
        icon: this.resolveIcon(p.icon) ? p.icon : '',
        category: cat ? cat.id : '',
        openInNewTab: true,
        color: p.color || this.cfg.theme.accentColor,
        order: this.cfg.cards.length,
        span: 1,
        enabled: true,
        healthCheck: false,
        pinned: false,
        tags: [p.category],
      };
      this.editingCard = newCard;
      this.editingIndex = -1;
      this.editingKey++;
      this.cardFormDirty = true;
      this.prepareCardEditor();
    },
    tagSuggestions() {
      // Tags que ya existen en otras cards, filtradas por lo que el
      // user está tipeando. Limit 8.
      if (!this.tagInput) return [];
      const q = this.tagInput.toLowerCase();
      const current = new Set((this.editingCard?.tags || []).map(t => t.toLowerCase()));
      const allTags = new Set();
      for (const c of (this.cfg?.cards || [])) {
        for (const t of (c.tags || [])) {
          const norm = String(t).toLowerCase().trim();
          if (norm && !current.has(norm)) allTags.add(norm);
        }
      }
      return Array.from(allTags).filter(t => t.startsWith(q)).sort().slice(0, 8);
    },
    cardSortableOptions(container) {
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

    initSortable() {
      const catsEl = document.getElementById('categories-sortable');
      if (catsEl && !Sortable.get(catsEl)) {
        Sortable.create(catsEl, {
          handle: '.drag-handle',
          animation: 150,
          onEnd: (evt) => {
            reorderRealCategories(this.cfg.categories, evt.oldIndex, evt.newIndex);
            this.markDirty();
          },
        });
      }
      this.reconcileCardSortables();
    },

    pruneCardSortables() {
      this._cardSortables = this._cardSortables.filter((s) => {
        if (s.el && document.contains(s.el)) return true;
        try { s.destroy(); } catch { /* el may already be gone */ }
        return false;
      });
    },

    destroyAllCardSortables() {
      this._cardSortables.forEach((s) => {
        try { s.destroy(); } catch { /* el may already be gone */ }
      });
      this._cardSortables = [];
    },

    reconcileCardSortables() {
      if (this._cardsDragging) return;

      if (this.cardFilter.trim()) {
        this.destroyAllCardSortables();
        return;
      }

      const container = document.getElementById('cards-groups-container');
      if (!container) return;

      this.pruneCardSortables();

      const groups = container.querySelectorAll('.cards-group-list[data-category]');
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

    categorySelectValue(card) {
      if (!card) return '';
      const cat = this.cfg.categories.find((c) => c.id === card.category);
      if (!cat || cat.isGhost) return UNGROUPED_SELECT_ID;
      return card.category;
    },

    toggleCardGroup(categoryId) {
      this.collapsedCardGroups[categoryId] = !this.isCardGroupCollapsed(categoryId);
      if (this.tab === 'cards') {
        this.$nextTick(() => this.initCardSortables());
      }
    },

    isCardGroupCollapsed(categoryId) {
      return Boolean(this.collapsedCardGroups[categoryId]);
    },

    addCardToCategory(categoryId) {
      if (categoryId === ORPHAN_CATEGORY_ID) return;
      this.addCard(categoryId);
    },

    changeCardCategory(cardId, categoryId) {
      if (!categoryId || categoryId === ORPHAN_CATEGORY_ID || categoryId === GAP_CATEGORY_ID) return;
      const card = this.cfg.cards.find((c) => c.id === cardId);
      if (!card || this.isSystemCard(card)) return;
      if (categoryId === UNGROUPED_SELECT_ID) {
        moveCardToUngrouped(this.cfg.categories, this.cfg.cards, cardId);
      } else {
        moveCardToCategory(this.cfg.categories, this.cfg.cards, cardId, categoryId);
      }
      this.markDirty();
      this.$nextTick(() => this.initCardSortables());
    },

    editCardById(cardId) {
      const idx = this.filteredCards().findIndex((c) => c.id === cardId);
      if (idx >= 0) this.editCard(idx);
    },

    removeCardById(cardId) {
      const idx = this.filteredCards().findIndex((c) => c.id === cardId);
      if (idx >= 0) this.removeCard(idx);
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

    addCard(categoryId) {
      const reals = this.realCategories();
      if (!reals.length && categoryId !== UNGROUPED_SELECT_ID && !this.cfg.categories.some((c) => c.id === categoryId)) {
        window.umbralAdmin.toast('Primero creá una categoría', 'error');
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
        title: 'Nueva tarjeta',
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
    async editCard(idx) {
      const cardId = this.filteredCards()[idx]?.id;
      if (cardId) {
        const target = this.cfg.cards.find((c) => c.id === cardId);
        if (target && this.isSystemCard(target)) {
          window.umbralAdmin.toast('Esta tarjeta es del sistema (apunta a la documentación de Umbral en /docs) y no se puede editar.', 'error');
          return;
        }
      }
      if (!cardId) {
        window.umbralAdmin.toast('No se pudo encontrar la tarjeta', 'error');
        return;
      }
      const realIdx = this.cfg.cards.findIndex((c) => c.id === cardId);
      if (realIdx < 0) {
        window.umbralAdmin.toast('No se pudo encontrar la tarjeta en la config', 'error');
        return;
      }
      try {
        // Re-validar contra el schema. Si la card en memoria tiene
        // campos faltantes (cards viejas sin kind/healthCheck), zod
        // los rellena con los defaults.
        const { CardSchema } = await import('~/lib/schema');
        const parsed = CardSchema.safeParse(this.cfg.cards[realIdx]);
        if (!parsed.success) {
          window.umbralAdmin.toast('La tarjeta en disco está corrupta: ' + parsed.error.issues.map(i => i.message).join('; '), 'error');
          return;
        }
        this.editingIndex = realIdx;
        // Spread shallow + parsed (que ya tiene defaults aplicados).
        // structuredClone o JSON.parse(JSON.stringify) sobre un proxy
        // de Alpine 3 puede perder tipos o referencias. Spread es
        // suficiente porque CardSchema es flat (sin objetos anidados).
        this.editingCard = { ...parsed.data };
        const currentCat = this.cfg.categories.find((c) => c.id === this.editingCard.category);
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
      } catch (err) {
        console.error('[umbral] editCard failed:', err);
        window.umbralAdmin.toast('Error abriendo la tarjeta: ' + err.message, 'error');
      }
    },
    saveCard() {
      if (!this.editingCard) return;
      const card = { ...this.editingCard };
      if (card.category === UNGROUPED_SELECT_ID) {
        const original = this.editingIndex >= 0 ? this.cfg.cards[this.editingIndex] : null;
        const origCat = original
          ? this.cfg.categories.find((c) => c.id === original.category)
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
        const ok = confirmAction('Tenés cambios sin guardar en esta tarjeta. ¿Descartarlos?');
        if (!ok) return;
      }
      this.cancelEdit();
    },

    // ── Tags helpers (opt-in: features.tags) ────────────────────
    // Chip input con Enter/coma/espacio para agregar y backspace para
    // borrar. Sanitiza y normaliza (kebab-case lowercase). El server
    // también valida, pero hacerlo client-side da feedback inmediato.
    sanitizeTag(raw) {
      if (typeof raw !== 'string') return null;
      const norm = raw.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 30);
      if (!/^[a-z0-9-]{1,30}$/.test(norm)) return null;
      return norm;
    },
    addTag(raw) {
      if (!this.editingCard) return;
      if (!Array.isArray(this.editingCard.tags)) this.editingCard.tags = [];
      if (this.editingCard.tags.length >= 10) return;
      const t = this.sanitizeTag(raw);
      if (!t) return;
      if (this.editingCard.tags.some(x => x.toLowerCase() === t)) return; // dedup
      this.editingCard.tags.push(t);
      this.tagInput = '';
      this.cardFormDirty = true;
    },
    addTagFromInput() {
      if (this.tagInput && this.tagInput.trim()) {
        this.addTag(this.tagInput);
      }
    },
    removeTag(idx) {
      if (!this.editingCard?.tags) return;
      if (idx < 0 || idx >= this.editingCard.tags.length) return;
      this.editingCard.tags.splice(idx, 1);
      this.cardFormDirty = true;
    },

    // ── Markdown helpers (opt-in: features.markdown) ─────────────
    // El form tiene maxlength dinámico según descriptionFormat:
    // 200 para plain, 1000 para markdown. Cuando la feature está
    // apagada, forzamos plain en el toggle y siempre 200.
    descMaxLength() {
      if (!this.markdownEnabled) return 200;
      return this.editingCard?.descriptionFormat === 'markdown' ? 1000 : 200;
    },
    // Cuando el user cambia el toggle, el maxlength se actualiza vía
    // :maxlength="descMaxLength()" automáticamente. Pero si el contenido
    // actual excede el nuevo límite, no lo cortamos (al guardar el
    // server clampea). Sólo notamos que hay preview dirty.
    updateDescriptionLimit() {
      this.markdownPreviewDirty = true;
      this.refreshMarkdownPreview();
    },
    // Render markdown client-side usando las mismas libs que el server
    // (marked + DOMPurify) para que la preview matche el resultado
    // final. Si la feature está apagada, no se llama (la UI no muestra
    // el preview).
    async refreshMarkdownPreview() {
      if (!this.markdownEnabled) { this.markdownPreview = ''; return; }
      if (this.editingCard?.descriptionFormat !== 'markdown') { this.markdownPreview = ''; return; }
      const desc = this.editingCard?.description || '';
      if (!desc) { this.markdownPreview = ''; return; }
      try {
        const res = await window.umbralAdmin.api('POST', '/api/markdown/render', { text: desc });
        this.markdownPreview = res.html || '';
        this.markdownPreviewDirty = false;
      } catch (e) {
        this.markdownPreview = '<em style="color:#fca5a5">Error al renderizar preview: ' + (e?.message || e) + '</em>';
      }
    },
    // Auto-completar el form desde la URL o el nombre. Pide a
    // /api/fetch-card-info que scrapea el <head> del sitio y, si no
    // encuentra nada útil, hace fallback a búsqueda externa
    // (Brave/Tavily si hay key, Wikipedia + DuckDuckGo siempre).
    // Sólo sobreescribe campos VACÍOS — no pisa lo que el user ya escribió.
    async autofillFromUrl() {
      if (!this.editingCard?.url && !this.editingCard?.title) return;
      const url = this.editingCard.url;
      const name = this.editingCard.title;
      // Si hay URL, sólo la mandamos si parece http(s) o path interno.
      // Si no, mandamos sólo el name.
      const params = new URLSearchParams();
      if (url && /^https?:\/\//.test(url)) params.set('url', url);
      if (name && name.trim()) params.set('name', name.trim());
      if (!params.toString()) return;
      this.autofillBusy = true;
      try {
        const res = await fetch(`/api/fetch-card-info?${params.toString()}`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          window.umbralAdmin.toast(e.error || `Error HTTP ${res.status}`, 'error');
          return;
        }
        const data = await res.json();
        let filled = 0;
        if (data.title && (!this.editingCard.title || this.editingCard.title === 'Nueva tarjeta' || this.editingCard.title.trim() === '')) {
          this.editingCard.title = data.title; filled++;
        }
        if (data.description && !this.editingCard.description) {
          this.editingCard.description = data.description; filled++;
        }
        // La imagen: si vino una, la subimos como asset vía el endpoint
        // /api/upload-from-url (que hace el download server-side, evitando
        // el CSP `connect-src 'self'` del browser). Si falla, no tocamos
        // el ícono — la card queda sin imagen pero con title/description.
        if (data.image) {
          try {
            const upRes = await fetch('/api/upload-from-url', {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-csrf-token': window.umbralAdmin.csrf },
              body: JSON.stringify({ url: data.image, kind: 'icon' }),
            });
            // BUGFIX (4xx limpio, no más 502 en consola): /api/upload-from-url
            // ahora devuelve 200 con {ok:false, reason:'not_found'} cuando el
            // origen responde 4xx (ej: 404 por favicon inexistente, 403 por
            // hotlink protection). Eso evita que la consola se llene de
            // "502 Bad Gateway" cada vez que un sitio no expone og:image.
            if (upRes.ok) {
              const up = await upRes.json();
              if (up.ok && up.url) {
                this.editingCard.icon = up.url; filled++;
              } else {
                console.warn('[umbral] upload-from-url skipped:', up.reason || 'unknown');
              }
            } else {
              const err = await upRes.json().catch(() => ({}));
              console.warn('[umbral] upload-from-url failed:', err.error || upRes.status);
            }
          } catch (err) {
            console.warn('[umbral] upload-from-url error:', err);
          }
        }
        const sourceLabel = ({ scrape: 'scrape del sitio', brave: 'Brave', tavily: 'Tavily', wikipedia: 'Wikipedia', duckduckgo: 'DuckDuckGo', none: 'ninguna fuente' } as Record<string, string>)[data.source] || data.source;
        if (filled > 0) {
          window.umbralAdmin.toast(`Autocompletado: ${filled} campo(s) desde ${sourceLabel}`, 'success');
        } else {
          window.umbralAdmin.toast(`No se encontró info útil (${sourceLabel}). Cargá título/desc a mano.`, 'info');
        }
        this.markDirty();
      } catch (err) {
        window.umbralAdmin.toast(`Error: ${err.message}`, 'error');
      } finally {
        this.autofillBusy = false;
      }
    },
    // Disparado en blur del input URL. Sólo auto-completar si el form
    // está prácticamente vacío (no pisar lo que el user ya tipeó).
    maybeAutofillFromUrl() {
      if (!this.editingCard?.url) return;
      const ec = this.editingCard;
      const isEmpty = (!ec.title || ec.title === 'Nueva tarjeta' || !ec.title.trim())
        && !ec.description
        && (!ec.icon || ec.icon === this.availableIcons[0]);
      if (isEmpty) this.autofillFromUrl();
    },
    removeCard(idx) {
      const target = this.filteredCards()[idx];
      if (target && this.isSystemCard(target)) {
        window.umbralAdmin.toast('Esta tarjeta es del sistema (apunta a la documentación de Umbral en /docs) y no se puede borrar. Si no la querés ver, desactivala con el switch "Activa".', 'error');
        return;
      }
      const id = target.id;
      if (!confirmAction('¿Borrar esta tarjeta?')) return;
      this.cfg.cards = this.cfg.cards.filter(c => c.id !== id);
      this.markDirty();
    },
    // ── System cards ───────────────────────────────────────────
    // La card de docs (id='docs' o url='/docs*') la crea el sistema y la
    // protege a nivel server. La UI tampoco expone Editar/Borrar — pero
    // defendemos también acá por si alguien la llama por código.
    // Heurística: cualquier card con id 'docs' o url que apunte a /docs
    // (incluyendo /docs/algo) es system. El user puede "ocultarla"
    // con el toggle "Activa", pero no editarla ni borrarla.
    isSystemCard(card) {
      return checkSystemCard(card);
    },

    addCategory() {
      this.cfg.categories.push({ id: newId('cat'), name: 'Nueva', icon: 'folder', isLocked: false, password: '', isSubpage: false, isGhost: false });
      this.markDirty();
    },
    removeCategoryById(id) {
      const reals = this.realCategories();
      if (reals.length <= 1) {
        window.umbralAdmin.toast('No podés borrar la última categoría (las tarjetas necesitan una)', 'error');
        return;
      }
      if (this.cfg.cards.some((c) => c.category === id && this.isSystemCard(c))) {
        window.umbralAdmin.toast('No podés borrar esta categoría porque contiene la tarjeta del sistema. Desactivala si no la querés ver.', 'error');
        return;
      }
      if (!confirmAction('¿Borrar esta categoría? Las tarjetas que la usen se reasignan a la primera restante.')) return;
      const idx = this.cfg.categories.findIndex((c) => c.id === id);
      if (idx < 0) return;
      this.cfg.categories.splice(idx, 1);
      const fallback = this.realCategories()[0]?.id || '';
      this.cfg.cards.forEach((c) => {
        if (c.category === id && !this.isSystemCard(c)) c.category = fallback;
      });
      this.markDirty();
    },

    // `availableIcons` se reemplaza entero al instalar o desinstalar un
    // pack, así que comparar la referencia alcanza para invalidar el
    // lookup, y leerla acá mantiene la reactividad de Alpine.
    _installedIcons: null,
    isIconInstalled(icon) {
      const list = this.availableIcons || [];
      if (!this._installedIcons || this._installedIcons.source !== list) {
        this._installedIcons = { source: list, has: createInstalledIconLookup(list) };
      }
      return this._installedIcons.has(icon);
    },

    resolveIcon(icon, card) {
      if (card && checkSystemCard(card)) {
        icon = SYSTEM_DOCS_ICON;
      }
      if (!icon) return '';
      if (icon === SYSTEM_DOCS_ICON || icon === SYSTEM_DOCS_ICON_PATH) {
        const base = window.__BASE_URL__ || '/';
        const prefix = base.endsWith('/') ? base : base + '/';
        return prefix + SYSTEM_DOCS_ICON_PATH.slice(1);
      }
      if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:')) return icon;
      const base = window.__BASE_URL__ || '/';
      const prefix = base.endsWith('/') ? base : base + '/';
      if (icon.startsWith('/')) {
        if (icon.startsWith(prefix)) return icon;
        return prefix + icon.slice(1);
      }
      if (icon.includes('/')) {
        const clean = icon.replace(/\.svg$/, '');
        // Sin el pack instalado el <img> dispara un 404 por ícono. Pasa
        // seguido con las plantillas, que referencian Lucide, y el
        // proyecto arranca sin ningún pack.
        if (!this.isIconInstalled(clean)) return '';
        return prefix + 'api/icons/' + clean + '.svg';
      }
      if (/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(icon)) {
        return prefix + 'api/assets/' + icon;
      }
      return '';
    },
  };
}

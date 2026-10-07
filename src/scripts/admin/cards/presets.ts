import { errMsg, type AdminFragment } from "../types";
import type { Category } from "~/lib/schema";
import type { AppPreset } from "~/lib/presets";
import { newId } from '~/lib/ids';
import { isFeatureListed } from './shared.ts';

/** Plantillas de apps (opt-in: features.presets): modal, filtros y alta. */
export function createCardPresetsState(): AdminFragment {
  return {
    // Presets (opt-in: features.presets)
    presetsEnabled: isFeatureListed('presets'),
    // 225 plantillas, 55 KB: se piden a /api/presets.json al abrir el
    // modal, no en cada carga del dashboard.
    appPresets: [],
    _appPresetsPromise: null,
    presetsLoading: false,
    showPresetsModal: false,
    presetFilter: '',
    presetCategoryFilter: '',
    presetCategories() {
      const map = new Map<string, { id: string; name: string; count: number }>();
      for (const p of this.appPresets as AppPreset[]) {
        const catId = p.category;
        const catName = p.defaultCategoryName || p.category;
        if (!map.has(catId)) {
          map.set(catId, { id: catId, name: catName, count: 1 });
        } else {
          map.get(catId)!.count++;
        }
      }
      return Array.from(map.values());
    },
    filteredAppPresets() {
      let list = this.appPresets;
      if (this.presetCategoryFilter) {
        list = list.filter((p: AppPreset) => p.category === this.presetCategoryFilter);
      }
      if (this.presetFilter) {
        const q = this.presetFilter.toLowerCase().trim();
        list = list.filter((p: AppPreset) =>
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
          .then((res: { presets?: AppPreset[] }) => {
            this.appPresets = res.presets || [];
          })
          .catch((e: unknown) => {
            this._appPresetsPromise = null;
            window.umbralAdmin.toast(this.l('msgCardsPresetsLoadError', { message: errMsg(e) }), 'error');
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
    applyAppPreset(p: AppPreset) {
      this.showPresetsModal = false;
      let cat = this.realCategories().find((c: Category) => c.name.toLowerCase() === (p.defaultCategoryName || '').toLowerCase() || c.id === p.category);
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
  };
}

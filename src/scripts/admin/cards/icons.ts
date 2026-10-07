import type { AdminFragment, AdminAsset } from "../types";
import type { Card } from "~/lib/schema";
import { isSystemCard as checkSystemCard, SYSTEM_DOCS_ICON, SYSTEM_DOCS_ICON_PATH } from "~/lib/system-card";
import { createInstalledIconLookup } from "~/lib/icon-url";

/**
 * Catálogo de íconos, picker del editor de cards y resolución de la URL de
 * un ícono (`resolveIcon`), que también usan otros paneles.
 */
export function createCardIconsState(): AdminFragment {
  return {
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
          .then((res: { availableIcons?: string[] }) => {
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

    iconPickerPacks() {
      const packs = new Set<string>();
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
        list = list.filter((i: string) => i.startsWith(this.iconPickerPack + '/'));
      }
      const q = this.iconPickerSearch.toLowerCase().trim();
      if (q) list = list.filter((i: string) => i.toLowerCase().includes(q));
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
      return this.assets.filter((a: AdminAsset) => /\.(svg|png|jpg|jpeg|webp|gif|ico)$/i.test(a.name));
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

    // `availableIcons` se reemplaza entero al instalar o desinstalar un
    // pack, así que comparar la referencia alcanza para invalidar el
    // lookup, y leerla acá mantiene la reactividad de Alpine.
    _installedIcons: null,
    isIconInstalled(icon: string) {
      const list = this.availableIcons || [];
      if (!this._installedIcons || this._installedIcons.source !== list) {
        this._installedIcons = { source: list, has: createInstalledIconLookup(list) };
      }
      return this._installedIcons.has(icon);
    },

    resolveIcon(icon: string | null | undefined, card?: Card | null) {
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

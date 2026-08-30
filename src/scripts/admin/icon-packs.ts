import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio icon-packs.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createIconPacksState(): AdminFragment {
  return {
    // Icon Packs (opt-in: features.iconPacks). El catálogo de packs
    // conocidos llega de /api/icon-pack-catalog.json al abrir el tab.
    iconPacks: [],
    iconPackCatalog: [],
    _iconPackCatalogPromise: null,
    iconPacksTotal: 0,
    iconPacksLoading: false,
    iconPacksInstalling: {},
    customPack: { repoUrl: '', branch: 'main', subpath: '', prefix: '' },
    customPackInstalling: false,
    iconPackMsg: { text: '', error: false },

    ensureIconPackCatalog() {
      if (this.iconPackCatalog.length > 0) return Promise.resolve();
      if (!this._iconPackCatalogPromise) {
        this._iconPackCatalogPromise = window.umbralAdmin
          .api('GET', '/api/icon-pack-catalog.json')
          .then((res) => {
            this.iconPackCatalog = res.packs || [];
          })
          .catch(() => {
            this._iconPackCatalogPromise = null;
          });
      }
      return this._iconPackCatalogPromise;
    },

    seedIconPacksCatalog() {
      const catalog = this.iconPackCatalog;
      return catalog.map((p) => ({
        ...p,
        installed: false,
        installedAt: undefined,
        installedCount: undefined,
      }));
    },

    iconPacksPersisted() {
      const base = this.original ?? window.__initialConfig;
      const flag = base?.features?.iconPacks;
      return !!flag && typeof flag === 'object' && flag.enabled === true;
    },

    iconPacksNeedsSave() {
      return !!this.isFeatureOn('iconPacks') && !this.iconPacksPersisted();
    },

    // Alpine coerce un resultado `undefined` a '' cuando la expresion de
    // x-bind contiene un punto, y '' activa los atributos booleanos. Por
    // eso todo binding de :disabled tiene que devolver un booleano real.
    isPackBusy(packId) {
      return this.iconPacksInstalling[packId] === true;
    },

    isPackActionBlocked(packId) {
      return !this.iconPacksPersisted() || this.isPackBusy(packId);
    },

    mergeIconPacksFromApi(apiPacks) {
      const byId = new Map((apiPacks || []).map((p) => [p.id, p]));
      const catalog = this.iconPackCatalog;
      return catalog.map((def) => {
        const fromApi = byId.get(def.id);
        if (fromApi) return fromApi;
        return {
          ...def,
          installed: false,
          installedAt: undefined,
          installedCount: undefined,
        };
      });
    },

    iconPacksSaveRequiredMsg() {
      return 'Guardá los cambios (botón «Guardar cambios» arriba) para habilitar la instalación y desinstalación de paquetes de íconos.';
    },

    isIconPacksFeatureDisabledError(message) {
      const m = (message || '').toLowerCase();
      return m.includes('iconpacks') && m.includes('desactivada');
    },

    async loadIconPacks() {
      await this.ensureIconPackCatalog();
      if (this.iconPacks.length === 0) {
        this.iconPacks = this.seedIconPacksCatalog();
      }
      if (this.iconPacksNeedsSave()) {
        this.iconPackMsg = { text: this.iconPacksSaveRequiredMsg(), error: true };
        return;
      }
      this.iconPacksLoading = true;
      try {
        const res = await window.umbralAdmin.api('GET', '/api/icon-packs');
        this.iconPacks = this.mergeIconPacksFromApi(res.packs);
        this.iconPacksTotal = res.totalInstalledIcons || 0;
        if (res.availableIcons) {
          this.availableIcons = res.availableIcons;
        }
        this.iconPackMsg = { text: '', error: false };
      } catch (e) {
        if (this.isIconPacksFeatureDisabledError(e.message)) {
          this.iconPackMsg = { text: this.iconPacksSaveRequiredMsg(), error: true };
        } else {
          this.iconPackMsg = { text: 'Error al cargar paquetes: ' + e.message, error: true };
        }
      } finally {
        this.iconPacksLoading = false;
      }
    },

    async installPack(packId) {
      if (this.iconPacksNeedsSave()) {
        const msg = this.iconPacksSaveRequiredMsg();
        this.iconPackMsg = { text: msg, error: true };
        window.umbralAdmin.toast(msg, 'error');
        return;
      }
      this.iconPacksInstalling = { ...this.iconPacksInstalling, [packId]: true };
      this.iconPackMsg = { text: 'Descargando e instalando paquete…', error: false };
      try {
        const res = await window.umbralAdmin.api('POST', '/api/icon-packs', { packId });
        this.iconPackMsg = { text: res.message || 'Paquete instalado correctamente.', error: false };
        window.umbralAdmin.toast(this.iconPackMsg.text, 'success');
        await this.loadIconPacks();
        await this.refreshAssets();
      } catch (e) {
        const text = this.isIconPacksFeatureDisabledError(e.message)
          ? this.iconPacksSaveRequiredMsg()
          : 'Error al instalar paquete: ' + e.message;
        this.iconPackMsg = { text, error: true };
        window.umbralAdmin.toast(text, 'error');
      } finally {
        this.iconPacksInstalling = { ...this.iconPacksInstalling, [packId]: false };
      }
    },

    async uninstallPack(packId) {
      if (this.iconPacksNeedsSave()) {
        const msg = this.iconPacksSaveRequiredMsg();
        this.iconPackMsg = { text: msg, error: true };
        window.umbralAdmin.toast(msg, 'error');
        return;
      }
      this.iconPacksInstalling = { ...this.iconPacksInstalling, [packId]: true };
      try {
        const res = await window.umbralAdmin.api('POST', '/api/icon-packs/uninstall', { packId });
        this.iconPackMsg = { text: res.message || 'Paquete desinstalado.', error: false };
        window.umbralAdmin.toast(this.iconPackMsg.text, 'success');
        await this.loadIconPacks();
        await this.refreshAssets();
      } catch (e) {
        const text = this.isIconPacksFeatureDisabledError(e.message)
          ? this.iconPacksSaveRequiredMsg()
          : 'Error al desinstalar: ' + e.message;
        this.iconPackMsg = { text, error: true };
        window.umbralAdmin.toast(text, 'error');
      } finally {
        this.iconPacksInstalling = { ...this.iconPacksInstalling, [packId]: false };
      }
    },

    async installCustomPack() {
      if (!this.customPack.repoUrl) return;
      if (this.iconPacksNeedsSave()) {
        const msg = this.iconPacksSaveRequiredMsg();
        this.iconPackMsg = { text: msg, error: true };
        window.umbralAdmin.toast(msg, 'error');
        return;
      }
      this.customPackInstalling = true;
      this.iconPackMsg = { text: 'Clonando repositorio y extrayendo íconos…', error: false };
      try {
        const res = await window.umbralAdmin.api('POST', '/api/icon-packs', this.customPack);
        this.iconPackMsg = { text: res.message || 'Íconos instalados correctamente.', error: false };
        window.umbralAdmin.toast(this.iconPackMsg.text, 'success');
        this.customPack.repoUrl = '';
        this.customPack.subpath = '';
        this.customPack.prefix = '';
        await this.loadIconPacks();
        await this.refreshAssets();
      } catch (e) {
        const text = this.isIconPacksFeatureDisabledError(e.message)
          ? this.iconPacksSaveRequiredMsg()
          : 'Error al instalar desde repositorio: ' + e.message;
        this.iconPackMsg = { text, error: true };
        window.umbralAdmin.toast(text, 'error');
      } finally {
        this.customPackInstalling = false;
      }
    },

  };
}

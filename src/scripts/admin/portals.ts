import type { AdminFragment, FeatureListItem } from "./types";

interface AdminPortal {
  id: string;
  name: string;
  host?: string;
  pathPrefix?: string;
}

/**
 * Fragmento del objeto Alpine del admin: dominio portals.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createPortalsState(): AdminFragment {
  return {
    // Multi-Portal (opt-in: features.multiPortal)
    multiPortalEnabled: window.__featureList?.find?.((f: FeatureListItem) => f.name === 'multiPortal')?.enabled === true,
    newPortal: { id: '', name: '', host: '', pathPrefix: '' },
    /** Selector de portal del header: recarga el panel con `?portal=`, o
     *  vuelve el <select> atrás si hay cambios sin guardar y el user cancela. */
    switchPortal(select: HTMLSelectElement) {
      if (!this.dirty || confirm(this.l('msgConfirmReloadDirty'))) {
        const u = new URL(location.href);
        u.searchParams.set('portal', select.value);
        location.href = u.toString();
      } else {
        select.value = window.__UMBRAL_PORTAL__ || 'default';
      }
    },
    addPortal() {
      if (!this.cfg.portals) this.cfg.portals = { defaultPortal: 'default', items: [] };
      if (!Array.isArray(this.cfg.portals.items)) this.cfg.portals.items = [];
      const p = this.newPortal;
      const id = p.id.trim();
      const pathPrefix = p.pathPrefix.trim().replace(/\/+$/, '');
      if (!id || !p.name.trim()) {
        window.umbralAdmin.toast(this.l('msgPortalsRequired'), 'error');
        return;
      }
      // `default` es el portal raíz (config global); los ids van a una
      // carpeta en data/portals/, así que el formato es estricto.
      if (id === 'default' || !/^[a-z0-9-]{1,40}$/.test(id)) {
        window.umbralAdmin.toast(this.l('msgPortalInvalidId'), 'error');
        return;
      }
      if (this.cfg.portals.items.some((x: AdminPortal) => x.id === id)) {
        window.umbralAdmin.toast(this.l('msgPortalDuplicate'), 'error');
        return;
      }
      if (pathPrefix && !/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(pathPrefix)) {
        window.umbralAdmin.toast(this.l('msgPortalInvalidPrefix'), 'error');
        return;
      }
      if (!p.host.trim() && !pathPrefix) {
        window.umbralAdmin.toast(this.l('msgPortalNeedsRoute'), 'error');
        return;
      }
      this.cfg.portals.items.push({
        id,
        name: p.name.trim(),
        host: p.host.trim().toLowerCase() || '',
        pathPrefix: pathPrefix || '/',
      });
      this.newPortal = { id: '', name: '', host: '', pathPrefix: '' };
      this.markDirty();
      window.umbralAdmin.toast(this.l('msgPortalAdded'), 'success');
    },
    removePortal(idx: number) {
      if (!this.cfg.portals?.items) return;
      const removed = this.cfg.portals.items[idx];
      this.cfg.portals.items.splice(idx, 1);
      if (removed && this.cfg.portals.defaultPortal === removed.id) this.cfg.portals.defaultPortal = 'default';
      this.markDirty();
      window.umbralAdmin.toast(this.l('msgPortalRemoved'), 'success');
    },
    /** Panel de este mismo admin, editando la portada de otro portal. */
    portalEditUrl(id: string): string {
      const u = new URL(window.location.href);
      u.searchParams.set('portal', id);
      return u.toString();
    },
    /** URL pública del portal: su host (si tiene) y su prefijo. */
    portalPublicUrl(p: AdminPortal): string {
      const prefix = p.pathPrefix && p.pathPrefix !== '/' && p.pathPrefix !== '*' ? `${p.pathPrefix}/` : '/';
      const host = p.host && !p.host.includes('*') ? p.host : window.location.host;
      return `${window.location.protocol}//${host}${prefix}`;
    },
  };
}

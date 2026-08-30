import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio portals.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createPortalsState(): AdminFragment {
  return {
    // Multi-Portal (opt-in: features.multiPortal)
    multiPortalEnabled: window.__featureList?.find?.((f) => f.name === 'multiPortal')?.enabled === true,
    newPortal: { id: '', name: '', host: '', pathPrefix: '' },
    addPortal() {
      if (!this.cfg.portals) this.cfg.portals = { defaultPortal: 'default', items: [] };
      if (!Array.isArray(this.cfg.portals.items)) this.cfg.portals.items = [];
      const p = this.newPortal;
      if (!p.id || !p.name) {
        window.umbralAdmin.toast('ID y Nombre son obligatorios', 'error');
        return;
      }
      this.cfg.portals.items.push({
        id: p.id.trim(),
        name: p.name.trim(),
        host: p.host.trim() || undefined,
        pathPrefix: p.pathPrefix.trim() || undefined,
      });
      this.newPortal = { id: '', name: '', host: '', pathPrefix: '' };
      this.markDirty();
      window.umbralAdmin.toast('Portal agregado', 'success');
    },
    removePortal(idx) {
      if (!this.cfg.portals?.items) return;
      this.cfg.portals.items.splice(idx, 1);
      this.markDirty();
      window.umbralAdmin.toast('Portal eliminado', 'success');
    },
  };
}

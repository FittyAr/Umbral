import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio status.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createStatusState(): AdminFragment {
  return {
    statusResults: [],
    checkingStatus: false,
    healthInfo: null,
    async checkAllStatus() {
      this.checkingStatus = true;
      this.statusResults = [];
      try {
        const data = await window.umbralAdmin.api('POST', '/api/status', { ids: this.cfg.cards.filter(c=>c.enabled).map(c=>c.id) });
        this.statusResults = data.results || [];
      } catch (e) { window.umbralAdmin.toast(e.message, 'error'); }
      finally { this.checkingStatus = false; }
    },

    async checkHealth() {
      try {
        this.healthInfo = await window.umbralAdmin.api('GET', '/api/health');
      } catch (e) { window.umbralAdmin.toast(e.message, 'error'); }
    },

  };
}

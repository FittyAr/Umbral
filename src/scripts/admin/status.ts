import { errMsg, type AdminFragment } from "./types";
import type { Card } from "~/lib/schema";

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
        const data = await window.umbralAdmin.api('POST', '/api/status', { ids: this.cfg.cards.filter((c: Card)=>c.enabled).map((c: Card)=>c.id) });
        this.statusResults = data.results || [];
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
      finally { this.checkingStatus = false; }
    },

    async checkHealth() {
      try {
        this.healthInfo = await window.umbralAdmin.api('GET', '/api/health');
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

  };
}

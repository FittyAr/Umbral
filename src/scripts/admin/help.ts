import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio help.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createHelpState(): AdminFragment {
  return {
    // Catálogo de ayuda. Llega de GET /api/help la primera vez que el
    // usuario abre un `?`: son 88 KB que la mayoría de las sesiones no
    // necesita, así que no viajan en el HTML del dashboard.
    helpTexts: {},
    helpLoading: false,
    // Modal de ayuda actualmente abierto (key del catálogo).
    helpModalKey: null,

    // ── Help modal ──────────────────────────────────────────────
    async showHelp(key) {
      this.helpModalKey = key;
      await this.ensureHelpTexts();
    },
    closeHelp() { this.helpModalKey = null; },
    // Trae el catálogo una vez por sesión. Si el fetch falla, el modal
    // no se abre y el usuario ve un toast en vez de un modal vacío.
    async ensureHelpTexts() {
      if (this.helpLoading || Object.keys(this.helpTexts).length > 0) return;
      this.helpLoading = true;
      try {
        const data = await window.umbralAdmin.api('GET', `/api/help/${window.__helpLocale || 'es'}.json`);
        this.helpTexts = data.texts || {};
      } catch (e) {
        this.helpModalKey = null;
        window.umbralAdmin.toast('No se pudo cargar la ayuda: ' + e.message, 'error');
      } finally {
        this.helpLoading = false;
      }
    },
    currentHelp() {
      if (!this.helpModalKey) return null;
      return this.helpTexts[this.helpModalKey] || null;
    },

  };
}

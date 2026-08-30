import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio metrics.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createMetricsState(): AdminFragment {
  return {
    // Métricas (opt-in: features.metrics). El server registra samples
    // en /api/status. La UI carga el summary + sparkline via /api/metrics.
    metricsEnabled: window.__featureList?.find?.((f) => f.name === 'metrics')?.enabled === true,
    metricsTitle() { return this.i18n?.metrics?.title || 'Métricas'; },
    metricsIntro() { return this.i18n?.metrics?.intro || 'Sparklines + resumen (avg, p95, max) por card.'; },
    metricsReloadLabel() { return this.i18n?.metrics?.reload || 'Recargar'; },
    metricsLoadingLabel() { return this.i18n?.metrics?.loading || 'Cargando…'; },
    metricsRange: 3600000, // 1h default
    metricsLimit: 50,
    metricsRows: [],
    metricsLoading: false,
    metricsError: '',
    // ── Metrics helpers (opt-in: features.metrics) ──────────────
    async loadMetrics() {
      if (!this.metricsEnabled) return;
      this.metricsLoading = true;
      this.metricsError = '';
      try {
        const url = `/api/metrics?range=${this.metricsRange}&limit=${this.metricsLimit}`;
        const r = await window.umbralAdmin.api('GET', url);
        const cards = r.cards || [];
        // Por cada card, fetchear el SVG del sparkline por separado.
        // Es N+1 queries pero N es chico (decenas de cards max en
        // deployments típicos) y los SVG son chicos.
        this.metricsRows = await Promise.all(cards.map(async (row) => {
          let svg = '';
          try {
            const svgRes = await fetch(`/api/metrics?id=${encodeURIComponent(row.cardId)}&svg=1&range=${this.metricsRange}&limit=${this.metricsLimit}`, { credentials: 'same-origin' });
            if (svgRes.ok) svg = await svgRes.text();
          } catch (e) { /* silent */ }
          return { ...row, sparkline: svg };
        }));
      } catch (e) {
        this.metricsError = e.message || String(e);
        this.metricsRows = [];
      } finally {
        this.metricsLoading = false;
      }
    },
    cardTitleForId(id) {
      const c = this.cfg.cards.find((c) => c.id === id);
      return c?.title || id;
    },
    formatRelativeTime(iso) {
      if (!iso) return '—';
      const ms = Date.now() - new Date(iso).getTime();
      if (ms < 0) return 'ahora';
      const s = Math.floor(ms / 1000);
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      return `${h}h`;
    },

  };
}

import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio audit.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createAuditState(): AdminFragment {
  return {
    // Audit log viewer (opt-in). El server sólo renderiza esta sección
    // si features.auditLogViewer.enabled — acá decidimos si mostrar
    // filtros, cargar entries, etc.
    auditLogEnabled: window.__featureList?.find?.((f) => f.name === 'auditLogViewer')?.enabled === true,
    auditEntries: [],
    auditActions: [],
    auditLoading: false,
    auditError: '',
    auditResult: null,
    auditFilter: { action: '', detail: '', from: '', to: '', limit: 200 },
    // i18n getters para los labels de la sección Auditoría.
    auditTitle() { return this.i18n?.audit?.title || 'Auditoría'; },
    auditResetLabel() { return this.i18n?.audit?.reset || 'Limpiar'; },
    auditDownloadLabel() { return this.i18n?.audit?.download || 'Descargar log completo'; },
    auditLoadingLabel() { return this.i18n?.audit?.loading || 'Cargando…'; },
    auditEmptyLabel() { return this.i18n?.audit?.empty || 'No hay entradas que coincidan con los filtros.'; },
    // ── Audit log viewer (opt-in: features.auditLogViewer) ────
    // Carga las acciones distintas para popular el dropdown + las
    // entries con los filtros actuales. Disparado automáticamente
    // al abrir el tab Avanzado si la feature está activa.
    async loadAuditActions() {
      if (!this.auditLogEnabled) return;
      try {
        const r = await window.umbralAdmin.api('GET', '/api/audit?actions=1');
        this.auditActions = r?.actions || [];
      } catch (e) {
        // Silencioso: si /api/audit devuelve 404 (feature apagada por
        // algún cambio en runtime), no rompemos la UI.
        this.auditActions = [];
      }
    },

    async reloadAudit() {
      if (!this.auditLogEnabled) return;
      this.auditLoading = true;
      this.auditError = '';
      try {
        const params = new URLSearchParams();
        if (this.auditFilter.action) params.set('action', this.auditFilter.action);
        if (this.auditFilter.detail) params.set('detail', this.auditFilter.detail);
        // datetime-local devuelve "YYYY-MM-DDTHH:mm" sin zona. Para
        // compararlo con los timestamps ISO del log (que están en UTC),
        // interpretamos el input como UTC explícitamente — el admin
        // espera ver "todo lo del 19/ago 10-12hs" sin importar la
        // zona del browser. Si el admin quiere precisión, puede usar
        // el detalle en el filtro.
        if (this.auditFilter.from) params.set('from', new Date(this.auditFilter.from + ':00Z').toISOString());
        if (this.auditFilter.to) {
          // Si el user puso "hasta 19/ago 14:00" queremos incluir todos
          // los eventos de ese minuto → +1 minuto de gracia al final.
          const toDate = new Date(this.auditFilter.to + ':00Z');
          toDate.setMinutes(toDate.getMinutes() + 1);
          params.set('to', toDate.toISOString());
        }
        if (this.auditFilter.limit) params.set('limit', String(this.auditFilter.limit));
        const url = '/api/audit' + (params.toString() ? '?' + params.toString() : '');
        const r = await window.umbralAdmin.api('GET', url);
        this.auditEntries = r?.entries || [];
        this.auditResult = r;
      } catch (e) {
        this.auditError = e.message || String(e);
        this.auditEntries = [];
      } finally {
        this.auditLoading = false;
      }
    },

    resetAuditFilter() {
      this.auditFilter = { action: '', detail: '', from: '', to: '', limit: 200 };
      this.reloadAudit();
    },

    async downloadAuditLog() {
      if (!this.auditLogEnabled) return;
      // Bajar las últimas 1000 entries sin filtros y forzar download
      // como .log. No leemos el archivo del server-side (eso
      // requeriría un nuevo endpoint) — el admin puede abrir el
      // archivo desde la UI via `auditResult.path` (mensaje en pantalla).
      try {
        const r = await window.umbralAdmin.api('GET', '/api/audit?limit=1000');
        const lines = (r.entries || []).map((e) => `${e.ts}\t${e.action}\t${e.detail}`).reverse().join('\n');
        const blob = new Blob([lines + '\n'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        window.umbralAdmin.toast(this.i18n?.audit?.downloadError || ('Error: ' + (e?.message || e)), 'error');
      }
    },

    // Formato local-friendly para el timestamp ISO. Usa el locale del
    // navegador del admin (no el del portal).
    formatAuditTs(iso) {
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    },

  };
}

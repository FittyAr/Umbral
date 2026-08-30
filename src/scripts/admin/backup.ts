import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio backup.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createBackupState(): AdminFragment {
  return {
    async exportConfig() {
      try {
        const cfg = await window.umbralAdmin.api('GET', '/api/config');
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `umbral-config-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.umbralAdmin.toast('Exportado', 'success');
      } catch (e) { window.umbralAdmin.toast(e.message, 'error'); }
    },

    async importConfig(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      // Cap defensivo. El server también valida (1MB en middleware), pero
      // un archivo de 100MB en el browser congela la UI y se lleva la RAM.
      const MAX_IMPORT_BYTES = 1024 * 1024;
      if (file.size > MAX_IMPORT_BYTES) {
        window.umbralAdmin.toast(`Archivo demasiado grande (${(file.size/1024).toFixed(0)} KB, máx ${MAX_IMPORT_BYTES/1024} KB)`, 'error');
        e.target.value = ''; return;
      }
      if (!confirm('Importar reemplazará TODA la configuración actual. ¿Continuar?')) {
        e.target.value = ''; return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await window.umbralAdmin.api('PUT', '/api/import', data);
        window.umbralAdmin.toast('Importado. Recargando…', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        window.umbralAdmin.toast('Error: ' + err.message, 'error');
      } finally { e.target.value = ''; }
    },

    async resetConfig() {
      const confirmText = prompt('Esto restaurará la configuración a defaults. Escribí RESET para confirmar:');
      if (confirmText !== 'RESET') return;
      try {
        const cfg = await window.umbralAdmin.api('DELETE', '/api/config');
        this.cfg = JSON.parse(JSON.stringify(cfg));
        this.original = JSON.parse(JSON.stringify(cfg));
        this.dirty = false;
        window.umbralAdmin.toast('Reseteado', 'success');
        await this.refreshAssets();
      } catch (e) { window.umbralAdmin.toast(e.message, 'error'); }
    },

  };
}

import { errMsg, type AdminFragment } from "./types";
import { confirmAction } from './confirm.ts';

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
        window.umbralAdmin.toast(this.l('msgBackupExported'), 'success');
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

    async importConfig(e: Event) {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      // Cap defensivo. El server también valida (1MB en middleware), pero
      // un archivo de 100MB en el browser congela la UI y se lleva la RAM.
      const MAX_IMPORT_BYTES = 1024 * 1024;
      if (file.size > MAX_IMPORT_BYTES) {
        window.umbralAdmin.toast(this.l('msgBackupFileTooLarge', { size: (file.size/1024).toFixed(0), max: MAX_IMPORT_BYTES/1024 }), 'error');
        target.value = ''; return;
      }
      if (!confirmAction(this.l('msgBackupConfirmImport'))) {
        target.value = ''; return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await window.umbralAdmin.api('PUT', '/api/import', data);
        window.umbralAdmin.toast(this.l('msgBackupImported'), 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err: unknown) {
        window.umbralAdmin.toast(this.l('toastError', { message: errMsg(err) }), 'error');
      } finally { target.value = ''; }
    },

    async resetConfig() {
      const confirmText = prompt(this.l('msgBackupResetPrompt'));
      if (confirmText !== 'RESET') return;
      try {
        const cfg = await window.umbralAdmin.api('DELETE', '/api/config');
        this.applyServerConfig(cfg);
        window.umbralAdmin.toast(this.l('msgBackupResetDone'), 'success');
        await this.refreshAssets();
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

  };
}

import { errMsg, type AdminFragment } from "./types";
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio assets.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createAssetsState(): AdminFragment {
  return {
    assets: [],
    uploadKind: 'icon',
    uploaderDragover: false,
    selectedAsset: null,
    async refreshAssets() {
      try {
        const data = await window.umbralAdmin.api('GET', '/api/assets');
        this.assets = data.items || [];
      } catch (e) { console.error(e); }
    },

    async handleFileSelect(e: Event) {
      const input = e.target as HTMLInputElement;
      await this.uploadFiles(input.files!);
      input.value = '';
    },
    async handleFileDrop(e: DragEvent) {
      this.uploaderDragover = false;
      await this.uploadFiles(e.dataTransfer!.files);
    },
    async uploadFiles(files: FileList) {
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('kind', this.uploadKind);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-csrf-token': window.umbralAdmin.csrf },
            body: fd,
          });
          if (res.status === 401) { window.location.href = '/admin'; return; }
          const data = await res.json();
          if (!res.ok) { window.umbralAdmin.toast(file.name + ': ' + (data.error || 'Error'), 'error'); continue; }
          window.umbralAdmin.toast('Subido: ' + data.storedName + ' (' + (data.bytes/1024).toFixed(1) + ' KB)', 'success');
        } catch (err: unknown) {
          window.umbralAdmin.toast(file.name + ': ' + errMsg(err), 'error');
        }
      }
      await this.refreshAssets();
    },

    async deleteAsset(name: string) {
      if (!confirmAction('¿Borrar ' + name + '?')) return;
      try {
        await window.umbralAdmin.api('DELETE', '/api/assets', { name });
        window.umbralAdmin.toast('Borrado', 'success');
        await this.refreshAssets();
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

    copyToClipboard(text: string) {
      navigator.clipboard?.writeText(text).then(
        () => window.umbralAdmin.toast('URL copiada', 'success'),
        () => window.umbralAdmin.toast('No se pudo copiar', 'error')
      );
    },

  };
}

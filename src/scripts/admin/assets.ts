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
          // umbralAdmin.api: CSRF, subpath del deploy y redirect en 401.
          const data = await window.umbralAdmin.api('POST', '/api/upload', fd);
          window.umbralAdmin.toast(this.l('msgAssetUploaded', { name: data.storedName, size: (data.bytes/1024).toFixed(1) }), 'success');
        } catch (err: unknown) {
          window.umbralAdmin.toast(file.name + ': ' + errMsg(err), 'error');
        }
      }
      await this.refreshAssets();
    },

    async deleteAsset(name: string) {
      if (!confirmAction(this.l('msgAssetConfirmDelete', { name }))) return;
      try {
        await window.umbralAdmin.api('DELETE', '/api/assets', { name });
        window.umbralAdmin.toast(this.l('msgAssetDeleted'), 'success');
        await this.refreshAssets();
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

    copyToClipboard(text: string) {
      navigator.clipboard?.writeText(text).then(
        () => window.umbralAdmin.toast(this.l('msgAssetUrlCopied'), 'success'),
        () => window.umbralAdmin.toast(this.l('msgAssetCopyFailed'), 'error')
      );
    },

  };
}

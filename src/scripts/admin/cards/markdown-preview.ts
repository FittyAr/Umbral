import { errMsg, type AdminFragment } from "../types";
import { escapeHtml, isFeatureListed } from './shared.ts';

/** Descripción en markdown del editor de cards (opt-in: features.markdown). */
export function createCardMarkdownState(): AdminFragment {
  return {
    // Markdown (opt-in: features.markdown). El toggle aparece en el
    // form sólo si la feature está activa. descriptionFormat default
    // a 'plain' para cards nuevos; el user puede flippearlo.
    markdownEnabled: isFeatureListed('markdown'),
    markdownPreview: '',
    markdownPreviewDirty: true,

    /** Input de la descripción: el form queda sucio y la preview vieja. */
    markDescriptionDirty() {
      this.cardFormDirty = true;
      this.markdownPreviewDirty = true;
    },
    /** Tokens aproximados de la descripción (~4 caracteres por token). */
    descriptionTokenEstimate() {
      return Math.round((this.editingCard?.description || '').length / 4);
    },

    // El form tiene maxlength dinámico según descriptionFormat:
    // 200 para plain, 1000 para markdown. Cuando la feature está
    // apagada, forzamos plain en el toggle y siempre 200.
    descMaxLength() {
      if (!this.markdownEnabled) return 200;
      return this.editingCard?.descriptionFormat === 'markdown' ? 1000 : 200;
    },
    // Cuando el user cambia el toggle, el maxlength se actualiza vía
    // :maxlength="descMaxLength()" automáticamente. Pero si el contenido
    // actual excede el nuevo límite, no lo cortamos (al guardar el
    // server clampea). Sólo notamos que hay preview dirty.
    updateDescriptionLimit() {
      this.markdownPreviewDirty = true;
      this.refreshMarkdownPreview();
    },
    // Render markdown client-side usando las mismas libs que el server
    // (marked + DOMPurify) para que la preview matche el resultado
    // final. Si la feature está apagada, no se llama (la UI no muestra
    // el preview).
    async refreshMarkdownPreview() {
      if (!this.markdownEnabled) { this.markdownPreview = ''; return; }
      if (this.editingCard?.descriptionFormat !== 'markdown') { this.markdownPreview = ''; return; }
      const desc = this.editingCard?.description || '';
      if (!desc) { this.markdownPreview = ''; return; }
      try {
        const res = await window.umbralAdmin.api('POST', '/api/markdown/render', { text: desc });
        this.markdownPreview = res.html || '';
        this.markdownPreviewDirty = false;
      } catch (e: unknown) {
        // El preview se pinta con x-html: el mensaje (que viene del server o
        // de la red) se escapa en vez de concatenarse como HTML.
        this.markdownPreview = '<em style="color:#fca5a5">Error al renderizar preview: ' + escapeHtml(errMsg(e)) + '</em>';
      }
    },
  };
}

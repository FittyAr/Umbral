import { errMsg, type AdminFragment } from "../types";
import { isDefaultCardTitle } from './shared.ts';

/**
 * Auto-completado del editor de cards desde la URL o el nombre
 * (/api/fetch-card-info + /api/upload-from-url para el ícono).
 */
export function createCardAutofillState(): AdminFragment {
  return {
    autofillBusy: false,

    // Auto-completar el form desde la URL o el nombre. Pide a
    // /api/fetch-card-info que scrapea el <head> del sitio y, si no
    // encuentra nada útil, hace fallback a búsqueda externa
    // (Brave/Tavily si hay key, Wikipedia + DuckDuckGo siempre).
    // Sólo sobreescribe campos VACÍOS — no pisa lo que el user ya escribió.
    async autofillFromUrl() {
      if (!this.editingCard?.url && !this.editingCard?.title) return;
      const url = this.editingCard.url;
      const name = this.editingCard.title;
      // Si hay URL, sólo la mandamos si parece http(s) o path interno.
      // Si no, mandamos sólo el name.
      const params = new URLSearchParams();
      if (url && /^https?:\/\//.test(url)) params.set('url', url);
      if (name && name.trim()) params.set('name', name.trim());
      if (!params.toString()) return;
      this.autofillBusy = true;
      try {
        let data;
        try {
          data = await window.umbralAdmin.api('GET', `/api/fetch-card-info?${params.toString()}`);
        } catch (e: unknown) {
          window.umbralAdmin.toast(errMsg(e), 'error');
          return;
        }
        let filled = 0;
        if (data.title && (!this.editingCard.title || this.isDefaultCardTitle(this.editingCard.title) || this.editingCard.title.trim() === '')) {
          this.editingCard.title = data.title; filled++;
        }
        if (data.description && !this.editingCard.description) {
          this.editingCard.description = data.description; filled++;
        }
        // La imagen: si vino una, la subimos como asset vía el endpoint
        // /api/upload-from-url (que hace el download server-side, evitando
        // el CSP `connect-src 'self'` del browser). Si falla, no tocamos
        // el ícono — la card queda sin imagen pero con title/description.
        if (data.image) {
          try {
            // BUGFIX (4xx limpio, no más 502 en consola): /api/upload-from-url
            // devuelve 200 con {ok:false, reason:'not_found'} cuando el
            // origen responde 4xx (ej: 404 por favicon inexistente, 403 por
            // hotlink protection).
            const up = await window.umbralAdmin.api('POST', '/api/upload-from-url', { url: data.image, kind: 'icon' });
            if (up.ok && up.url) {
              this.editingCard.icon = up.url; filled++;
            } else {
              console.warn('[umbral] upload-from-url skipped:', up.reason || 'unknown');
            }
          } catch (err) {
            console.warn('[umbral] upload-from-url error:', err);
          }
        }
        const sourceLabel = ({ scrape: this.l('msgCardsSourceScrape'), brave: 'Brave', tavily: 'Tavily', wikipedia: 'Wikipedia', duckduckgo: 'DuckDuckGo', none: this.l('msgCardsSourceNone') } as Record<string, string>)[data.source] || data.source;
        if (filled > 0) {
          window.umbralAdmin.toast(this.l('msgCardsAutofillFilled', { n: filled, source: sourceLabel }), 'success');
        } else {
          window.umbralAdmin.toast(this.l('msgCardsAutofillEmpty', { source: sourceLabel }), 'info');
        }
        this.markDirty();
      } catch (err: unknown) {
        window.umbralAdmin.toast(this.l('toastError', { message: errMsg(err) }), 'error');
      } finally {
        this.autofillBusy = false;
      }
    },
    /** El título que pone `addCard()`: el traducido o el histórico en español. */
    isDefaultCardTitle(title: string | undefined) {
      return isDefaultCardTitle(title, this.l('cardsNewLabel'));
    },
    // Disparado en blur del input URL. Sólo auto-completar si el form
    // está prácticamente vacío (no pisar lo que el user ya tipeó).
    maybeAutofillFromUrl() {
      if (!this.editingCard?.url) return;
      const ec = this.editingCard;
      const isEmpty = (!ec.title || this.isDefaultCardTitle(ec.title) || !ec.title.trim())
        && !ec.description
        && (!ec.icon || ec.icon === this.availableIcons[0]);
      if (isEmpty) this.autofillFromUrl();
    },
  };
}

import type { AdminFragment } from "./types";
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio tokens.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createTokensState(): AdminFragment {
  return {
    // API Tokens (opt-in: features.apiTokens)
    apiTokensEnabled: window.__featureList?.find?.((f) => f.name === 'apiTokens')?.enabled === true,
    newToken: { name: '', scope: 'read', expiresInDays: 0 },
    showTokenModal: false,
    generatedTokenPlain: '',
    async generateToken() {
      if (!this.newToken.name) return;
      try {
        const res = await window.umbralAdmin.api('POST', '/api/tokens', this.newToken);
        if (res.ok && res.token) {
          this.generatedTokenPlain = res.token;
          this.showTokenModal = true;
          if (!this.cfg.apiTokens) this.cfg.apiTokens = { items: [] };
          this.cfg.apiTokens.items.push(res.item);
          this.newToken = { name: '', scope: 'read', expiresInDays: 0 };
          window.umbralAdmin.toast('Token generado con éxito', 'success');
        }
      } catch (e) {
        window.umbralAdmin.toast(e.message, 'error');
      }
    },
    async revokeToken(id) {
      if (!confirmAction('¿Revocar este token API? Las integraciones que lo usen dejarán de funcionar.')) return;
      try {
        await window.umbralAdmin.api('DELETE', '/api/tokens', { id });
        if (this.cfg.apiTokens?.items) {
          this.cfg.apiTokens.items = this.cfg.apiTokens.items.filter((t) => t.id !== id);
        }
        window.umbralAdmin.toast('Token revocado', 'success');
      } catch (e) {
        window.umbralAdmin.toast(e.message, 'error');
      }
    },
  };
}

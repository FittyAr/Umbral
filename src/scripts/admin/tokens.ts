import { errMsg, type AdminFragment, type FeatureListItem, type AdminApiToken } from "./types";
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
    apiTokensEnabled: window.__featureList?.find?.((f: FeatureListItem) => f.name === 'apiTokens')?.enabled === true,
    newToken: { name: '', scope: 'read', expiresInDays: 0 },
    showTokenModal: false,
    generatedTokenPlain: '',
    /** Copia el token recién generado y avisa con `copiedMsg`. */
    copyGeneratedToken(copiedMsg: string) {
      navigator.clipboard.writeText(this.generatedTokenPlain);
      window.umbralAdmin.toast(copiedMsg, 'info');
    },
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
          window.umbralAdmin.toast(this.l('msgTokenGenerated'), 'success');
        }
      } catch (e: unknown) {
        window.umbralAdmin.toast(errMsg(e), 'error');
      }
    },
    async revokeToken(id: string) {
      if (!confirmAction(this.l('msgTokenConfirmRevoke'))) return;
      try {
        await window.umbralAdmin.api('DELETE', '/api/tokens', { id });
        if (this.cfg.apiTokens?.items) {
          this.cfg.apiTokens.items = this.cfg.apiTokens.items.filter((t: AdminApiToken) => t.id !== id);
        }
        window.umbralAdmin.toast(this.l('msgTokenRevoked'), 'success');
      } catch (e: unknown) {
        window.umbralAdmin.toast(errMsg(e), 'error');
      }
    },
  };
}

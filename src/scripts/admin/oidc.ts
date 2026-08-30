import type { AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio oidc.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createOidcState(): AdminFragment {
  return {
    // OIDC (opt-in: features.oidc)
    oidcEnabled: window.__featureList?.find?.((f) => f.name === 'oidc')?.enabled === true,
    newOidc: { id: '', name: '', issuer: '', clientId: '', clientSecret: '', scopes: 'openid profile email', defaultRole: 'viewer', autoProvision: false },
    addOidcProvider() {
      if (!this.cfg.oidc) this.cfg.oidc = { providers: [] };
      if (!Array.isArray(this.cfg.oidc.providers)) this.cfg.oidc.providers = [];
      const o = this.newOidc;
      if (!o.name || !o.id || !o.issuer || !o.clientId || !o.clientSecret) {
        window.umbralAdmin.toast('Completá todos los campos obligatorios del provider', 'error');
        return;
      }
      this.cfg.oidc.providers.push({
        id: o.id.trim(),
        name: o.name.trim(),
        issuer: o.issuer.trim(),
        clientId: o.clientId.trim(),
        clientSecret: o.clientSecret.trim(),
        scopes: (o.scopes || 'openid profile email').split(' ').filter(Boolean),
        redirectPath: '/',
        autoProvision: Boolean(o.autoProvision),
        defaultRole: o.defaultRole || 'viewer',
        enabled: true,
      });
      this.newOidc = { id: '', name: '', issuer: '', clientId: '', clientSecret: '', scopes: 'openid profile email', defaultRole: 'viewer', autoProvision: false };
      this.markDirty();
      window.umbralAdmin.toast('Provider OIDC agregado', 'success');
    },
    removeOidcProvider(idx) {
      if (!this.cfg.oidc?.providers) return;
      this.cfg.oidc.providers.splice(idx, 1);
      this.markDirty();
      window.umbralAdmin.toast('Provider OIDC eliminado', 'success');
    },
  };
}

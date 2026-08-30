import type { AdminFragment } from "./types";
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio totp.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createTotpState(): AdminFragment {
  return {
    // TOTP 2FA (opt-in: features.totp2fa)
    totpEnabled: window.__featureList?.find?.((f) => f.name === 'totp2fa')?.enabled === true,
    showTotpSetupModal: false,
    totpSetupUser: null,
    totpSetupData: null,
    totpVerificationCode: '',
    totpSaving: false,
    async openTotpSetup(u) {
      try {
        const data = await window.umbralAdmin.api('POST', '/api/auth/totp/setup', { userId: u.id });
        this.totpSetupUser = u;
        this.totpSetupData = data;
        this.totpVerificationCode = '';
        this.showTotpSetupModal = true;
      } catch (e) {
        window.umbralAdmin.toast('Error generando 2FA: ' + e.message, 'error');
      }
    },
    async verifyAndSaveTotp() {
      if (!this.totpSetupUser || !this.totpSetupData || !this.totpVerificationCode) return;
      this.totpSaving = true;
      try {
        await window.umbralAdmin.api('POST', '/api/auth/totp/verify', {
          userId: this.totpSetupUser.id,
          secret: this.totpSetupData.secret,
          code: this.totpVerificationCode,
        });
        this.totpSetupUser.totpSecret = 'active';
        this.showTotpSetupModal = false;
        window.umbralAdmin.toast('2FA activado con éxito para ' + this.totpSetupUser.username, 'success');
      } catch (e) {
        window.umbralAdmin.toast(e.message, 'error');
      } finally {
        this.totpSaving = false;
      }
    },
    async disableTotp(u) {
      if (!confirmAction(`¿Desactivar 2FA para ${u.username}?`)) return;
      try {
        await window.umbralAdmin.api('POST', '/api/auth/totp/disable', { userId: u.id });
        u.totpSecret = null;
        window.umbralAdmin.toast('2FA desactivado', 'success');
      } catch (e) {
        window.umbralAdmin.toast(e.message, 'error');
      }
    },
  };
}

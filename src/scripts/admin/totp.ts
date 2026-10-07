import { errMsg, type AdminFragment, type FeatureListItem, type AdminUser } from "./types";
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
    totpEnabled: window.__featureList?.find?.((f: FeatureListItem) => f.name === 'totp2fa')?.enabled === true,
    showTotpSetupModal: false,
    totpSetupUser: null,
    totpSetupData: null,
    totpVerificationCode: '',
    totpSaving: false,
    async openTotpSetup(u: AdminUser) {
      try {
        const data = await window.umbralAdmin.api('POST', '/api/auth/totp/setup', { userId: u.id });
        this.totpSetupUser = u;
        this.totpSetupData = data;
        this.totpVerificationCode = '';
        this.showTotpSetupModal = true;
      } catch (e: unknown) {
        window.umbralAdmin.toast(this.l('msgTotpGenerateError', { message: errMsg(e) }), 'error');
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
        window.umbralAdmin.toast(this.l('msgTotpEnabled', { user: this.totpSetupUser.username }), 'success');
      } catch (e: unknown) {
        window.umbralAdmin.toast(errMsg(e), 'error');
      } finally {
        this.totpSaving = false;
      }
    },
    async disableTotp(u: AdminUser) {
      if (!confirmAction(this.l('msgTotpConfirmDisable', { user: u.username }))) return;
      try {
        await window.umbralAdmin.api('POST', '/api/auth/totp/disable', { userId: u.id });
        u.totpSecret = null;
        window.umbralAdmin.toast(this.l('msgTotpDisabled'), 'success');
      } catch (e: unknown) {
        window.umbralAdmin.toast(errMsg(e), 'error');
      }
    },
  };
}

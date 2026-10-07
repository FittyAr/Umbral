import { errMsg, type AdminFragment } from "./types";

/**
 * Fragmento del objeto Alpine del admin: dominio password.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createPasswordState(): AdminFragment {
  return {
    pwForm: { current: '', next: '', confirm: '' },
    // Features section labels (i18n top-level)
    async changePassword() {
      if (this.pwForm.next !== this.pwForm.confirm) {
        window.umbralAdmin.toast(this.l('msgPasswordMismatch'), 'error');
        return;
      }
      try {
        const data = await window.umbralAdmin.api('POST', '/api/password', {
          currentPassword: this.pwForm.current,
          newPassword: this.pwForm.next,
        });
        if (data && data.csrfToken) {
          window.umbralAdmin.csrf = data.csrfToken;
          document.body.dataset.csrf = data.csrfToken;
          // El panel de Seguridad muestra el token desde el estado de Alpine.
          this.csrfToken = data.csrfToken;
        }
        this.pwForm = { current: '', next: '', confirm: '' };
        window.umbralAdmin.toast(this.l('msgPasswordChanged'), 'success');
      } catch (e: unknown) { window.umbralAdmin.toast(errMsg(e), 'error'); }
    },

    // Banner rojo si el password actual es uno de los default inseguros.
    // Inyecta un div.alert arriba del header del admin. Se cierra con
    // un click y se persiste en sessionStorage (para que no aparezca
    // en cada refresh mientras el admin está cambiando el password).
    showDefaultPasswordBanner() {
      if (typeof window === 'undefined') return;
      if (sessionStorage.getItem('umbral_pwd_warning_dismissed') === '1') return;
      const existing = document.getElementById('umbral-pwd-warning');
      if (existing) return;
      const div = document.createElement('div');
      div.id = 'umbral-pwd-warning';
      div.setAttribute('role', 'alert');
      div.style.cssText = 'background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: #fff; padding: 0.75rem 1rem; border-bottom: 2px solid #fca5a5; display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: 0.9rem;';
      // Armado con nodos y textContent: los textos vienen del catálogo
      // traducido y no deben interpretarse como HTML.
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = '⚠ ' + this.l('msgPwdWarnTitle');
      span.append(strong, ' \u2014 ' + this.l('msgPwdWarnBody') + ' ');
      const a = document.createElement('a');
      a.href = '#';
      a.id = 'umbral-pwd-warning-link';
      a.style.cssText = 'color:#fde68a;text-decoration:underline;margin-left:0.5rem';
      a.textContent = this.l('msgPwdWarnLink');
      span.append(a);
      const btn = document.createElement('button');
      btn.id = 'umbral-pwd-warning-close';
      btn.type = 'button';
      btn.style.cssText = 'background:transparent;border:1px solid #fca5a5;color:#fff;padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.85rem';
      btn.textContent = this.l('msgPwdWarnClose');
      div.append(span, btn);
      // Insert at the top of the admin-wrap
      const wrap = document.querySelector('.admin-wrap');
      if (wrap && wrap.firstChild) wrap.insertBefore(div, wrap.firstChild);
      // Click en "Cambiarlo ahora" → tab=security
      const link = document.getElementById('umbral-pwd-warning-link');
      if (link) link.addEventListener('click', (e) => {
        e.preventDefault();
        this.tab = 'security';
        div.remove();
        sessionStorage.setItem('umbral_pwd_warning_dismissed', '1');
      });
      // Click en cerrar
      const close = document.getElementById('umbral-pwd-warning-close');
      if (close) close.addEventListener('click', () => {
        div.remove();
        sessionStorage.setItem('umbral_pwd_warning_dismissed', '1');
      });
    },
  };
}

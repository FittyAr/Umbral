/**
 * Helpers globales del admin (`window.umbralAdmin`): fetch de la API con
 * CSRF, trap de foco para modales y toasts. Antes era un script inline del
 * AdminLayout; como módulo no necesita 'unsafe-inline' en la CSP.
 *
 * El CSRF sale del `data-csrf` del <body> y la base de `window.__BASE_URL__`
 * (public/js/boot.js, que corre antes que cualquier módulo). Lo importan el
 * layout y el dashboard: un módulo se evalúa una sola vez aunque lo importen
 * dos scripts, y así el dashboard lo tiene listo antes de `Alpine.start()`.
 */

type ApiError = Error & { status?: number; data?: unknown };

interface ApiOptions {
  /** Devuelve el Response sin parsear (para SVG/blobs). */
  raw?: boolean;
  /** Headers extra (ej: if-match). */
  headers?: Record<string, string>;
}

const umbralAdmin = {
  csrf: document.body.dataset.csrf || '',
  baseUrl: (window.__BASE_URL__ as string | undefined) || '/',
  // Versión del config (`_meta.updatedAt`) que este panel editó. Se
  // actualiza con el header `x-config-version` de cada respuesta y se
  // manda como If-Match al guardar (409 si otra pestaña guardó antes).
  configVersion: null as string | null,

  /** fetch de la API: base URL, CSRF, JSON y errores. */
  async api(method: string, endpoint: string, body?: unknown, opts: ApiOptions = {}) {
    const targetUrl = new URL(
      endpoint.startsWith('http')
        ? endpoint
        : this.baseUrl + (endpoint.startsWith('/') ? endpoint.slice(1) : endpoint),
      window.location.href,
    );
    const headers: Record<string, string> = { ...(opts.headers || {}) };
    // El CSRF sólo viaja al propio origen: nunca a un endpoint absoluto
    // de otro host. Lo mismo el portal que se está editando
    // (multi-portal): la API resuelve el config de ese portal.
    if (targetUrl.origin === window.location.origin) {
      headers['x-csrf-token'] = this.csrf;
      if (window.__UMBRAL_PORTAL__) headers['x-umbral-portal'] = window.__UMBRAL_PORTAL__;
    }
    let b: BodyInit | undefined;
    if (body && !(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
      b = JSON.stringify(body);
    } else if (body) {
      b = body as BodyInit;
    }
    const res = await fetch(targetUrl.toString(), { method, headers, body: b });
    const version = res.headers.get('x-config-version');
    if (version) this.configVersion = version;
    if (res.status === 401 && targetUrl.origin === window.location.origin) {
      // Sesión vencida o revocada: al login, en vez de fallar en silencio.
      window.location.href = this.baseUrl + 'admin';
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const err: ApiError = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    if (opts.raw) return res;
    return res.json().catch(() => ({}));
  },

  /**
   * Atrapa el foco dentro de un modal: foco inicial en el primer
   * control, Tab/Shift+Tab ciclan adentro, y al sacar el modal del DOM
   * el foco vuelve a donde estaba.
   */
  trapFocus(el: HTMLElement | null | undefined) {
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(selector)).filter((n) => n.offsetParent !== null);
    const first = focusables()[0];
    (first || el).focus({ preventScroll: true });
    if (!first) el.setAttribute('tabindex', '-1');
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const head = items[0];
      const tail = items[items.length - 1];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    });
    const observer = new MutationObserver(() => {
      if (el.isConnected) return;
      observer.disconnect();
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  toast(message: string, type = 'info') {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    host.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3500);
  },
};

window.umbralAdmin = umbralAdmin;

// Logout desde cualquier botón con data-action="logout".
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (target instanceof Element && target.closest('[data-action="logout"]')) {
    await umbralAdmin.api('POST', '/api/logout').catch(() => {});
    window.location.href = umbralAdmin.baseUrl + 'admin';
  }
});

export {};

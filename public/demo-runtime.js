/**
 * Umbral Demo Runtime Interceptor for GitHub Pages
 * Simulates the backend in localStorage with automatic 15-minute reset.
 */
(function () {
  const STORAGE_KEY = 'umbral_demo_config';
  const STORAGE_TS_KEY = 'umbral_demo_ts';
  const TTL_MS = 15 * 60 * 1000; // 15 minutos

  // Cargar o Inicializar Configuración
  function getInitialConfig() {
    return window.__INITIAL_DEMO_CONFIG__ || null;
  }

  function getStoredConfig() {
    try {
      const ts = Number(localStorage.getItem(STORAGE_TS_KEY) || 0);
      if (ts && Date.now() - ts > TTL_MS) {
        // Expiró el TTL -> Reset
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TS_KEY);
        return null;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveStoredConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    } catch (e) {
      console.warn('[Demo] Could not save to localStorage', e);
    }
  }

  function resetStoredConfig() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TS_KEY);
      const init = getInitialConfig();
      if (init) saveStoredConfig(init);
    } catch (e) {
      console.warn('[Demo] Could not reset', e);
    }
  }

  // Interceptar window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const method = (init && init.method ? init.method : 'GET').toUpperCase();

    // 1. GET /api/config
    if (url.endsWith('/api/config') && method === 'GET') {
      const cfg = getStoredConfig() || getInitialConfig();
      return new Response(JSON.stringify(cfg), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. PUT /api/config
    if (url.endsWith('/api/config') && method === 'PUT') {
      let body;
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
      } catch {
        return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
      }
      const current = getStoredConfig() || getInitialConfig() || {};
      const updated = { ...current, ...body };
      saveStoredConfig(updated);
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. DELETE /api/config (Reset)
    if (url.endsWith('/api/config') && method === 'DELETE') {
      resetStoredConfig();
      const init = getInitialConfig();
      return new Response(JSON.stringify(init), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. POST /api/login
    if (url.endsWith('/api/login') && method === 'POST') {
      return new Response(JSON.stringify({ ok: true, message: 'Autenticado en modo demo' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. GET /api/health
    if (url.endsWith('/api/health') && method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          uptime: 14285.7,
          mode: 'github-pages-demo',
          timestamp: Date.now(),
          nodeVersion: 'browser-wasm-mock',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 6. Password Change Block (Seguridad en Demo)
    if (url.includes('/api/auth/hash-password') || url.includes('/api/password')) {
      return new Response(
        JSON.stringify({
          error: '🔒 Modo Demo: Por seguridad, el cambio de contraseña está deshabilitado en esta muestra pública.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 7. Upload Asset Block (Seguridad en Demo)
    if (url.includes('/api/assets/upload') || url.includes('/api/assets')) {
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        return new Response(
          JSON.stringify({
            error: '🔒 Modo Demo: La subida de archivos al servidor está deshabilitada en esta muestra. Podés usar URLs externas o los íconos integrados.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // 8. Icon Packs mock
    if (url.endsWith('/api/icon-packs') && method === 'GET') {
      return new Response(
        JSON.stringify({
          packs: [
            { id: 'simple-icons', name: 'Simple Icons', description: '3.100+ marcas y logos', repoUrl: 'https://github.com/simple-icons/simple-icons', license: 'CC0 1.0', author: 'Simple Icons', estimatedCount: '3.100+', installed: true, installedCount: 3100 },
            { id: 'dashboard-icons', name: 'Dashboard Icons', description: '1.000+ homelab y self-hosted', repoUrl: 'https://github.com/walkxcode/dashboard-icons', license: 'MIT', author: 'Walkx', estimatedCount: '1.000+', installed: true, installedCount: 1000 },
            { id: 'lucide', name: 'Lucide Icons', description: '1.500+ iconos limpios', repoUrl: 'https://github.com/lucide-icons/lucide', license: 'ISC', author: 'Lucide', estimatedCount: '1.500+', installed: true, installedCount: 1500 },
            { id: 'tabler-icons', name: 'Tabler Icons', description: '5.800+ iconos de UI', repoUrl: 'https://github.com/tabler/tabler-icons', license: 'MIT', author: 'Tabler', estimatedCount: '5.800+', installed: true, installedCount: 5800 },
          ],
          totalInstalledIcons: 11400,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Passthrough para assets estáticos y otros requests
    return originalFetch.apply(this, arguments);
  };

  // Crear banner de demostración en la parte superior
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('umbral-demo-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'umbral-demo-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(6, 182, 212, 0.4);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(6, 182, 212, 0.2);
      backdrop-filter: blur(12px);
      padding: 0.65rem 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #f8fafc;
      font-size: 0.8rem;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.4rem">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#06b6d4;box-shadow:0 0 8px #06b6d4"></span>
        <span style="font-weight:600;color:#06b6d4">Modo Demo</span>
        <span style="color:#94a3b8;font-size:0.75rem">| Persistencia local (15 min)</span>
      </div>
      <button id="umbral-demo-reset-btn" style="
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #f8fafc;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.2s ease;
      ">Restablecer Demo</button>
    `;

    document.body.appendChild(banner);

    const resetBtn = document.getElementById('umbral-demo-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetStoredConfig();
        location.reload();
      });
      resetBtn.addEventListener('mouseenter', () => {
        resetBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        resetBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        resetBtn.style.color = '#ef4444';
      });
      resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        resetBtn.style.color = '#f8fafc';
      });
    }
  });
})();

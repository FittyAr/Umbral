/**
 * Umbral Demo Runtime Interceptor for GitHub Pages
 *
 * Se carga como un <script src="demo-runtime.js"> en el HTML público y
 * del admin. Intercepta `window.fetch` y responde a todas las rutas
 * /api/* con datos simulados persistidos en localStorage. No toca el
 * server real — todo vive en el browser del visitante.
 *
 * Características:
 *  - TTL de 15 min para la config guardada (auto-reset al refrescar).
 *  - Sembrado con entradas de auditoría "realistas" para que el visor
 *    no aparezca vacío en la primera visita.
 *  - Mock de sparklines/métricas para evitar 404 en /api/metrics.
 *  - QR simulado en SVG (la generación real requiere backend Node.js).
 *  - Bloqueo de cambios persistentes (password, uploads) con mensajes
 *    explicativos "🔒 Modo Demo".
 *  - Banner flotante en la esquina inferior derecha con botón de reset.
 *  - Desactiva por default las features pesadas en el seed inicial
 *    (AI, status, iconPacks) — el usuario puede encenderlas desde la UI.
 *  - Marca `window.__UMBRAL_DEMO__ = true` para que el dashboard
 *    pueda saltear el chequeo de auth y mostrar banners de demo.
 */
(function () {
  // Marca global de modo demo. El layout/dashboard la lee para
  // condicionar UI (auth bypass, banners, etc).
  window.__UMBRAL_DEMO__ = true;

  const STORAGE_KEY = 'umbral_demo_config';
  const STORAGE_TS_KEY = 'umbral_demo_ts';
  const STORAGE_AUDIT_KEY = 'umbral_demo_audit';
  const STORAGE_PACKS_KEY = 'umbral_demo_icon_packs';
  const STORAGE_TOKENS_KEY = 'umbral_demo_tokens';
  const TTL_MS = 15 * 60 * 1000; // 15 minutos

  // Features que el demo debe apagar por default. El usuario puede
  // encenderlas desde el tab Avanzado → Features; si lo hace se
  // persisten en localStorage y respetan su elección hasta el TTL.
  // (ai, status, iconPacks y qr son las "pesadas" — generan ruido en
  // la demo y/o requieren backend real.)
  const DEMO_FORCE_DISABLE_FEATURES = ['ai', 'status', 'iconPacks', 'qr'];

  function getInitialConfig() {
    return window.__INITIAL_DEMO_CONFIG__ || null;
  }

  /**
   * Aplica el override de demo sobre la config inicial: fuerza apagadas
   * las features pesadas. Sólo se aplica cuando el usuario todavía no
   * tiene config guardada (es decir, en el primer load o después de un
   * reset). Una vez que el usuario interactúa y guarda algo, sus
   * decisiones mandan — esto evita pisar elecciones explícitas.
   */
  function getDemoSeed() {
    const init = getInitialConfig();
    if (!init) return null;
    const cfg = JSON.parse(JSON.stringify(init));
    if (!cfg.features) cfg.features = {};
    for (const name of DEMO_FORCE_DISABLE_FEATURES) {
      if (!cfg.features[name]) cfg.features[name] = { enabled: false };
      else cfg.features[name].enabled = false;
    }
    // Asegurar que la sección apiTokens existe (el dashboard la lee).
    if (!cfg.apiTokens) cfg.apiTokens = { items: [] };
    return cfg;
  }

  function getStoredConfig() {
    try {
      const ts = Number(localStorage.getItem(STORAGE_TS_KEY) || 0);
      if (ts && Date.now() - ts > TTL_MS) {
        resetStoredConfig();
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
      localStorage.removeItem(STORAGE_AUDIT_KEY);
      localStorage.removeItem(STORAGE_PACKS_KEY);
      localStorage.removeItem(STORAGE_TOKENS_KEY);
      const init = getDemoSeed();
      if (init) saveStoredConfig(init);
    } catch (e) {
      console.warn('[Demo] Could not reset', e);
    }
  }

  // ── Audit Log Mock Storage ─────────────────────────────────
  function getStoredAuditLog() {
    try {
      const raw = localStorage.getItem(STORAGE_AUDIT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Seed con entradas realistas
    const now = Date.now();
    const initialLog = [
      { ts: new Date(now - 1000 * 60 * 18).toISOString(), action: 'login_ok', detail: 'ip=192.168.1.100 user=admin' },
      { ts: new Date(now - 1000 * 60 * 15).toISOString(), action: 'config_update', detail: 'branding: companyName="Umbral Portal"' },
      { ts: new Date(now - 1000 * 60 * 12).toISOString(), action: 'feature_toggle', detail: 'features.metrics: false→true' },
      { ts: new Date(now - 1000 * 60 * 8).toISOString(), action: 'service_check', detail: 'chequeados=14 ok=14 fallidos=0 latencia_promedio=22ms' },
      { ts: new Date(now - 1000 * 60 * 3).toISOString(), action: 'config_update', detail: 'categories: orden y visibilidad actualizados' },
    ];
    try {
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(initialLog));
    } catch {}
    return initialLog;
  }

  function logAudit(action, detail) {
    try {
      const log = getStoredAuditLog();
      log.unshift({
        ts: new Date().toISOString(),
        action: String(action || 'action'),
        detail: String(detail || ''),
      });
      if (log.length > 500) log.length = 500;
      localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(log));
    } catch (e) {
      console.warn('[Demo] Could not write to audit log', e);
    }
  }

  // ── Icon Packs Mock Storage ────────────────────────────────
  const DEFAULT_PACKS = [
    {
      id: 'simple-icons',
      name: 'Simple Icons',
      description: '3.100+ marcas, tecnologías y servicios web',
      repoUrl: 'https://github.com/simple-icons/simple-icons',
      license: 'CC0 1.0',
      author: 'Simple Icons',
      estimatedCount: '3.100+',
      estimatedCountNum: 3100,
      installed: false,
      installedCount: 0,
    },
    {
      id: 'dashboard-icons',
      name: 'Dashboard Icons',
      description: '1.000+ aplicaciones homelab y self-hosted',
      repoUrl: 'https://github.com/walkxcode/dashboard-icons',
      license: 'MIT',
      author: 'Walkx',
      estimatedCount: '1.000+',
      estimatedCountNum: 1000,
      installed: false,
      installedCount: 0,
    },
    {
      id: 'lucide',
      name: 'Lucide Icons',
      description: '1.500+ íconos limpios y consistentes de UI',
      repoUrl: 'https://github.com/lucide-icons/lucide',
      license: 'ISC',
      author: 'Lucide',
      estimatedCount: '1.500+',
      estimatedCountNum: 1500,
      installed: false,
      installedCount: 0,
    },
    {
      id: 'tabler-icons',
      name: 'Tabler Icons',
      description: '5.800+ íconos vectoriales modernos de alta resolución',
      repoUrl: 'https://github.com/tabler/tabler-icons',
      license: 'MIT',
      author: 'Tabler',
      estimatedCount: '5.800+',
      estimatedCountNum: 5800,
      installed: false,
      installedCount: 0,
    },
  ];

  function getStoredIconPacks() {
    try {
      const raw = localStorage.getItem(STORAGE_PACKS_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length > 0) return stored;
      }
    } catch {}
    try {
      localStorage.setItem(STORAGE_PACKS_KEY, JSON.stringify(DEFAULT_PACKS));
    } catch {}
    return DEFAULT_PACKS;
  }

  function saveStoredIconPacks(packs) {
    try {
      localStorage.setItem(STORAGE_PACKS_KEY, JSON.stringify(packs));
    } catch (e) {
      console.warn('[Demo] Could not save icon packs', e);
    }
  }

  // ── Tokens Mock Storage ────────────────────────────────────
  function getStoredTokens() {
    try {
      const raw = localStorage.getItem(STORAGE_TOKENS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveStoredTokens(tokens) {
    try {
      localStorage.setItem(STORAGE_TOKENS_KEY, JSON.stringify(tokens));
    } catch {}
  }

  // ── Generador de Sparkline SVG ─────────────────────────────
  function generateSparklineSvg(color = '#06b6d4') {
    const points = [
      [0, 15],
      [15, 12],
      [30, 8],
      [45, 14],
      [60, 6],
      [75, 10],
      [80, 8],
    ];
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20" viewBox="0 0 80 20" fill="none">
      <path d="${d}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="80" cy="8" r="2.5" fill="${color}" />
    </svg>`;
  }

  // ── Generador de QR SVG Mock ───────────────────────────────
  function generateQrSvg(text) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="#0f172a">
      <rect width="200" height="200" fill="#ffffff" rx="8" />
      <!-- Posicionadores QR -->
      <rect x="20" y="20" width="45" height="45" fill="#0f172a" rx="4" />
      <rect x="27" y="27" width="31" height="31" fill="#ffffff" rx="2" />
      <rect x="34" y="34" width="17" height="17" fill="#06b6d4" rx="2" />

      <rect x="135" y="20" width="45" height="45" fill="#0f172a" rx="4" />
      <rect x="142" y="27" width="31" height="31" fill="#ffffff" rx="2" />
      <rect x="149" y="34" width="17" height="17" fill="#06b6d4" rx="2" />

      <rect x="20" y="135" width="45" height="45" fill="#0f172a" rx="4" />
      <rect x="27" y="142" width="31" height="31" fill="#ffffff" rx="2" />
      <rect x="34" y="149" width="17" height="17" fill="#06b6d4" rx="2" />

      <!-- Patrón de datos simulado -->
      <rect x="80" y="25" width="12" height="12" fill="#0f172a" />
      <rect x="100" y="25" width="12" height="12" fill="#0f172a" />
      <rect x="80" y="45" width="12" height="12" fill="#0f172a" />
      <rect x="100" y="55" width="12" height="12" fill="#06b6d4" />

      <rect x="25" y="80" width="12" height="12" fill="#0f172a" />
      <rect x="45" y="80" width="12" height="12" fill="#0f172a" />
      <rect x="75" y="80" width="12" height="12" fill="#0f172a" />
      <rect x="95" y="80" width="12" height="12" fill="#0f172a" />
      <rect x="120" y="80" width="12" height="12" fill="#06b6d4" />
      <rect x="145" y="80" width="12" height="12" fill="#0f172a" />
      <rect x="165" y="80" width="12" height="12" fill="#0f172a" />

      <rect x="75" y="105" width="12" height="12" fill="#0f172a" />
      <rect x="95" y="105" width="12" height="12" fill="#0f172a" />
      <rect x="135" y="105" width="12" height="12" fill="#0f172a" />
      <rect x="155" y="105" width="12" height="12" fill="#06b6d4" />

      <rect x="80" y="135" width="12" height="12" fill="#06b6d4" />
      <rect x="105" y="135" width="12" height="12" fill="#0f172a" />
      <rect x="135" y="135" width="12" height="12" fill="#0f172a" />
      <rect x="160" y="135" width="12" height="12" fill="#0f172a" />

      <rect x="80" y="160" width="12" height="12" fill="#0f172a" />
      <rect x="110" y="160" width="12" height="12" fill="#0f172a" />
      <rect x="140" y="160" width="12" height="12" fill="#06b6d4" />
    </svg>`;
  }

  // ── Interceptar window.fetch ───────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const rawUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const method = (init && init.method ? init.method : 'GET').toUpperCase();

    let urlPath = rawUrl;
    try {
      const parsed = new URL(rawUrl, window.location.href);
      urlPath = parsed.pathname + parsed.search;
    } catch {}

    // 1. GET /api/config
    if (urlPath.includes('/api/config') && method === 'GET') {
      const cfg = getStoredConfig() || getDemoSeed();
      return new Response(JSON.stringify(cfg), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. PUT /api/config
    if (urlPath.includes('/api/config') && method === 'PUT') {
      let body;
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
      } catch {
        return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
      }
      const current = getStoredConfig() || getDemoSeed() || {};
      const updated = { ...current, ...body };
      saveStoredConfig(updated);
      logAudit('config_update', 'Configuración general guardada en almacenamiento local');
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. DELETE /api/config (Reset)
    if (urlPath.includes('/api/config') && method === 'DELETE') {
      resetStoredConfig();
      const initCfg = getDemoSeed();
      logAudit('config_reset', 'Configuración restablecida a valores por defecto');
      return new Response(JSON.stringify(initCfg), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. POST /api/login
    if (urlPath.includes('/api/login') && method === 'POST') {
      logAudit('login_ok', 'Inicio de sesión exitoso (Modo Demo)');
      return new Response(JSON.stringify({ ok: true, message: 'Autenticado en modo demo' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. POST /api/logout
    if (urlPath.includes('/api/logout') && method === 'POST') {
      logAudit('logout', 'Cierre de sesión');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. GET /api/health
    if (urlPath.includes('/api/health') && method === 'GET') {
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

    // 7. GET /api/audit (Auditoría)
    if (urlPath.includes('/api/audit') && method === 'GET') {
      const urlObj = new URL(rawUrl, window.location.href);
      if (urlObj.searchParams.get('actions') === '1') {
        return new Response(
          JSON.stringify({
            actions: [
              'config_update',
              'config_reset',
              'feature_toggle',
              'icon_pack_install',
              'icon_pack_uninstall',
              'login_ok',
              'logout',
              'service_check',
              'token_created',
              'webhook_test',
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      let entries = getStoredAuditLog();
      const actionFilter = urlObj.searchParams.get('action');
      const detailFilter = urlObj.searchParams.get('detail');
      const fromFilter = urlObj.searchParams.get('from');
      const toFilter = urlObj.searchParams.get('to');
      const limit = Math.min(1000, Math.max(1, Number(urlObj.searchParams.get('limit')) || 200));

      if (actionFilter) {
        entries = entries.filter((e) => e.action === actionFilter);
      }
      if (detailFilter) {
        const q = detailFilter.toLowerCase();
        entries = entries.filter((e) => (e.detail || '').toLowerCase().includes(q));
      }
      if (fromFilter) {
        const fromTs = new Date(fromFilter).getTime();
        if (!isNaN(fromTs)) entries = entries.filter((e) => new Date(e.ts).getTime() >= fromTs);
      }
      if (toFilter) {
        const toTs = new Date(toFilter).getTime();
        if (!isNaN(toTs)) entries = entries.filter((e) => new Date(e.ts).getTime() <= toTs);
      }

      const totalLines = entries.length;
      const sliced = entries.slice(0, limit);

      return new Response(
        JSON.stringify({
          entries: sliced,
          totalLines,
          hasMore: totalLines > limit,
          path: 'data/audit.log',
          sizeBytes: totalLines * 80,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 8. GET /api/metrics (Métricas)
    if (urlPath.includes('/api/metrics') && method === 'GET') {
      const urlObj = new URL(rawUrl, window.location.href);
      const id = urlObj.searchParams.get('id');
      const svgOnly = urlObj.searchParams.get('svg') === '1';
      const summaryOnly = urlObj.searchParams.get('summary') === '1';

      if (svgOnly) {
        const svg = generateSparklineSvg('#06b6d4');
        return new Response(svg, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' },
        });
      }

      if (id) {
        if (summaryOnly) {
          return new Response(
            JSON.stringify({
              count: 120,
              avgMs: 24,
              maxMs: 82,
              p95Ms: 45,
              lastOk: true,
              lastTs: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        const now = Date.now();
        const samples = Array.from({ length: 30 }, (_, i) => ({
          ts: new Date(now - (30 - i) * 60000).toISOString(),
          latencyMs: Math.floor(Math.random() * 25 + 15),
          ok: true,
        }));
        return new Response(JSON.stringify({ cardId: id, samples }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const cfg = getStoredConfig() || getDemoSeed() || { cards: [] };
      const cards = (cfg.cards || []).map((c) => ({
        cardId: c.id,
        count: 60,
        avgMs: Math.floor(Math.random() * 25 + 15),
        maxMs: Math.floor(Math.random() * 40 + 55),
        p95Ms: Math.floor(Math.random() * 20 + 35),
        lastOk: true,
        lastTs: new Date().toISOString(),
      }));

      return new Response(JSON.stringify({ cards }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 9. POST /api/status (Status Diagnostics)
    if (urlPath.includes('/api/status') && method === 'POST') {
      let body = {};
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
      } catch {}
      const cfg = getStoredConfig() || getDemoSeed() || { cards: [] };
      const targetIds = Array.isArray(body.ids) ? new Set(body.ids) : null;
      const targets = (cfg.cards || []).filter((c) => c.enabled && (!targetIds || targetIds.has(c.id)));

      const results = targets.map((c) => ({
        id: c.id,
        url: c.url,
        ok: true,
        status: 200,
        latencyMs: Math.floor(Math.random() * 30 + 12),
      }));

      logAudit('service_check', `Diagnóstico ejecutado: ${results.length} servicios verificados con éxito (200 OK)`);

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 10. GET /api/icon-packs (Listar paquetes de íconos)
    if (urlPath.includes('/api/icon-packs') && method === 'GET') {
      const packs = getStoredIconPacks();
      const totalInstalledIcons = packs.reduce((acc, p) => acc + (p.installed ? (p.installedCount || p.estimatedCountNum || 0) : 0), 0);
      return new Response(
        JSON.stringify({
          packs,
          totalInstalledIcons,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 11. POST /api/icon-packs/uninstall (Desinstalar paquete de íconos)
    if (urlPath.includes('/api/icon-packs/uninstall') && method === 'POST') {
      let body = {};
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
      } catch {}
      const packId = body.packId;
      const packs = getStoredIconPacks().map((p) => {
        if (p.id === packId) {
          return { ...p, installed: false, installedCount: 0 };
        }
        return p;
      });
      saveStoredIconPacks(packs);
      logAudit('icon_pack_uninstall', `Paquete de íconos "${packId}" desinstalado`);
      return new Response(
        JSON.stringify({ ok: true, message: `Paquete "${packId}" desinstalado correctamente.` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 12. POST /api/icon-packs (Instalar paquete de íconos)
    if (urlPath.includes('/api/icon-packs') && method === 'POST') {
      let body = {};
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
      } catch {}
      const packId = body.packId;
      if (packId) {
        const packs = getStoredIconPacks().map((p) => {
          if (p.id === packId) {
            return { ...p, installed: true, installedCount: p.estimatedCountNum || 1000 };
          }
          return p;
        });
        saveStoredIconPacks(packs);
        logAudit('icon_pack_install', `Paquete de íconos "${packId}" instalado`);
        return new Response(
          JSON.stringify({ ok: true, message: `Paquete "${packId}" instalado correctamente.` }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      logAudit('icon_pack_install', `Íconos personalizados instalados desde repositorio Git`);
      return new Response(
        JSON.stringify({ ok: true, message: 'Íconos personalizados instalados en la biblioteca (modo demo).' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 13. GET /api/qr/... (Generación de código QR)
    // Devolvemos un QR SVG simulado. En el demo, /api/qr funciona
    // porque lo simulamos client-side; el "alert de desactivado" lo
    // maneja el dashboard forzando features.qr.enabled=false en el seed.
    if (urlPath.includes('/api/qr/')) {
      const urlObj = new URL(rawUrl, window.location.href);
      const text = urlObj.searchParams.get('text') || 'https://fitty.ar/Umbral';
      const svg = generateQrSvg(text);
      return new Response(svg, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // 14. POST /api/ai/format-card (Asistente IA)
    if (urlPath.includes('/api/ai/format-card') && method === 'POST') {
      let body = {};
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
      } catch {}
      logAudit('ai_format', `Formateo de tarjeta ejecutado con modelo IA`);
      return new Response(
        JSON.stringify({
          ok: true,
          formatted: {
            title: body.title ? `${body.title}` : 'Servicio Homelab',
            description: body.description ? `${body.description} — Optimizado con IA.` : 'Servicio en red local de alta disponibilidad.',
            icon: body.icon || 'sparkles',
            color: '#06b6d4',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 15. GET /api/fetch-card-info (Scraper de metadatos)
    if (urlPath.includes('/api/fetch-card-info') && method === 'GET') {
      const urlObj = new URL(rawUrl, window.location.href);
      const target = urlObj.searchParams.get('url') || '';
      return new Response(
        JSON.stringify({
          title: target.replace(/^https?:\/\//i, '').split('/')[0] || 'App Local',
          description: `Servicio alojado en ${target || 'red interna'}`,
          icon: 'globe',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 16. POST /api/webhooks/test (Prueba de Webhooks)
    if (urlPath.includes('/api/webhooks/test') && method === 'POST') {
      logAudit('webhook_test', 'Disparo de webhook de prueba (simulado en modo demo)');
      return new Response(
        JSON.stringify({ ok: true, message: 'Webhook de prueba enviado correctamente (simulado en modo demo).' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 17. GET /api/tokens y POST /api/tokens (Tokens API)
    if (urlPath.includes('/api/tokens')) {
      if (method === 'GET') {
        return new Response(JSON.stringify({ items: getStoredTokens() }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (method === 'POST') {
        let body = {};
        try {
          body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
        } catch {}
        const tokenStr = 'umb_demo_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const tokens = getStoredTokens();
        tokens.push({
          id: 'tok_' + Date.now(),
          name: body.name || 'Token Demo',
          tokenPrefix: tokenStr.slice(0, 12) + '…',
          scopes: body.scopes || ['read', 'write'],
          createdAt: new Date().toISOString(),
        });
        saveStoredTokens(tokens);
        logAudit('token_created', `Token de API "${body.name || 'Demo'}" creado`);
        return new Response(JSON.stringify({ ok: true, plaintextToken: tokenStr }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 18. POST /api/auth/totp/...
    if (urlPath.includes('/api/auth/totp/')) {
      const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(generateQrSvg())}`;
      return new Response(
        JSON.stringify({
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl: 'otpauth://totp/Umbral:admin?secret=JBSWY3DPEHPK3PXP&issuer=Umbral',
          qrDataUrl,
          backupCodes: ['DEMO-CODE-1', 'DEMO-CODE-2', 'DEMO-CODE-3'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 19. POST /api/locale (Cambio de idioma)
    if (urlPath.includes('/api/locale') && method === 'POST') {
      let body = {};
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {};
      } catch {}
      const loc = body.locale || 'es';
      try {
        localStorage.setItem('umbral_demo_locale', loc);
        document.cookie = `umbral_locale=${loc};path=/;max-age=2592000;SameSite=Lax`;
      } catch {}
      logAudit('locale_change', `Idioma cambiado a "${loc}"`);
      return new Response(JSON.stringify({ ok: true, locale: loc }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 20. GET /api/assets (Listar assets subidos)
    if (urlPath.includes('/api/assets') && (method === 'GET' || method === 'HEAD')) {
      return new Response(
        JSON.stringify({
          items: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 21. POST /api/auth/check-default-password (banner warning)
    if (urlPath.includes('/api/auth/check-default-password') && method === 'GET') {
      return new Response(JSON.stringify({ isDefault: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 22. POST /api/auth/hash-password (Password hashing)
    if (urlPath.includes('/api/auth/hash-password') && method === 'POST') {
      // Devolvemos un hash fake — no se persiste, es para el flujo client-side
      // del dashboard (multi-user). En el demo no importa que sea fake.
      let body = {};
      try { body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {}; } catch {}
      return new Response(
        JSON.stringify({ hash: '$2a$12$demodemodemodemodemodemodemodemodemodemodemo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 23. Password Change Block (Seguridad en Demo)
    if (urlPath.includes('/api/password') && method === 'POST') {
      return new Response(
        JSON.stringify({
          error: '🔒 Modo Demo: Por seguridad, el cambio de contraseña permanente está deshabilitado en esta muestra pública.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 24. Upload Asset Block (Seguridad en Demo)
    if (urlPath.includes('/api/upload')) {
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        return new Response(
          JSON.stringify({
            error: '🔒 Modo Demo: La subida de archivos al servidor está deshabilitada en esta muestra estática. Podés usar URLs externas o los íconos vectoriales integrados.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // 25. /api/import — Import config
    if (urlPath.includes('/api/import') && (method === 'PUT' || method === 'POST')) {
      let body = {};
      try { body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body || {}; } catch {}
      const current = getStoredConfig() || getDemoSeed() || {};
      const updated = { ...current, ...body };
      saveStoredConfig(updated);
      logAudit('config_import', 'Configuración importada desde archivo (modo demo)');
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 26. /api/upload-from-url (Asset fetch server-side, evita CSP)
    if (urlPath.includes('/api/upload-from-url') && method === 'POST') {
      return new Response(
        JSON.stringify({ ok: false, reason: 'demo-mode-disabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 27. /api/auth/oidc/.../start (OIDC redirect)
    if (urlPath.includes('/api/auth/oidc/') && method === 'GET') {
      return new Response(
        JSON.stringify({ error: '� Modo Demo: El SSO está deshabilitado. Configurá un provider en producción para habilitarlo.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Passthrough para assets estáticos y otros requests
    return originalFetch.apply(this, arguments);
  };

  // Crear banner de demostración interactivo
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('umbral-demo-banner')) return;

    const base = window.__BASE_URL__ || '/';
    const adminUrl = base.endsWith('/') ? `${base}admin` : `${base}/admin`;

    const banner = document.createElement('div');
    banner.id = 'umbral-demo-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(6, 182, 212, 0.45);
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.25);
      backdrop-filter: blur(14px);
      padding: 0.75rem 1.1rem;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 0.9rem;
      color: #f8fafc;
      font-size: 0.82rem;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: calc(100vw - 2rem);
      flex-wrap: wrap;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.45rem">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#06b6d4;box-shadow:0 0 10px #06b6d4;animation:pulse 2s infinite"></span>
        <span style="font-weight:700;color:#06b6d4;letter-spacing:0.3px">MODO DEMO</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.4rem;background:rgba(6, 182, 212, 0.12);border:1px solid rgba(6, 182, 212, 0.25);padding:0.25rem 0.6rem;border-radius:8px">
        <span style="color:#e2e8f0;font-size:0.78rem">🔑 Admin:</span>
        <a href="${adminUrl}" style="color:#38bdf8;font-weight:600;text-decoration:underline;text-underline-offset:2px">/admin</a>
        <span style="color:#94a3b8;font-size:0.75rem">(cualquier password)</span>
      </div>
      <button id="umbral-demo-reset-btn" title="Restablecer la configuración inicial de la demo" style="
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #f8fafc;
        padding: 0.3rem 0.65rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.76rem;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-left: auto;
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
        resetBtn.style.background = 'rgba(239, 68, 68, 0.25)';
        resetBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        resetBtn.style.color = '#ef4444';
      });
      resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.background = 'rgba(255, 255, 255, 0.08)';
        resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        resetBtn.style.color = '#f8fafc';
      });
    }
  });
})();

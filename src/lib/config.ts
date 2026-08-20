import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ConfigSchema, type Config, type ConfigUpdate } from './schema';
import { hashPassword, generateToken } from './auth';
import {
  portalConfigPath as _portalConfigPath,
  portalUploadsPath as _portalUploadsPath,
  portalAuditPath as _portalAuditPath,
  migrateLegacyToMultiPortal,
} from './multi-portal';
import { isFeatureEnabled } from './features';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Multi-portal (Ola 4.1): CONFIG_PATH / UPLOADS_DIR / AUDIT_LOG_PATH
// pueden ser por-portal. Mantenemos las constantes para compat con código
// legacy que las usa directamente — devuelven el path del portal "default"
// que es el comportamiento histórico (data/config.json, etc).
export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.log');

// portalId activo para este proceso. Default: 'default' (legacy single-
// portal mode). Se cambia en runtime por setActivePortalId() (vía
// middleware que matchea el request). Una sola instancia del server
// sirve un solo portal a la vez (los portales múltiples se sirven en
// paralelo con un reverse proxy que matchea el host y dispatcha a
// distintas instancias). Esta es la simplificación que hicimos para
// esta versión — un server = un portal activo. Para multi-portal
// real con un server único, se necesita un map in-memory de caches.
// (Ola 4.1) Portal activo para este proceso. Default: 'default' (legacy
// single-portal). Multi-portal mode: el middleware setea el portal id
// per-request vía setActivePortalId() antes de que el handler llame a
// getConfig(). En una sola instancia del server, se sirve un portal
// a la vez — para multi-portal real con dispatch en runtime, el proxy
// externo (nginx/Caddy/Traefik) rutea por host/pathPrefix a distintas
// instancias, o se usa una sola instancia con cache per-portal in-memory
// (v2 de esta feature, requiere refactor del cache a Map<portalId, Cache>).
let activePortalId = 'default';
export function setActivePortalId(id: string) { activePortalId = id; }
export function getActivePortalId() { return activePortalId; }

/** Defaults used to seed a brand-new config.json. */
function defaultConfig(): Config {
  return {
    version: 1,
    branding: {
      companyName: 'Nexus Cloud & DevOps',
      logo: null,
      favicon: null,
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(6, 182, 212, 0.18), rgba(15, 23, 42, 0.95)), #0b0f19',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000',
      },
      cardStyle: 'glass',
      accentColor: '#06b6d4',
      textColor: '#f8fafc',
      fontFamily: 'Inter',
      fontUrl: '',
      colorMode: 'dark',
      groupLayout: 'vertical',
      showClock: true,
      showRefresh: true,
      showStatusBar: true,
    },
    layout: {
      columnsDesktop: 4,
      columnsTablet: 2,
      columnsMobile: 1,
      cardSize: 'medium',
      showDescriptions: true,
      healthCheckInterval: 60,
    },
    security: {
      session: {
        ttlHours: 24,
        cookieSameSite: 'Lax',
        cookieSecure: 'auto',
        rotateCsrfOnLogin: false,
      },
      auth: {
        minPasswordLength: 0,
        rateLimitMax: 30,
        rateLimitWindowSec: 60,
        csrfPolicy: 'mutations',
      },
      uploads: {
        maxBytesLogo: 1 * 1024 * 1024,
        maxBytesFavicon: 256 * 1024,
        maxBytesIcon: 512 * 1024,
        maxBytesBackground: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'],
        allowSvg: true,
        sanitizeSvg: true,
        processImages: true,
      },
      network: {
        trustForwardedFor: false,
        trustedProxies: [],
        cookieDomain: null,
        allowInternalHosts: true,
      },
      headers: {
        csp:
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:;",
        xFrameOptions: 'DENY',
        referrerPolicy: 'no-referrer',
        permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
        hsts: 'auto',
        hstsMaxAge: 31536000,
        hstsIncludeSubDomains: false,
        hstsPreload: false,
      },
    },
    ai: {
      enabled: true,
      provider: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      systemPrompt: '',
      language: 'es',
    },
    externalSearch: {
      braveApiKey: '',
      tavilyApiKey: '',
    },
    features: {
      markdown: { enabled: true },
      tags: { enabled: true },
      pinned: { enabled: true },
      i18n: { enabled: true, locale: 'es' },
      presets: { enabled: true },
      auditLogViewer: { enabled: true },
      webhooks: { enabled: false },
      maintenanceWindows: { enabled: true },
      metrics: { enabled: true, persistToDisk: false, retentionHours: 24 },
      qr: { enabled: true },
      multiUser: { enabled: false },
      totp2fa: { enabled: false },
      oidc: { enabled: false },
      apiTokens: { enabled: true },
      multiPortal: { enabled: false },
      status: { enabled: true },
      ai: { enabled: true },
      iconPacks: { enabled: true },
    },
    portals: { defaultPortal: 'default', items: [] },
    oidc: { providers: [] },
    apiTokens: { items: [] },
    categories: [
      { id: 'ai', name: 'Inteligencia Artificial', icon: 'bot', isLocked: false, password: '', isSubpage: false },
      { id: 'devops', name: 'Desarrollo & CI/CD', icon: 'code', isLocked: false, password: '', isSubpage: false },
      { id: 'monitoring', name: 'Observabilidad & SysOps', icon: 'bar-chart-2', isLocked: false, password: '', isSubpage: false },
      { id: 'infra', name: 'Infraestructura & Redes', icon: 'cpu', isLocked: false, password: '', isSubpage: false },
      { id: 'cloud', name: 'Almacenamiento & Multimedia', icon: 'hard-drive', isLocked: false, password: '', isSubpage: false },
    ],
    cards: [
      {
        id: 'open-webui',
        title: 'Open WebUI',
        kind: 'link',
        description: 'Interfaz conversacional unificada para LLMs locales y remotos con soporte de agentes y RAG.',
        descriptionFormat: 'plain',
        url: 'http://192.168.1.50:8080',
        icon: 'bot',
        category: 'ai',
        enabled: true,
        order: 1,
        tags: ['ia', 'llm', 'rag'],
        pinned: true,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'dify-studio',
        title: 'Dify Studio',
        kind: 'link',
        description: 'Plataforma de desarrollo visual para flujos de agentes y orquestación de aplicaciones LLM.',
        descriptionFormat: 'plain',
        url: 'http://192.168.1.50:3000',
        icon: 'sparkles',
        category: 'ai',
        enabled: true,
        order: 2,
        tags: ['ia', 'agentes', 'workflows'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'comfyui',
        title: 'ComfyUI Node Graph',
        kind: 'link',
        description: 'Entorno modular basado en nodos para generación de imágenes y vídeo con difusión.',
        descriptionFormat: 'plain',
        url: 'http://192.168.1.50:8188',
        icon: 'sparkles',
        category: 'ai',
        enabled: true,
        order: 3,
        tags: ['ia', 'diffusion', 'gpu'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'ollama-server',
        title: 'Ollama Engine',
        kind: 'link',
        description: 'Servidor de inferencia local de alta velocidad para modelos open-weight (Llama 3, Qwen).',
        descriptionFormat: 'plain',
        url: 'http://192.168.1.50:11434',
        icon: 'cpu',
        category: 'ai',
        enabled: true,
        order: 4,
        tags: ['ia', 'local', 'api'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'gitlab-devops',
        title: 'GitLab CI/CD',
        kind: 'link',
        description: 'Control de versiones, pipelines de CI/CD automatizados y registro de paquetes.',
        descriptionFormat: 'plain',
        url: 'http://gitlab.internal.lan',
        icon: 'git-commit',
        category: 'devops',
        enabled: true,
        order: 1,
        tags: ['git', 'cicd', 'devops'],
        pinned: true,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'coolify-paas',
        title: 'Coolify Cloud PaaS',
        kind: 'link',
        description: 'Plataforma self-hosted para despliegue ágil de aplicaciones, microservicios y bases de datos.',
        descriptionFormat: 'plain',
        url: 'http://coolify.internal.lan:8000',
        icon: 'cpu',
        category: 'devops',
        enabled: true,
        order: 2,
        tags: ['paas', 'deploy', 'docker'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'n8n-workflows',
        title: 'n8n Automation',
        kind: 'link',
        description: 'Motor de automatización y orquestación de flujos de trabajo e integraciones API complejas.',
        descriptionFormat: 'plain',
        url: 'http://n8n.internal.lan:5678',
        icon: 'activity',
        category: 'devops',
        enabled: true,
        order: 3,
        tags: ['automation', 'low-code', 'api'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'vscode-server',
        title: 'VS Code Cloud Server',
        kind: 'link',
        description: 'IDE completo en el navegador ejecutándose en el clúster con terminal bash integrada.',
        descriptionFormat: 'plain',
        url: 'http://code.internal.lan:8443',
        icon: 'code',
        category: 'devops',
        enabled: true,
        order: 4,
        tags: ['ide', 'editor', 'web'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'grafana-metrics',
        title: 'Grafana Observability',
        kind: 'link',
        description: 'Visualización analítica en tiempo real de telemetría de Prometheus, Loki y clústeres.',
        descriptionFormat: 'plain',
        url: 'http://grafana.internal.lan:3000',
        icon: 'bar-chart-2',
        category: 'monitoring',
        enabled: true,
        order: 1,
        tags: ['metrics', 'monitoring', 'dashboards'],
        pinned: true,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'uptime-kuma',
        title: 'Uptime Kuma',
        kind: 'link',
        description: 'Monitor de disponibilidad de servicios con alertas multicanal y página pública de estado.',
        descriptionFormat: 'plain',
        url: 'http://uptime.internal.lan:3001',
        icon: 'activity',
        category: 'monitoring',
        enabled: true,
        order: 2,
        tags: ['uptime', 'status', 'health'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'cockpit-linux',
        title: 'Cockpit SysAdmin',
        kind: 'link',
        description: 'Panel de administración Linux para gestión de almacenamiento, redes y contenedores.',
        descriptionFormat: 'plain',
        url: 'https://cockpit.internal.lan:9090',
        icon: 'monitor',
        category: 'monitoring',
        enabled: true,
        order: 3,
        tags: ['sysadmin', 'linux', 'terminal'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'portainer-ce',
        title: 'Portainer Clúster',
        kind: 'link',
        description: 'Gestión visual centralizada de entornos Docker, Swarm y Kubernetes.',
        descriptionFormat: 'plain',
        url: 'http://portainer.internal.lan:9000',
        icon: 'cpu',
        category: 'infra',
        enabled: true,
        order: 1,
        tags: ['docker', 'containers', 'infra'],
        pinned: true,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'nginx-proxy-manager',
        title: 'Nginx Proxy Manager',
        kind: 'link',
        description: 'Enrutador de tráfico HTTP/HTTPS inverso con renovación automática de certificados SSL.',
        descriptionFormat: 'plain',
        url: 'http://npm.internal.lan:81',
        icon: 'cpu',
        category: 'infra',
        enabled: true,
        order: 2,
        tags: ['proxy', 'ssl', 'network'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'pi-hole-dns',
        title: 'Pi-hole DNS Security',
        kind: 'link',
        description: 'Servidor DNS recursivo con sumidero para bloqueo de rastreadores y publicidad.',
        descriptionFormat: 'plain',
        url: 'http://pihole.internal.lan/admin',
        icon: 'monitor',
        category: 'infra',
        enabled: true,
        order: 3,
        tags: ['dns', 'adblock', 'security'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'nextcloud-hub',
        title: 'Nextcloud Enterprise',
        kind: 'link',
        description: 'Suite de productividad, almacenamiento de archivos, calendario y edición colaborativa.',
        descriptionFormat: 'plain',
        url: 'http://nextcloud.internal.lan',
        icon: 'cloud',
        category: 'cloud',
        enabled: true,
        order: 1,
        tags: ['cloud', 'storage', 'files'],
        pinned: true,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'jellyfin-media',
        title: 'Jellyfin Media Hub',
        kind: 'link',
        description: 'Servidor de transmisión multimedia para películas, series y música con transcodificación GPU.',
        descriptionFormat: 'plain',
        url: 'http://jellyfin.internal.lan:8096',
        icon: 'film',
        category: 'cloud',
        enabled: true,
        order: 2,
        tags: ['streaming', 'media', 'video'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
      {
        id: 'immich-photos',
        title: 'Immich Cloud Photos',
        kind: 'link',
        description: 'Respaldo fotográfico de alto rendimiento con detección de rostros y búsqueda semántica.',
        descriptionFormat: 'plain',
        url: 'http://immich.internal.lan:2283',
        icon: 'camera',
        category: 'cloud',
        enabled: true,
        order: 3,
        tags: ['photos', 'gallery', 'backup'],
        pinned: false,
        openInNewTab: true,
        color: '#06b6d4',
        healthCheck: false,
        latencyThresholdMs: 0,
      },
    ],
    _meta: { createdAt: null, updatedAt: null },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// In-memory cache (one process, single instance)
// ──────────────────────────────────────────────────────────────────────────
let cache: { config: Config; loadedAt: number } | null = null;
let seedPromise: Promise<Config> | null = null; // dedupes concurrent seeds
const CACHE_TTL_MS = 5_000; // read-through TTL to balance freshness and perf

function invalidate() {
  cache = null;
  // BUGFIX: también reseteamos `seedPromise` para que el próximo getConfig()
  // re-lea desde disco. Sin esto, después del primer seed el `seedPromise`
  // queda cacheado con la config del boot, y un saveConfig() + getConfig()
  // devuelve los datos VIEJOS aunque el archivo ya tenga los nuevos. Esto
  // es lo que rompía los toggles múltiples de features: cada PUT veía
  // `current.features = {}` (el default del boot) en vez de los toggles
  // previos guardados en disco.
  seedPromise = null;
}
// Exportado para que otros módulos (assets.ts) puedan forzar reload fresco
// antes de operaciones que dependen de la config vigente (evita TOCTOU entre
// un check y un delete). El cache TTL es 5s, suficiente para la mayoría de
// los casos, pero un delete necesita precisión.
export const _invalidate = invalidate;

// ──────────────────────────────────────────────────────────────────────────
// Filesystem helpers
// ──────────────────────────────────────────────────────────────────────────
async function ensureDirs() {
  // Per-portal (Ola 4.1): usa portalUploadsPath(portalId) que respeta
  // el portal activo. Si multiPortal está apagado, devuelve data/uploads
  // (legacy). El DATA_DIR siempre existe (necesario para que el multi-portal
  // root pueda crearse).
  const portalUploads = _portalUploadsPath(activePortalId);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.dirname(portalUploads), { recursive: true });
  await fs.mkdir(portalUploads, { recursive: true });
}

async function seedIfMissing(initialPassword?: string): Promise<Config> {
  // BUGFIX: race entre requests concurrentes en el primer boot. Sin este
  // guard, dos requests que llegan al mismo tiempo ambos ven "no existe",
  // ambos escriben un config con diferente password hash (si INITIAL_PASSWORD
  // cambia entre ellos), y el segundo pisa al primero. Cacheamos la promesa
  // para que ambos esperen el mismo resultado.
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    await ensureDirs();
    const portalCfgPath = _portalConfigPath(activePortalId);
    try {
      await fs.access(portalCfgPath);
    } catch {
      const cfg = defaultConfig();
      const now = new Date().toISOString();
      cfg._meta = { createdAt: now, updatedAt: now };

      // First-run password setup
      const password = initialPassword || process.env.INITIAL_PASSWORD;
      cfg.auth = {
        passwordHash: await hashPassword(password || 'admin'),
        csrfToken: generateToken(32),
        authEpoch: 0,
        users: [],
        singlePasswordEnabled: true,
      };

      if (!password) {
        console.warn(
          '[umbral] No INITIAL_PASSWORD set. Default password is "admin" — change it from /admin ASAP.',
        );
      } else {
        console.log('[umbral] Initial password set from INITIAL_PASSWORD env var.');
      }

      await fs.writeFile(portalCfgPath, JSON.stringify(cfg, null, 2), 'utf8');
      return cfg;
    }
    // File exists; load and validate.
    return loadFresh();
  })();
  try {
    return await seedPromise;
  } catch (err) {
    // Si el seed falló, limpiamos para que el próximo request pueda
    // reintentar (ej: archivo quedó en estado corrupto transitorio).
    seedPromise = null;
    throw err;
  }
}

async function loadFresh(): Promise<Config> {
  const raw = await fs.readFile(_portalConfigPath(activePortalId), 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `config.json está corrupto (JSON inválido). Reparalo o restaurá el volumen. Detalle: ${(err as Error).message}`,
    );
  }
  // 1) Strict validation pass — if clean, return.
  const result = ConfigSchema.safeParse(parsed);
  if (result.success) {
    let data = result.data;
    // auth puede faltar en configs viejos. Si falta, regenerar uno nuevo
    // (con el password de INITIAL_PASSWORD o el default "admin") para no
    // dejar la app inaccesible.
    if (!data.auth) {
      const password = process.env.INITIAL_PASSWORD || 'admin';
      data = { ...data, auth: { passwordHash: await hashPassword(password), csrfToken: generateToken(32), authEpoch: 0, users: [], singlePasswordEnabled: true } };
      console.warn('[umbral] config sin auth — regenerando. Cambiá la password desde /admin ASAP.');
    }
    // ai es .optional() en el schema (para no romper configs viejos en el
    // path strict), pero el admin asume que existe. Lo mergeamos con
    // defaults si falta, y re-persistimos para que el siguiente load no
    // tenga que hacerlo.
    const portalCfg = _portalConfigPath(activePortalId);
    if (!data.ai) {
      data = { ...data, ai: defaultConfig().ai };
      const tmp = portalCfg + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tmp, portalCfg);
      console.log('[umbral] config sin sección ai — agregada con defaults.');
    }
    // externalSearch es .optional() por la misma razón que ai: configs viejos
    // no la tienen. Mismo patrón de auto-migración.
    if (!data.externalSearch) {
      data = { ...data, externalSearch: defaultConfig().externalSearch };
      const tmp = portalCfg + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tmp, portalCfg);
      console.log('[umbral] config sin sección externalSearch — agregada con defaults.');
    }
    // Si fontUrl quedó apuntando al Google Fonts default de versiones anteriores,
    // limpiarlo a '' para que el render sea 100% local y no bloquee en redes aisladas.
    if (data.theme?.fontUrl?.includes('fonts.googleapis.com')) {
      data = { ...data, theme: { ...data.theme, fontUrl: '' } };
      const tmp = portalCfg + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tmp, portalCfg);
      console.log('[umbral] fontUrl de Google Fonts migrado a fuente local (offline-safe).');
    }
    return data;
  }

  // 2) Migration: if the file is a *partial* config (missing newer sections
  // like `security` introduced in a later version), merge with defaults and
  // rewrite the file so subsequent reads are clean.
  const partial = ConfigSchema.partial().safeParse(parsed);
  if (partial.success) {
    const defaults = defaultConfig();
    // `partial()` over `ConfigSchema` infers `{}` for nested objects, so the
    // optional `security` here is typed as `{}`. Cast to `Partial<Security>`
    // so the deep-merge below type-checks against the real keys.
    const partialSec = (partial.data.security ?? {}) as Partial<Config['security']>;
    const merged: Config = {
      ...defaults,
      ...partial.data,
      // deep-merge the nested objects so we keep what was there
      branding: { ...defaults.branding, ...(partial.data.branding ?? {}) },
      theme: {
        ...defaults.theme,
        ...(partial.data.theme ?? {}),
        background: { ...defaults.theme.background, ...(partial.data.theme?.background ?? {}) },
      },
      layout: { ...defaults.layout, ...(partial.data.layout ?? {}) },
      // BUGFIX: el merge shallow anterior pisaba el objeto `security` entero
      // si el partial tenía solo una subsección (ej: { security: { auth:
      // { rateLimitMax: 5 } } } perdiá session/uploads/network/headers).
      // Deep-merge igual que theme.
      security: {
        ...defaults.security,
        ...partialSec,
        session: { ...defaults.security.session, ...(partialSec.session ?? {}) },
        auth: { ...defaults.security.auth, ...(partialSec.auth ?? {}) },
        uploads: { ...defaults.security.uploads, ...(partialSec.uploads ?? {}) },
        network: { ...defaults.security.network, ...(partialSec.network ?? {}) },
        headers: { ...defaults.security.headers, ...(partialSec.headers ?? {}) },
      },
      // AI: si el partial no incluye `ai`, usar el default (no activado).
      // Si lo incluye pero está parcial, mergear.
      ai: partial.data.ai
        ? { ...defaults.ai!, ...(partial.data.ai as object) }
        : defaults.ai,
      // externalSearch: mismo patrón que ai.
      externalSearch: partial.data.externalSearch
        ? { ...defaults.externalSearch!, ...(partial.data.externalSearch as object) }
        : defaults.externalSearch,
      auth: partial.data.auth as Config['auth'], // puede ser undefined; lo regeneramos abajo
      _meta: { ...defaults._meta, ...(partial.data._meta ?? {}), updatedAt: new Date().toISOString() },
    };
    // Regenerar auth si falta, igual que en el camino strict.
    if (!merged.auth) {
      const password = process.env.INITIAL_PASSWORD || 'admin';
      merged.auth = { passwordHash: await hashPassword(password), csrfToken: generateToken(32), authEpoch: 0, users: [], singlePasswordEnabled: true };
      console.warn('[umbral] config migrada sin auth — regenerando. Cambiá la password desde /admin ASAP.');
    } else {
      merged.auth = {
        ...merged.auth,
        authEpoch: merged.auth.authEpoch ?? 0,
        users: merged.auth.users ?? [],
        singlePasswordEnabled: merged.auth.singlePasswordEnabled ?? true,
      };
    }
    // Re-validate the merged result.
    const revalidated = ConfigSchema.safeParse(merged);
    if (revalidated.success) {
      const portalCfg = _portalConfigPath(activePortalId);
      const tmp = portalCfg + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(revalidated.data, null, 2), 'utf8');
      await fs.rename(tmp, portalCfg);
      return revalidated.data;
    }
  }

  // 3) Hard failure.
  throw new Error(
    `config.json no cumple el schema: ${result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')}`,
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────
export async function getConfig(): Promise<Config> {
  // 1) fresh-load if no cache
  if (!cache) {
    const cfg = await seedIfMissing();
    cache = { config: cfg, loadedAt: Date.now() };
    return cfg;
  }
  // 2) read-through after TTL
  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    try {
      const fresh = await loadFresh();
      cache = { config: fresh, loadedAt: Date.now() };
      return fresh;
    } catch {
      // fallback to stale cache on read error
      return cache.config;
    }
  }
  return cache.config;
}

export async function saveConfig(update: ConfigUpdate): Promise<Config> {
  const defaults = defaultConfig();
  const current = await getConfig();
  // _meta no se puede actualizar desde el client (se regenera acá).
  // auth SÍ se acepta desde el client a partir de Ola 3.1 (multi-user)
  // — el server hace gating de los users[] según features.multiUser.enabled
  // (ver el IIFE de auth más abajo). Mantenemos el spread para que el
  // campo llegue a saveConfig.
  const { _meta: _ignoredMeta, ...cleanUpdate } = update;

  // Features: deep-merge igual que security. El client envía sólo los
  // flags que cambió; el server mergea contra current.features para no
  // pisar los otros.
  const currentFeatures = (current.features ?? {}) as Record<string, Record<string, unknown>>;
  const updateFeatures = (cleanUpdate.features ?? {}) as Record<string, Record<string, unknown>>;
  const mergedFeatures: Record<string, Record<string, unknown>> = { ...currentFeatures };
  for (const [key, partialUpdate] of Object.entries(updateFeatures)) {
    mergedFeatures[key] = { ...(currentFeatures[key] ?? {}), ...partialUpdate };
  }

  const merged = {
    ...current,
    ...cleanUpdate,
    branding: { ...current.branding, ...(cleanUpdate.branding ?? {}) },
    theme: {
      ...current.theme,
      ...(cleanUpdate.theme ?? {}),
      background: { ...current.theme.background, ...(cleanUpdate.theme?.background ?? {}) },
    },
    layout: { ...current.layout, ...(cleanUpdate.layout ?? {}) },
    security: {
      ...current.security,
      ...(cleanUpdate.security ?? {}),
      session: { ...current.security.session, ...(cleanUpdate.security?.session ?? {}) },
      auth: { ...current.security.auth, ...(cleanUpdate.security?.auth ?? {}) },
      uploads: { ...current.security.uploads, ...(cleanUpdate.security?.uploads ?? {}) },
      network: { ...current.security.network, ...(cleanUpdate.security?.network ?? {}) },
      headers: { ...current.security.headers, ...(cleanUpdate.security?.headers ?? {}) },
    },
    ai: cleanUpdate.ai
      ? { ...(current.ai ?? defaults.ai!), ...cleanUpdate.ai }
      : (current.ai ?? defaults.ai),
    externalSearch: cleanUpdate.externalSearch
      ? { ...(current.externalSearch ?? defaults.externalSearch!), ...cleanUpdate.externalSearch }
      : (current.externalSearch ?? defaults.externalSearch),
    features: mergedFeatures,
    categories: cleanUpdate.categories ?? current.categories,
    cards: (() => {
      // Defense-in-depth para el opt-in de markdown: si la feature está
      // apagada, forzar plain + límite 200 chars en TODAS las cards.
      // Si la feature está activa, respetar descriptionFormat (200 para plain, 1000 para markdown).
      const baseCards = (cleanUpdate.cards ?? current.cards);
      const markdownOn = (mergedFeatures.markdown as { enabled?: boolean } | undefined)?.enabled === true;
      const tagsOn = (mergedFeatures.tags as { enabled?: boolean } | undefined)?.enabled === true;
      const pinnedOn = (mergedFeatures.pinned as { enabled?: boolean } | undefined)?.enabled === true;
      return baseCards.map((c) => {
        const description = typeof c.description === 'string' ? c.description : '';
        const baseCard = { ...c };
        // Description + format gating
        if (!markdownOn) {
          baseCard.description = description.slice(0, 200);
          baseCard.descriptionFormat = 'plain' as const;
        } else {
          const limit = c.descriptionFormat === 'markdown' ? 1000 : 200;
          baseCard.description = description.slice(0, limit);
          baseCard.descriptionFormat = c.descriptionFormat === 'markdown' ? ('markdown' as const) : ('plain' as const);
        }
        // Tags gating
        if (!tagsOn) {
          delete (baseCard as { tags?: string[] }).tags;
        }
        // Pinned gating
        if (!pinnedOn) {
          baseCard.pinned = false;
        }
        return baseCard;
      });
    })(),
    // Maintenance windows gating: si la feature está apagada, dropear el array.
    maintenanceWindows: (() => {
      const mw = (cleanUpdate as ConfigUpdate).maintenanceWindows;
      const base = (current.maintenanceWindows ?? { items: [] });
      const maintOn = (mergedFeatures.maintenanceWindows as { enabled?: boolean } | undefined)?.enabled === true;
      if (!maintOn) {
        return { items: [] };
      }
      return mw ? { ...base, ...mw } : base;
    })(),
    // Auth: si multiUser está activo en mergedFeatures, aceptamos users.
    auth: (() => {
      const featureOn = (mergedFeatures.multiUser as { enabled?: boolean } | undefined)?.enabled === true;
      const base = (current.auth ?? { passwordHash: '', csrfToken: '', authEpoch: 0, users: [], singlePasswordEnabled: true });
      const incoming = (cleanUpdate as ConfigUpdate).auth as { users?: typeof base.users; singlePasswordEnabled?: boolean } | undefined;
      if (!featureOn) {
        return { ...base, users: [], singlePasswordEnabled: true };
      }
      if (!incoming) return base;
      return { ...base, ...incoming };
    })(),
    portals: (cleanUpdate as ConfigUpdate).portals ?? current.portals ?? defaults.portals,
    oidc: (cleanUpdate as ConfigUpdate).oidc ?? current.oidc ?? defaults.oidc,
    apiTokens: (cleanUpdate as ConfigUpdate).apiTokens ?? current.apiTokens ?? defaults.apiTokens,
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };

  if (merged.security?.network) {
    delete (merged.security.network as { trustedProxiesText?: string }).trustedProxiesText;
  }

  // Protección de la tarjeta default de docs
  const mergedCards = [...merged.cards];
  const systemCardDefault = defaults.cards.find((c) => c.id === 'docs');
  if (systemCardDefault) {
    const existingSystem = mergedCards.find((c) => c.id === 'docs');
    if (!existingSystem) {
      mergedCards.push({ ...systemCardDefault });
      merged.cards = mergedCards;
    } else {
      const originalSystem = current.cards.find((c) => c.id === 'docs');
      if (originalSystem) {
        const protectedFields = [
          'title', 'description', 'url', 'icon', 'color', 'category',
          'order', 'openInNewTab', 'healthCheck', 'kind', 'id',
        ] as const;
        const changed: string[] = [];
        for (const f of protectedFields) {
          const a = existingSystem[f];
          const b = originalSystem[f];
          if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(String(f));
        }
        if (changed.length > 0) {
          throw new Error(
            'La tarjeta "Documentación" es del sistema y no se puede editar. ' +
            'Sólo podés ocultarla activando/desactivando el switch "Activa". ' +
            `Campos protegidos que intentaste cambiar: ${changed.join(', ')}.`,
          );
        }
      }
    }
  }

  // Re-validate the merged result.
  const result = ConfigSchema.parse(merged);

  // Atomic write: write to .tmp then rename. Per-portal (Ola 4.1).
  const portalCfg = _portalConfigPath(activePortalId);
  const tmp = portalCfg + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, portalCfg);
  invalidate();
  return result;
}

export async function resetConfig(): Promise<Config> {
  await ensureDirs();
  const cfg = defaultConfig();
  const now = new Date().toISOString();
  cfg._meta = { createdAt: now, updatedAt: now };
  // Preserve current auth
  const current = await getConfig().catch(() => null);
  if (current?.auth) cfg.auth = current.auth;
  else {
    const password = process.env.INITIAL_PASSWORD || 'admin';
    cfg.auth = {
      passwordHash: await hashPassword(password),
      csrfToken: generateToken(32),
      authEpoch: 0,
      users: [],
      singlePasswordEnabled: true,
    };
  }
  await fs.writeFile(_portalConfigPath(activePortalId), JSON.stringify(cfg, null, 2), 'utf8');
  invalidate();
  return cfg;
}

/** Replace the whole config (used by /api/import). Validates strictly. */
export async function importConfig(newConfig: Config): Promise<Config> {
  const result = ConfigSchema.parse(newConfig);
  await ensureDirs();
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
  invalidate();
  return result;
}

/** Replace auth (password hash + rotate CSRF + bump epoch → invalida
 *  todas las sesiones activas). El admin que está cambiando la password
 *  sigue logueado en su propia sesión, pero cualquier otra sesión abierta
 *  (otro browser, sesión robada) queda muerta al próximo request. */
export async function updateAuth(newPasswordHash: string, newCsrf: string): Promise<Config> {
  const current = await getConfig();
  const merged = {
    ...current,
    auth: {
      passwordHash: newPasswordHash,
      csrfToken: newCsrf,
      authEpoch: (current.auth?.authEpoch ?? 0) + 1,
      users: current.auth?.users ?? [],
      singlePasswordEnabled: current.auth?.singlePasswordEnabled ?? true,
    },
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };
  const result = ConfigSchema.parse(merged);
  const portalCfg = _portalConfigPath(activePortalId);
  const tmp = portalCfg + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, portalCfg);
  invalidate();
  return result;
}

/** Audit log (append-only). Best-effort, no I/O failure propagation.
 *  Rota cuando supera AUDIT_MAX_BYTES (10MB) → renombra a .1 y empieza de nuevo.
 *  Evita que un deployment largo se quede sin disco. */
const AUDIT_MAX_BYTES = 10 * 1024 * 1024;
const AUDIT_KEEP_ROTATIONS = 3;

let auditWriteLock: Promise<void> = Promise.resolve();

export async function audit(action: string, detail?: string) {
  // BUGFIX: serializamos TODAS las escrituras del audit log. Antes dos
  // audit() concurrentes podian ver "needsRotate=false" ambos, los dos
  // appendeaban, y el archivo pasaba de 10MB. Con la lock, sólo uno chequea
  // tamaño/rota a la vez; el otro appendea al final de la cola.
  const myTurn = auditWriteLock.then(async () => {
    try {
      await ensureDirs();
      // Chequeamos tamaño antes de appendear.
      let needsRotate = false;
      try {
        const st = await fs.stat(AUDIT_LOG_PATH);
        if (st.size >= AUDIT_MAX_BYTES) needsRotate = true;
      } catch {
        // archivo no existe aún, no rotar
      }
      if (needsRotate) {
        // Shift rotaciones: audit.log.2 → audit.log.3, audit.log.1 → audit.log.2, etc.
        // Borrar la más vieja si excede el keep. Cada rename puede fallar
        // en Windows si el destino existe — por eso los try/catch.
        const oldest = `${AUDIT_LOG_PATH}.${AUDIT_KEEP_ROTATIONS}`;
        try { await fs.unlink(oldest); } catch { /* puede no existir */ }
        for (let i = AUDIT_KEEP_ROTATIONS - 1; i >= 1; i--) {
          const from = `${AUDIT_LOG_PATH}.${i}`;
          const to = `${AUDIT_LOG_PATH}.${i + 1}`;
          try { await fs.rename(from, to); } catch { /* skip */ }
        }
        try { await fs.rename(AUDIT_LOG_PATH, `${AUDIT_LOG_PATH}.1`); } catch { /* skip */ }
      }
      const line = `${new Date().toISOString()}\t${action}\t${detail ?? ''}\n`;
      await fs.appendFile(AUDIT_LOG_PATH, line, 'utf8');
    } catch (err) {
      console.error('[umbral] audit log write failed:', err);
    }
  });
  // Encadenamos la siguiente escritura; si esta falla, la lock se libera igual.
  auditWriteLock = myTurn.catch(() => { });
  await myTurn;
}

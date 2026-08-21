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
      companyName: 'Mi Empresa',
      logo: null,
      favicon: null,
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000',
      },
      cardStyle: 'glass',
      accentColor: '#60a5fa',
      textColor: '#f1f5f9',
      fontFamily: 'Inter',
      fontUrl: '',
      colorMode: 'auto',
      groupLayout: 'vertical',
      showClock: false,
      showRefresh: false,
      showStatusBar: false,
    },
    layout: {
      columnsDesktop: 4,
      columnsTablet: 3,
      columnsMobile: 2,
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
          "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
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
      enabled: false,
      provider: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      systemPrompt: '',
      language: 'es',
    },
    // External search (Brave / Tavily / SearXNG). Sin keys por default —
    // el auto-completar usa sólo Wikipedia + DuckDuckGo (sin auth).
    // Si el user carga keys acá, /api/fetch-card-info los usa primero.
    externalSearch: {
      braveApiKey: '',
      tavilyApiKey: '',
    },
    // Features flags (ver src/lib/features.ts). Default vacío → todas las
    // features nuevas arrancan apagadas, manteniendo compat 100% con v1.x.
    // El admin activa cada una desde /admin → Avanzado → Features.
    features: {
      markdown: { enabled: false },
      tags: { enabled: false },
      pinned: { enabled: false },
      i18n: { enabled: false, locale: 'es' },
      presets: { enabled: true },
      auditLogViewer: { enabled: true },
      webhooks: { enabled: false },
      maintenanceWindows: { enabled: false },
      metrics: { enabled: false, persistToDisk: false, retentionHours: 24 },
      qr: { enabled: false },
      multiUser: { enabled: false },
      totp2fa: { enabled: false },
      oidc: { enabled: false },
      apiTokens: { enabled: false },
      multiPortal: { enabled: false },
      status: { enabled: false },
      ai: { enabled: false },
      iconPacks: { enabled: false },
    },
    portals: { defaultPortal: 'default', items: [] },
    oidc: { providers: [] },
    apiTokens: { items: [] },
    categories: [
      { id: 'com', name: 'Comunicación', icon: 'message-circle', isLocked: false, password: '', isSubpage: false },
      { id: 'prod', name: 'Productividad', icon: 'briefcase', isLocked: false, password: '', isSubpage: false },
      { id: 'dev', name: 'Desarrollo', icon: 'code', isLocked: false, password: '', isSubpage: false },
    ],
    cards: [
      // Tarjeta default que apunta a la documentación del sistema.
      {
        id: 'docs',
        title: 'Documentación',
        kind: 'link',
        description: 'Cómo instalar, configurar y usar Umbral',
        descriptionFormat: 'plain',
        url: '/docs',
        icon: 'file-text',
        category: 'dev',
        openInNewTab: false,
        color: '#10b981',
        order: 0,
        enabled: true,
        healthCheck: false,
        latencyThresholdMs: 0,
        pinned: false,
        tags: [],
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
    // Auto-migración de legacy data/ → data/portals/default/ si existe.
    // Esto cubre el upgrade de v1.x → v2.x: el código v2.x siempre lee
    // y escribe en data/portals/default/ (vía portalConfigPath), por
    // lo que si data/config.json legacy queda intacto, el server ve
    // un config fresco vacío y el usuario "pierde" sus datos en el
    // primer boot. La función es idempotente: si no hay legacy data,
    // sale inmediatamente con { migrated: false }. El costo es 1
    // fs.stat por seed (no por request — sólo en cold boot o tras
    // invalidación del cache).
    //
    // IMPORTANTE: corre ANTES de ensureDirs. Si ensureDirs crea
    // data/portals/default/uploads primero, el fs.rename de
    // data/uploads → data/portals/default/uploads falla en Windows
    // porque Windows no permite rename sobre un directorio destino
    // existente. Migrando primero, el destino está limpio y el rename
    // funciona en cualquier OS.
    const mig = await migrateLegacyToMultiPortal();
    if (mig.migrated) console.log(`[umbral] multi-portal auto-migration: ${mig.reason}`);

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

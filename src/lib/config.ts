import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ConfigSchema, type Config, type ConfigUpdate } from './schema';
import { hashPassword, generateToken } from './auth';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.log');

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
      fontUrl:
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
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
      },
      headers: {
        csp:
          "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
        xFrameOptions: 'DENY',
        referrerPolicy: 'no-referrer',
        permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
        hsts: 'auto',
        hstsMaxAge: 31536000,
        hstsIncludeSubDomains: false,
        hstsPreload: false,
      },
    },
    categories: [
      { id: 'com', name: 'Comunicación', icon: 'message-circle' },
      { id: 'prod', name: 'Productividad', icon: 'briefcase' },
      { id: 'dev', name: 'Desarrollo', icon: 'code' },
    ],
    cards: [
      // Tarjeta default que apunta a la documentación del sistema. El admin
      // puede borrarla desde /admin → Tarjetas si no la quiere. Vive acá
      // (en defaultConfig) en vez de hardcodear en la portada para que:
      // 1) Respete el orden/agrupamiento del usuario (categoría "Desarrollo").
      // 2) Sea eliminable sin tocar código.
      // 3) Migrar a versiones viejas no la rompa — el merge deep la respeta
      //    si el usuario ya tenía cards custom.
      {
        id: 'docs',
        title: 'Documentación',
        description: 'Cómo instalar, configurar y usar Umbral',
        url: '/docs',
        icon: 'file-text',
        category: 'dev',
        openInNewTab: false,
        color: '#10b981',
        order: 0,
        enabled: true,
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
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
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
    try {
      await fs.access(CONFIG_PATH);
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
      };

      if (!password) {
        console.warn(
          '[umbral] No INITIAL_PASSWORD set. Default password is "admin" — change it from /admin ASAP.',
        );
      } else {
        console.log('[umbral] Initial password set from INITIAL_PASSWORD env var.');
      }

      await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
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
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
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
    // auth puede faltar en configs viejos. Si falta, regenerar uno nuevo
    // (con el password de INITIAL_PASSWORD o el default "admin") para no
    // dejar la app inaccesible.
    if (!result.data.auth) {
      const password = process.env.INITIAL_PASSWORD || 'admin';
      const fixed = { ...result.data, auth: { passwordHash: await hashPassword(password), csrfToken: generateToken(32), authEpoch: 0 } };
      console.warn('[umbral] config sin auth — regenerando. Cambiá la password desde /admin ASAP.');
      const tmp = CONFIG_PATH + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(fixed, null, 2), 'utf8');
      await fs.rename(tmp, CONFIG_PATH);
      return fixed as Config;
    }
    return result.data;
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
      auth: partial.data.auth,  // puede ser undefined; lo regeneramos abajo
      _meta: { ...defaults._meta, ...(partial.data._meta ?? {}), updatedAt: new Date().toISOString() },
    };
    // Regenerar auth si falta, igual que en el camino strict.
    if (!merged.auth) {
      const password = process.env.INITIAL_PASSWORD || 'admin';
      merged.auth = { passwordHash: await hashPassword(password), csrfToken: generateToken(32), authEpoch: 0 };
      console.warn('[umbral] config migrada sin auth — regenerando. Cambiá la password desde /admin ASAP.');
    } else if (merged.auth.authEpoch === undefined) {
      // Auth existe pero no tiene epoch (versión vieja del schema).
      // Lo agregamos sin invalidar sesiones existentes (epoch=0 matchea
      // con tokens emitidos bajo el formato viejo que tampoco tienen epoch).
      merged.auth = { ...merged.auth, authEpoch: 0 };
    }
    // Re-validate the merged result.
    const revalidated = ConfigSchema.safeParse(merged);
    if (revalidated.success) {
      const tmp = CONFIG_PATH + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(revalidated.data, null, 2), 'utf8');
      await fs.rename(tmp, CONFIG_PATH);
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
  const current = await getConfig();
  // auth y _meta no se pueden actualizar desde el client — el server los
  // gestiona (auth vía /api/password, _meta se regenera acá). Aunque el
  // schema los acepte (z.unknown) los descartamos explícitamente.
  const { auth: _ignoredAuth, _meta: _ignoredMeta, ...cleanUpdate } = update;
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
    categories: cleanUpdate.categories ?? current.categories,
    cards: cleanUpdate.cards ?? current.cards,
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };
  // Re-validate the merged result.
  const result = ConfigSchema.parse(merged);

  // Atomic write: write to .tmp then rename.
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
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
    };
  }
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
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
    },
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };
  const result = ConfigSchema.parse(merged);
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
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

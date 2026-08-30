/**
 * Lectura, seed y migración del config, más el cache en memoria.
 *
 * `getConfig()` es la única puerta de entrada: lee del cache, y cuando el TTL
 * vence relee del disco cayendo al cache viejo si el archivo está ilegible.
 */
import { promises as fs } from 'node:fs';
import { ConfigSchema, type Config } from '../schema';
import { hashPassword, generateToken } from '../auth';
import {
  portalConfigPath as _portalConfigPath,
  migrateLegacyToMultiPortal,
} from '../multi-portal';
import { ensureDirs, getActivePortalId, writeJsonAtomic } from './paths';
import { defaultConfig } from './defaults';

// ──────────────────────────────────────────────────────────────────────────
// In-memory cache (one process, single instance)
// ──────────────────────────────────────────────────────────────────────────
let cache: { config: Config; loadedAt: number } | null = null;
let seedPromise: Promise<Config> | null = null; // dedupes concurrent seeds
const CACHE_TTL_MS = 5_000; // read-through TTL to balance freshness and perf

export function invalidate() {
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

function newAuth(passwordHash: string): NonNullable<Config['auth']> {
  return {
    passwordHash,
    csrfToken: generateToken(32),
    authEpoch: 0,
    users: [],
    singlePasswordEnabled: true,
  };
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
    // sale inmediatamente con { migrated: false }.
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
    const portalCfgPath = _portalConfigPath(getActivePortalId());
    try {
      await fs.access(portalCfgPath);
    } catch {
      const cfg = defaultConfig();
      const now = new Date().toISOString();
      cfg._meta = { createdAt: now, updatedAt: now };

      // First-run password setup
      const password = initialPassword || process.env.INITIAL_PASSWORD;
      cfg.auth = newAuth(await hashPassword(password || 'admin'));

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

export async function loadFresh(): Promise<Config> {
  const portalCfg = _portalConfigPath(getActivePortalId());
  const raw = await fs.readFile(portalCfg, 'utf8');
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
      data = { ...data, auth: newAuth(await hashPassword(password)) };
      console.warn('[umbral] config sin auth — regenerando. Cambiá la password desde /admin ASAP.');
    }
    // ai es .optional() en el schema (para no romper configs viejos en el
    // path strict), pero el admin asume que existe. Lo mergeamos con
    // defaults si falta, y re-persistimos para que el siguiente load no
    // tenga que hacerlo.
    if (!data.ai) {
      data = { ...data, ai: defaultConfig().ai };
      await writeJsonAtomic(portalCfg, data);
      console.log('[umbral] config sin sección ai — agregada con defaults.');
    }
    // externalSearch es .optional() por la misma razón que ai: configs viejos
    // no la tienen. Mismo patrón de auto-migración.
    if (!data.externalSearch) {
      data = { ...data, externalSearch: defaultConfig().externalSearch };
      await writeJsonAtomic(portalCfg, data);
      console.log('[umbral] config sin sección externalSearch — agregada con defaults.');
    }
    // Si fontUrl quedó apuntando al Google Fonts default de versiones anteriores,
    // limpiarlo a '' para que el render sea 100% local y no bloquee en redes aisladas.
    if (data.theme?.fontUrl?.includes('fonts.googleapis.com')) {
      data = { ...data, theme: { ...data.theme, fontUrl: '' } };
      await writeJsonAtomic(portalCfg, data);
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
      // { rateLimitMax: 5 } } } perdía session/uploads/network/headers).
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
      merged.auth = newAuth(await hashPassword(password));
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
      await writeJsonAtomic(portalCfg, revalidated.data);
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

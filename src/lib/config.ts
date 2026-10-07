/**
 * Fachada del config: `getConfig` / `saveConfig` y las mutaciones puntuales.
 *
 * Los 39 módulos que importan `~/lib/config` siguen importando lo mismo; lo
 * que cambió es que adentro esto ya no es un monolito: los paths viven en
 * `config/paths.ts`, los defaults en `config/defaults.ts`, la carga y la
 * migración en `config/load.ts`, el gating de features en `config/gating.ts`
 * (funciones puras) y el audit log en `audit.ts`, que es donde ya vivía su
 * lector.
 *
 * Toda escritura pasa por `withConfigLock`: leer → mergear → escribir en
 * serie. Sin el lock, dos guardados concurrentes (dos pestañas, el CLI, el
 * login OIDC creando un user) leían la misma versión y el segundo pisaba al
 * primero.
 */
import { ConfigSchema, type Config, type ConfigUpdate } from './schema';
import { hashPassword, generateToken } from './auth';
import { reconcileSystemCards } from './system-card.ts';
// El dominio puro, no el barrel: así el grafo del servidor no arrastra el
// módulo que lee el DOM.
import { normalizeGhostCategories } from './cards/domain.ts';
import { portalConfigPath as _portalConfigPath } from './multi-portal';
import {
  CONFIG_PATH,
  ensureDirs,
  getActivePortalId,
  writeJsonAtomic,
} from './config/paths';
import { defaultConfig } from './config/defaults';
import { getConfig, invalidate } from './config/load';
import {
  gateAuth,
  gateAuthFromClient,
  gateCards,
  gateMaintenanceWindows,
  mergeFeatures,
  restoreClientSecrets,
} from './config/gating';

export { CONFIG_PATH, UPLOADS_DIR, AUDIT_LOG_PATH, setActivePortalId, getActivePortalId } from './config/paths';
export { getConfig } from './config/load';
export { audit } from './audit';

// Exportado para que otros módulos (assets.ts) puedan forzar reload fresco
// antes de operaciones que dependen de la config vigente (evita TOCTOU entre
// un check y un delete). El cache TTL es 5s, suficiente para la mayoría de
// los casos, pero un delete necesita precisión.
export const _invalidate = invalidate;

// ──────────────────────────────────────────────────────────────────────────
// Lock de escritura
// ──────────────────────────────────────────────────────────────────────────
let lockTail: Promise<unknown> = Promise.resolve();

/** Ejecuta `fn` en exclusión mutua con las demás escrituras del config. */
export function withConfigLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lockTail.then(fn, fn);
  lockTail = run.catch(() => {});
  return run;
}

/** Lectura fresca de disco (dentro del lock, para no mergear sobre el cache). */
async function readCurrent(): Promise<Config> {
  invalidate();
  return getConfig();
}

/** El config cambió desde la versión que el cliente editó (If-Match). */
export class ConfigConflictError extends Error {
  constructor(public readonly currentVersion: string | null) {
    super('El config cambió desde que lo cargaste (otra pestaña o usuario guardó). Recargá antes de guardar.');
    this.name = 'ConfigConflictError';
  }
}

export interface SaveOptions {
  /**
   * `client`: el update viene del panel o de la API pública. No puede tocar
   * `apiTokens`, los secretos que llegan vacíos se conservan, y de `auth`
   * sólo se aceptan los campos editables de cada user (ver
   * `gateAuthFromClient`).
   * `server` (default): mutaciones internas (tokens, TOTP, OIDC), que ya
   * construyen el valor final.
   */
  source?: 'client' | 'server';
  /** `_meta.updatedAt` que el cliente editó; si no coincide → conflicto. */
  expectedVersion?: string | null;
}

export function saveConfig(update: ConfigUpdate, opts: SaveOptions = {}): Promise<Config> {
  return withConfigLock(async () => saveConfigUnlocked(await readCurrent(), update, opts));
}

/**
 * Read-modify-write atómico: `mutator` recibe el config vigente (leído
 * dentro del lock) y devuelve el update, o null para no escribir nada.
 */
export function updateConfig(
  mutator: (current: Config) => ConfigUpdate | null | Promise<ConfigUpdate | null>,
): Promise<Config> {
  return withConfigLock(async () => {
    const current = await readCurrent();
    const update = await mutator(current);
    if (!update) return current;
    return saveConfigUnlocked(current, update, { source: 'server' });
  });
}

async function saveConfigUnlocked(current: Config, update: ConfigUpdate, opts: SaveOptions): Promise<Config> {
  const defaults = defaultConfig();
  const fromClient = opts.source === 'client';

  if (opts.expectedVersion != null && opts.expectedVersion !== (current._meta?.updatedAt ?? null)) {
    throw new ConfigConflictError(current._meta?.updatedAt ?? null);
  }

  // _meta no se puede actualizar desde el client (se regenera acá).
  const { _meta: _ignoredMeta, ...rawUpdate } = update;
  // Del cliente: los secretos vacíos son "no cambió" (el panel nunca los
  // recibe) y los API tokens sólo se administran desde /api/tokens. Sin esto
  // una pestaña vieja que guardaba resucitaba tokens borrados.
  const cleanUpdate = fromClient ? restoreClientSecrets(current, rawUpdate) : rawUpdate;
  if (fromClient) delete (cleanUpdate as { apiTokens?: unknown }).apiTokens;

  const mergedFeatures = mergeFeatures(current.features, cleanUpdate.features);
  const incomingAuth = (cleanUpdate as ConfigUpdate).auth as
    | { users?: NonNullable<Config['auth']>['users']; singlePasswordEnabled?: boolean }
    | undefined;

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
    categories: [...(cleanUpdate.categories ?? current.categories)],
    cards: gateCards(cleanUpdate.cards ?? current.cards, mergedFeatures),
    maintenanceWindows: gateMaintenanceWindows(
      current.maintenanceWindows,
      (cleanUpdate as ConfigUpdate).maintenanceWindows as Config['maintenanceWindows'],
      mergedFeatures,
    ),
    auth: fromClient
      ? gateAuthFromClient(current.auth, incomingAuth, mergedFeatures)
      : gateAuth(current.auth, incomingAuth, mergedFeatures),
    portals: (cleanUpdate as ConfigUpdate).portals ?? current.portals ?? defaults.portals,
    oidc: (cleanUpdate as ConfigUpdate).oidc ?? current.oidc ?? defaults.oidc,
    apiTokens: (cleanUpdate as ConfigUpdate).apiTokens ?? current.apiTokens ?? defaults.apiTokens,
    _meta: { ...current._meta, updatedAt: nextVersion(current._meta?.updatedAt) },
  };

  if (merged.security?.network) {
    delete (merged.security.network as { trustedProxiesText?: string }).trustedProxiesText;
  }

  // Sin users y con el password único deshabilitado no entra nadie.
  if (merged.auth && merged.auth.users.length === 0 && merged.auth.singlePasswordEnabled === false) {
    merged.auth = { ...merged.auth, singlePasswordEnabled: true };
  }

  // Card de sistema (docs): revertir campos protegidos en vez de fallar el
  // save. Un reorder global no debe impedir guardar; `enabled` sí se aplica.
  const systemCardDefault = defaults.cards.find((c) => c.id === 'docs');
  merged.cards = reconcileSystemCards(merged.cards, current.cards, systemCardDefault);
  normalizeGhostCategories(merged.categories, merged.cards);

  // Re-validate the merged result.
  const result = ConfigSchema.parse(merged);

  await writeJsonAtomic(_portalConfigPath(getActivePortalId()), result);
  invalidate();
  return result;
}

/** `updatedAt` estrictamente creciente: es la versión del If-Match, y dos
 *  guardados en el mismo milisegundo no pueden compartirla. */
function nextVersion(prev: string | null | undefined): string {
  let now = Date.now();
  const prevMs = prev ? Date.parse(prev) : NaN;
  if (Number.isFinite(prevMs) && now <= prevMs) now = prevMs + 1;
  return new Date(now).toISOString();
}

export function resetConfig(): Promise<Config> {
  return withConfigLock(async () => {
    await ensureDirs();
    const cfg = defaultConfig();
    const now = new Date().toISOString();
    cfg._meta = { createdAt: now, updatedAt: now };
    // Preserve current auth
    const current = await readCurrent().catch(() => null);
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
    await writeJsonAtomic(_portalConfigPath(getActivePortalId()), cfg);
    invalidate();
    return cfg;
  });
}

/**
 * Reemplaza el config entero (/api/import).
 *
 * La auth y los API tokens vigentes se conservan: importar un backup viejo
 * restauraba passwords anteriores y un `authEpoch` menor, con lo que
 * volvían a valer sesiones que un cambio de password había cerrado. Los
 * secretos que el backup trae vacíos (los exports salen saneados) se
 * conservan del config actual.
 */
export function importConfig(newConfig: Config): Promise<Config> {
  return withConfigLock(async () => {
    const parsed = ConfigSchema.parse(newConfig);
    const current = await readCurrent();
    const withSecrets = restoreClientSecrets(current, parsed) as Config;
    const result = ConfigSchema.parse({
      ...withSecrets,
      auth: current.auth,
      apiTokens: current.apiTokens,
      _meta: { ...parsed._meta, updatedAt: nextVersion(current._meta?.updatedAt) },
    });
    await ensureDirs();
    // Al path del portal activo, igual que saveConfig, resetConfig y updateAuth.
    await writeJsonAtomic(_portalConfigPath(getActivePortalId()), result);
    invalidate();
    return result;
  });
}

/** Replace auth (password hash + rotate CSRF + bump epoch → invalida
 *  todas las sesiones activas). Quien cambia la password recibe una sesión
 *  nueva (ver POST /api/password). */
export function updateAuth(newPasswordHash: string, newCsrf: string): Promise<Config> {
  return withConfigLock(async () => {
    const current = await readCurrent();
    const merged = {
      ...current,
      auth: {
        passwordHash: newPasswordHash,
        csrfToken: newCsrf,
        authEpoch: (current.auth?.authEpoch ?? 0) + 1,
        users: current.auth?.users ?? [],
        singlePasswordEnabled: current.auth?.singlePasswordEnabled ?? true,
      },
      _meta: { ...current._meta, updatedAt: nextVersion(current._meta?.updatedAt) },
    };
    const result = ConfigSchema.parse(merged);
    await writeJsonAtomic(_portalConfigPath(getActivePortalId()), result);
    invalidate();
    return result;
  });
}

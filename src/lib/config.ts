/**
 * Fachada del config: `getConfig` / `saveConfig` y las mutaciones puntuales.
 *
 * Los 39 módulos que importan `~/lib/config` siguen importando lo mismo; lo
 * que cambió es que adentro esto ya no es un monolito: los paths viven en
 * `config/paths.ts`, los defaults en `config/defaults.ts`, la carga y la
 * migración en `config/load.ts`, el gating de features en `config/gating.ts`
 * (funciones puras) y el audit log en `audit.ts`, que es donde ya vivía su
 * lector.
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
import { gateAuth, gateCards, gateMaintenanceWindows, mergeFeatures } from './config/gating';

export { CONFIG_PATH, UPLOADS_DIR, AUDIT_LOG_PATH, setActivePortalId, getActivePortalId } from './config/paths';
export { getConfig } from './config/load';
export { audit } from './audit';

// Exportado para que otros módulos (assets.ts) puedan forzar reload fresco
// antes de operaciones que dependen de la config vigente (evita TOCTOU entre
// un check y un delete). El cache TTL es 5s, suficiente para la mayoría de
// los casos, pero un delete necesita precisión.
export const _invalidate = invalidate;

export async function saveConfig(update: ConfigUpdate): Promise<Config> {
  const defaults = defaultConfig();
  const current = await getConfig();
  // _meta no se puede actualizar desde el client (se regenera acá).
  // auth SÍ se acepta desde el client a partir de Ola 3.1 (multi-user)
  // — el server hace gating de los users[] según features.multiUser.enabled
  // (ver gateAuth). Mantenemos el spread para que el campo llegue acá.
  const { _meta: _ignoredMeta, ...cleanUpdate } = update;

  const mergedFeatures = mergeFeatures(current.features, cleanUpdate.features);

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
    auth: gateAuth(
      current.auth,
      (cleanUpdate as ConfigUpdate).auth as { users?: NonNullable<Config['auth']>['users']; singlePasswordEnabled?: boolean } | undefined,
      mergedFeatures,
    ),
    portals: (cleanUpdate as ConfigUpdate).portals ?? current.portals ?? defaults.portals,
    oidc: (cleanUpdate as ConfigUpdate).oidc ?? current.oidc ?? defaults.oidc,
    apiTokens: (cleanUpdate as ConfigUpdate).apiTokens ?? current.apiTokens ?? defaults.apiTokens,
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };

  if (merged.security?.network) {
    delete (merged.security.network as { trustedProxiesText?: string }).trustedProxiesText;
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
  await writeJsonAtomic(_portalConfigPath(getActivePortalId()), cfg);
  invalidate();
  return cfg;
}

/** Replace the whole config (used by /api/import). Validates strictly. */
export async function importConfig(newConfig: Config): Promise<Config> {
  const result = ConfigSchema.parse(newConfig);
  await ensureDirs();
  await writeJsonAtomic(CONFIG_PATH, result);
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
  await writeJsonAtomic(_portalConfigPath(getActivePortalId()), result);
  invalidate();
  return result;
}
/**
 * Gating de features en el guardado, como funciones puras.
 *
 * Es la mitad del save que más importa auditar: decide qué campos se
 * persisten según los flags, y es defense-in-depth — un PUT con `pinned:
 * true` sin la feature activa se guarda igual, pero apagado. Al no tocar
 * disco ni cache, cada regla se puede testear sola.
 */
import type { Card, Config } from '../schema';

type FeatureMap = Record<string, Record<string, unknown>>;

const isOn = (features: FeatureMap, name: string): boolean =>
  (features[name] as { enabled?: boolean } | undefined)?.enabled === true;

/**
 * Merge de los flags: el cliente manda sólo lo que cambió, así que cada
 * feature se mergea contra la actual para no pisar a las demás.
 */
export function mergeFeatures(current: unknown, update: unknown): FeatureMap {
  const currentFeatures = (current ?? {}) as FeatureMap;
  const updateFeatures = (update ?? {}) as FeatureMap;
  const merged: FeatureMap = { ...currentFeatures };
  for (const [key, partialUpdate] of Object.entries(updateFeatures)) {
    merged[key] = { ...(currentFeatures[key] ?? {}), ...partialUpdate };
  }
  return merged;
}

/**
 * Recorta cada tarjeta a lo que las features habilitadas permiten:
 * markdown decide el formato y el largo de la descripción, tags decide si
 * el array se persiste, y pinned decide si el flag puede quedar en true.
 */
export function gateCards(cards: Card[], features: FeatureMap): Card[] {
  const markdownOn = isOn(features, 'markdown');
  const tagsOn = isOn(features, 'tags');
  const pinnedOn = isOn(features, 'pinned');
  return cards.map((c) => {
    const description = typeof c.description === 'string' ? c.description : '';
    const baseCard = { ...c };
    if (!markdownOn) {
      baseCard.description = description.slice(0, 200);
      baseCard.descriptionFormat = 'plain' as const;
    } else {
      const limit = c.descriptionFormat === 'markdown' ? 1000 : 200;
      baseCard.description = description.slice(0, limit);
      baseCard.descriptionFormat = c.descriptionFormat === 'markdown' ? ('markdown' as const) : ('plain' as const);
    }
    if (!tagsOn) {
      delete (baseCard as { tags?: string[] }).tags;
    }
    if (!pinnedOn) {
      baseCard.pinned = false;
    }
    return baseCard;
  });
}

/** Con la feature apagada las ventanas no se persisten. */
export function gateMaintenanceWindows(
  current: Config['maintenanceWindows'],
  update: Config['maintenanceWindows'],
  features: FeatureMap,
): NonNullable<Config['maintenanceWindows']> {
  const base = current ?? { items: [] };
  if (!isOn(features, 'maintenanceWindows')) return { items: [] };
  return update ? { ...base, ...update } : base;
}

/**
 * De `auth` sólo son editables `users` y `singlePasswordEnabled`. El hash del
 * super-admin, el CSRF y el authEpoch se manejan en sus propios flujos (POST
 * /api/password, login), así que un PUT no puede pisarlos ni aunque el
 * cliente los mande — que es lo que permite no serializarlos en el HTML del
 * dashboard.
 */
export function gateAuth(
  current: Config['auth'],
  incoming: { users?: NonNullable<Config['auth']>['users']; singlePasswordEnabled?: boolean } | undefined,
  features: FeatureMap,
): NonNullable<Config['auth']> {
  const base = current ?? { passwordHash: '', csrfToken: '', authEpoch: 0, users: [], singlePasswordEnabled: true };
  if (!isOn(features, 'multiUser')) {
    return { ...base, users: [], singlePasswordEnabled: true };
  }
  if (!incoming) return base;
  return {
    ...base,
    ...(incoming.users !== undefined ? { users: incoming.users } : {}),
    ...(incoming.singlePasswordEnabled !== undefined
      ? { singlePasswordEnabled: incoming.singlePasswordEnabled }
      : {}),
  };
}

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
/** Sentinel de los users creados por OIDC (no pueden entrar con password). */
export const OIDC_NO_PASSWORD = '!oidc-no-password';

type AuthUser = NonNullable<Config['auth']>['users'][number];

/**
 * `auth` desde el panel. El panel recibe los users sin hash, sin seed TOTP
 * y sin vínculo OIDC (ver `sanitizeConfigForAdmin`), así que el merge es por
 * id y los campos sensibles los decide el server:
 * - `passwordHash`: se conserva salvo que llegue un hash bcrypt nuevo (de
 *   /api/auth/hash-password); en ese caso se sube el `userEpoch` y se cierran
 *   las sesiones de ese user.
 * - `userEpoch`, `totpSecret`, `oidcSubject`, `createdAt`, `lastLoginAt`: del
 *   server, nunca del cliente.
 * Un user nuevo tiene que traer un hash bcrypt válido.
 */
export function gateAuthFromClient(
  current: Config['auth'],
  incoming: { users?: AuthUser[]; singlePasswordEnabled?: boolean } | undefined,
  features: FeatureMap,
): NonNullable<Config['auth']> {
  const base = current ?? { passwordHash: '', csrfToken: '', authEpoch: 0, users: [], singlePasswordEnabled: true };
  if (!isOn(features, 'multiUser')) {
    return { ...base, users: [], singlePasswordEnabled: true };
  }
  if (!incoming) return base;
  let users = base.users;
  if (incoming.users !== undefined) {
    const byId = new Map(base.users.map((u) => [u.id, u]));
    users = incoming.users.map((u) => {
      const existing = byId.get(u.id);
      const sentHash = typeof u.passwordHash === 'string' ? u.passwordHash : '';
      if (!existing) {
        if (!BCRYPT_RE.test(sentHash)) {
          throw new Error(`El usuario "${u.username}" no tiene un password válido.`);
        }
        return {
          ...u,
          passwordHash: sentHash,
          userEpoch: 0,
          totpSecret: null,
          oidcSubject: null,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        };
      }
      const passwordChanged = BCRYPT_RE.test(sentHash) && sentHash !== existing.passwordHash;
      return {
        ...existing,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        passwordHash: passwordChanged ? sentHash : existing.passwordHash,
        userEpoch: passwordChanged ? existing.userEpoch + 1 : existing.userEpoch,
      };
    });
  }
  return {
    ...base,
    users,
    ...(incoming.singlePasswordEnabled !== undefined
      ? { singlePasswordEnabled: incoming.singlePasswordEnabled }
      : {}),
  };
}

/**
 * El panel y los exports reciben los secretos vacíos (ver
 * `sanitizeConfigForClient`). Al volver, un secreto vacío significa "no
 * cambió": se repone el del config vigente. Para cambiarlo se manda el
 * valor nuevo.
 */
export function restoreClientSecrets<T extends Record<string, unknown>>(current: Config, update: T): T {
  const out = structuredClone(update) as Record<string, unknown>;

  const ai = out.ai as { apiKey?: string } | undefined;
  if (ai && ai.apiKey === '' && current.ai?.apiKey) ai.apiKey = current.ai.apiKey;

  const search = out.externalSearch as { braveApiKey?: string; tavilyApiKey?: string } | undefined;
  if (search) {
    if (search.braveApiKey === '' && current.externalSearch?.braveApiKey) {
      search.braveApiKey = current.externalSearch.braveApiKey;
    }
    if (search.tavilyApiKey === '' && current.externalSearch?.tavilyApiKey) {
      search.tavilyApiKey = current.externalSearch.tavilyApiKey;
    }
  }

  const oidc = out.oidc as { providers?: Array<{ id?: string; clientSecret?: string }> } | undefined;
  for (const p of oidc?.providers ?? []) {
    if (p.clientSecret === '') {
      const prev = current.oidc?.providers?.find((x) => x.id === p.id);
      if (prev?.clientSecret) p.clientSecret = prev.clientSecret;
    }
  }

  const tokens = out.apiTokens as { items?: Array<{ id?: string; tokenHash?: string }> } | undefined;
  for (const t of tokens?.items ?? []) {
    if (t.tokenHash === '') {
      const prev = current.apiTokens?.items?.find((x) => x.id === t.id);
      if (prev?.tokenHash) t.tokenHash = prev.tokenHash;
    }
  }

  return out as T;
}

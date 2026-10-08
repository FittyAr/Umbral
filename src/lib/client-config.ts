import type { Config } from './schema';

/**
 * Saneado del config antes de serializarlo a HTML.
 *
 * El config vive en `data/config.json` y mezcla lo que el portal necesita
 * para renderizar (branding, tema, tarjetas) con secretos que nunca deben
 * salir del servidor: el hash de la password, el token CSRF, la API key de
 * IA, los client secrets de OIDC y los seeds TOTP de cada usuario.
 *
 * Cualquier lugar que emita el config al cliente tiene que pasarlo por acá.
 * La lista de campos es explícita y no un allowlist genérico a propósito:
 * si mañana se agrega una sección con un secreto nuevo, el test de
 * `tests/client-config.test.ts` recorre el schema buscando nombres
 * sospechosos y falla hasta que se agregue acá.
 */
export const SECRET_PLACEHOLDER = '';

export function sanitizeConfigForClient(config: Config): Config {
  const clone = structuredClone(config) as Record<string, unknown>;

  // `auth` entero: no tiene un solo campo que el cliente necesite, y
  // contiene el hash de la password del super-admin, el CSRF y los users
  // con su propio hash y su seed TOTP.
  delete clone.auth;

  const ai = clone.ai as { apiKey?: string } | undefined;
  if (ai?.apiKey) ai.apiKey = SECRET_PLACEHOLDER;

  const search = clone.externalSearch as { braveApiKey?: string; tavilyApiKey?: string } | undefined;
  if (search?.braveApiKey) search.braveApiKey = SECRET_PLACEHOLDER;
  if (search?.tavilyApiKey) search.tavilyApiKey = SECRET_PLACEHOLDER;

  const oidc = clone.oidc as { providers?: Array<{ clientSecret?: string }> } | undefined;
  for (const provider of oidc?.providers ?? []) {
    if (provider.clientSecret) provider.clientSecret = SECRET_PLACEHOLDER;
  }

  // Los tokens de API guardan sólo el hash bcrypt, pero un hash sigue
  // siendo material para atacar offline.
  const tokens = clone.apiTokens as { items?: Array<{ tokenHash?: string }> } | undefined;
  for (const item of tokens?.items ?? []) {
    if (item.tokenHash) item.tokenHash = SECRET_PLACEHOLDER;
  }

  return clone as unknown as Config;
}

/**
 * Config para el panel de un admin: lo mismo que `sanitizeConfigForClient`
 * (sin API keys, client secrets ni hashes de tokens) más la parte de `auth`
 * que el panel de usuarios edita, sin hashes ni seeds TOTP. `totpSecret`
 * viaja como `'active'` o `null` para que la UI sepa si el user tiene 2FA.
 *
 * Al guardar, el server repone los secretos que el cliente manda vacíos
 * (ver `saveConfig` con `source: 'client'`).
 */
export function sanitizeConfigForAdmin(config: Config): Config {
  const clone = sanitizeConfigForClient(config) as Record<string, unknown>;
  clone.auth = {
    users: (config.auth?.users ?? []).map((u) => ({
      ...u,
      passwordHash: SECRET_PLACEHOLDER,
      totpSecret: u.totpSecret ? 'active' : null,
      oidcSubject: u.oidcSubject ? 'linked' : null,
    })),
    singlePasswordEnabled: config.auth?.singlePasswordEnabled ?? true,
  };
  return clone as unknown as Config;
}

/** Config según el rol: el admin ve lo editable de auth; el resto, nada. */
export function sanitizeConfigForRole(config: Config, isAdmin: boolean): Config {
  return isAdmin ? sanitizeConfigForAdmin(config) : sanitizeConfigForClient(config);
}

/**
 * Serializa `value` para un `<script type="application/json">`. El navegador
 * no ejecuta ese bloque (no necesita 'unsafe-inline' en la CSP), pero el
 * parser de HTML igual corta en `</script`: se escapan `<`, `>` y `&` para
 * que ningún string del config pueda cerrar el bloque ni abrir un comentario.
 */
export function serializeJsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null).replace(
    /[<>&]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

/** Datos de boot que lee `public/js/boot.js` (ver BootData en ese archivo). */
export interface BootData {
  base: string;
  demo: boolean;
  portal?: string;
  demoConfig?: Config;
}

/**
 * Datos de boot compartidos por los dos layouts. Viajan como JSON y los
 * vuelca a `window` el script externo `public/js/boot.js`, sin JS inline.
 *
 * `demoConfig` (→ `__INITIAL_DEMO_CONFIG__`) sólo existe para que
 * `public/demo-runtime.js` tenga una semilla con la que arrancar el backend
 * simulado del build estático, así que se emite únicamente en builds demo y
 * ya saneado.
 */
export function buildBootData(options: {
  base: string;
  isDemoBuild: boolean;
  config: Config;
  /** Portal de la página (multi-portal). Los fetch del cliente lo mandan en
   *  `x-umbral-portal` para que la API resuelva el mismo portal (un portal
   *  servido por prefijo de path no se reconoce por la URL de la API). */
  portalId?: string;
}): BootData {
  const data: BootData = { base: options.base, demo: options.isDemoBuild };
  if (options.portalId && options.portalId !== 'default') data.portal = options.portalId;
  if (options.isDemoBuild) data.demoConfig = sanitizeConfigForClient(options.config);
  return data;
}

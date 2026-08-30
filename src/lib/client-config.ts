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
 * Script inline de boot compartido por los dos layouts.
 *
 * `__INITIAL_DEMO_CONFIG__` sólo existe para que `public/demo-runtime.js`
 * tenga una semilla con la que arrancar el backend simulado del build
 * estático, así que se emite únicamente en builds demo y ya saneado.
 */
export function buildBootScript(options: {
  base: string;
  isDemoBuild: boolean;
  config: Config;
}): string {
  const parts = [
    `window.__BASE_URL__ = ${JSON.stringify(options.base)};`,
    `window.__UMBRAL_DEMO__ = ${options.isDemoBuild ? 'true' : 'false'};`,
  ];
  if (options.isDemoBuild) {
    const seed = JSON.stringify(sanitizeConfigForClient(options.config));
    parts.push(`window.__INITIAL_DEMO_CONFIG__ = ${seed};`);
  }
  return parts.join(' ');
}

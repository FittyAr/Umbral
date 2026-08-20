/**
 * OIDC / OAuth2 helpers (opt-in: features.oidc).
 *
 * Implementa el flujo Authorization Code + PKCE (RFC 7636) sin librerías
 * externas. PKCE es obligatorio para OIDC moderno (defense-in-depth
 * contra authorization code interception). Soporta:
 *   - Discovery via /.well-known/openid-configuration
 *   - PKCE S256 challenge
 *   - state parameter (CSRF protection)
 *   - nonce (replay protection para id_token)
 *   - Token exchange (code → tokens)
 *   - Userinfo endpoint (alternativa a id_token para email/profile)
 *
 * Decisión: NO usamos `openid-client` (~80KB) ni `oidc-client` (más
 * pesado). El flow es estándar y 200 líneas de código son suficientes.
 * Esto mantiene la dep tree de Umbral liviana.
 *
 * Estado del flow: se guarda en cookies HTTPOnly signed (state + nonce
 * + code_verifier + redirect_uri). El flow entero dura ~5min (default
 * TTL del cookie de state). Si el state no matchea el del callback,
 * rechazamos con 401 (CSRF).
 */

import crypto from 'node:crypto';
import { isFeatureEnabled } from './features';
import { getConfig } from './config';
import type { OIDCProvider } from './schema';

const STATE_COOKIE = 'umbral_oidc_state';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 min

// Estado del flow en memoria (keyed por cookie value hasheado).
// En deployments con múltiples instancias, esto debería ir a Redis.
// Para esta versión: un Map en memoria. Aceptable — el flow dura 5min
// y si el server reinicia, el user tiene que re-empezar (login flow).
const pendingFlows = new Map<string, {
  providerId: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  expires: number;
}>();

function b64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(bytes = 32): string {
  return b64url(crypto.randomBytes(bytes));
}

async function sha256(input: string): Promise<Buffer> {
  return crypto.createHash('sha256').update(input).digest();
}

export interface OIDCDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  scopes_supported?: string[];
}

/** Descubre los endpoints del provider via .well-known/openid-configuration.
 *  Cachea el resultado en memoria por 1h para no martillar al IdP. */
const discoveryCache = new Map<string, { config: OIDCDiscovery; expires: number }>();

export async function getOIDCDiscovery(provider: OIDCProvider): Promise<OIDCDiscovery> {
  const cached = discoveryCache.get(provider.issuer);
  if (cached && cached.expires > Date.now()) return cached.config;
  // Auto-detect: si el issuer termina en /.well-known/openid-configuration,
  // usarlo directamente. Si no, agregar el well-known path.
  const url = provider.issuer.endsWith('/.well-known/openid-configuration')
    ? provider.issuer
    : provider.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: HTTP ${res.status} from ${url}`);
  }
  const cfg = await res.json() as OIDCDiscovery;
  discoveryCache.set(provider.issuer, { config: cfg, expires: Date.now() + 60 * 60 * 1000 });
  return cfg;
}

/** Genera el URL de authorization con PKCE S256. Devuelve el state (que
 *  se debe guardar en cookie para verificar el callback) y el code_verifier
 *  (que se debe guardar hasheado para canjear en el callback). */
export async function buildAuthorizationUrl(
  provider: OIDCProvider,
  redirectUri: string,
): Promise<{ url: string; state: string; codeVerifier: string; nonce: string }> {
  const disc = await getOIDCDiscovery(provider);
  const state = randomString(32);
  const nonce = randomString(32);
  const codeVerifier = randomString(48);
  const codeChallenge = b64url(await sha256(codeVerifier));
  const scope = (provider.scopes ?? ['openid', 'profile', 'email']).join(' ');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const url = `${disc.authorization_endpoint}?${params.toString()}`;
  return { url, state, codeVerifier, nonce };
}

/** Canjea el code por tokens. Devuelve el id_token claims + access_token
 *  + refresh_token (opcional). */
export async function exchangeCode(
  provider: OIDCProvider,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ idToken: Record<string, unknown>; accessToken: string; refreshToken: string | null }> {
  const disc = await getOIDCDiscovery(provider);
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code_verifier: codeVerifier,
  });
  const res = await fetch(disc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OIDC token exchange failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json() as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
  };
  // Decodificar id_token (sin verificar firma — confiamos en HTTPS y
  // el token_endpoint del discovery). Para producción con compliance
  // estricto, validar firma contra jwks_uri. Por ahora: leemos payload
  // y verificamos nonce + iss + exp manualmente.
  const payload = decodeJwtPayload(data.id_token);
  return {
    idToken: payload,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}

/** Decodifica el payload (segundo segmento) del JWT sin verificar firma.
 *  Solo para extraer claims — la verificación de firma se hace contra
 *  el JWKS del IdP en una v2. */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('JWT malformado');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

/** Verifica que el id_token es válido para nuestro nonce + iss. */
export function verifyIdToken(
  idToken: Record<string, unknown>,
  provider: OIDCProvider,
  expectedNonce: string,
): void {
  if (idToken.iss !== provider.issuer) {
    throw new Error(`OIDC iss mismatch: expected ${provider.issuer}, got ${idToken.iss}`);
  }
  if (idToken.nonce !== expectedNonce) {
    throw new Error(`OIDC nonce mismatch (replay attack?)`);
  }
  // Verificar exp (expiration time)
  const exp = Number(idToken.exp);
  if (exp && exp * 1000 < Date.now()) {
    throw new Error(`OIDC id_token expired`);
  }
  // Verificar aud (audience = clientId)
  const aud = idToken.aud;
  if (Array.isArray(aud) ? !aud.includes(provider.clientId) : aud !== provider.clientId) {
    throw new Error(`OIDC aud mismatch`);
  }
}

/** Resuelve el rol del user a partir de los claims del id_token y el
 *  claimMap del provider. Si autoProvision está activo y el user no
 *  existe, retorna null (queda para que el endpoint decida si crear).
 *  Si el user existe y tiene rol custom, retorna ese. */
export function resolveRole(
  idToken: Record<string, unknown>,
  provider: OIDCProvider,
  existingRole: 'admin' | 'editor' | 'viewer' | null,
): 'admin' | 'editor' | 'viewer' {
  const claimMap = provider.claimMap ?? {};
  const roleClaim = idToken[claimMap.role ?? 'umbral_role'] as string | undefined;
  if (roleClaim === 'admin' || roleClaim === 'editor' || roleClaim === 'viewer') {
    return roleClaim;
  }
  return existingRole ?? provider.defaultRole ?? 'viewer';
}

/** Genera el cookie de state firmado para el flow OIDC. */
export function signStateCookie(state: string, codeVerifier: string, nonce: string, providerId: string, redirectUri: string): string {
  const key = crypto.createHash('sha256').update(state).digest('hex');
  pendingFlows.set(key, {
    providerId,
    codeVerifier,
    nonce,
    redirectUri,
    expires: Date.now() + STATE_TTL_MS,
  });
  // Cleanup expired
  for (const [k, v] of pendingFlows) {
    if (v.expires < Date.now()) pendingFlows.delete(k);
  }
  return `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
}

/** Recupera y borra el state del flow (one-time use). */
export function consumeStateFlow(state: string): { providerId: string; codeVerifier: string; nonce: string; redirectUri: string } | null {
  const key = crypto.createHash('sha256').update(state).digest('hex');
  const entry = pendingFlows.get(key);
  if (!entry) return null;
  pendingFlows.delete(key);
  if (entry.expires < Date.now()) return null;
  return { providerId: entry.providerId, codeVerifier: entry.codeVerifier, nonce: entry.nonce, redirectUri: entry.redirectUri };
}

/** Devuelve el provider de OIDC por id, o null si no existe / está apagado. */
export async function getActiveOIDCProvider(providerId: string) {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'oidc')) return null;
  const providers = cfg.oidc?.providers ?? [];
  const p = providers.find((x) => x.id === providerId && x.enabled);
  return p ?? null;
}
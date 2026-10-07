import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';
import type { Config } from './schema';

export const SESSION_COOKIE = 'umbral_session';
export const CSRF_HEADER = 'x-csrf-token';
const BCRYPT_COST = 12;

// ──────────────────────────────────────────────────────────────────────────
// Crypto helpers
// ──────────────────────────────────────────────────────────────────────────
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** Detecta si el password actual es uno de los default inseguros comunes
 *  (admin, changeme, default, password, 12345678, etc.) sin necesidad
 *  de tener el plaintext. Para cada candidate, usamos bcrypt.compare
 *  contra el hash guardado. Si matchea, es default. Limitaciones: bcrypt
 *  es lento (~200ms por hash con cost 12). Con ~10 candidates son ~2s.
 *  Solo se corre en el endpoint /api/auth/check-default-password, no en
 *  cada request. */
const DEFAULT_CANDIDATE_PASSWORDS = [
  'admin', 'changeme', 'default', 'password', '12345678', 'umbral', 'admin123', 'root', 'toor', 'test', 'guest',
];
export async function isDefaultPasswordHash(hash: string): Promise<boolean> {
  for (const candidate of DEFAULT_CANDIDATE_PASSWORDS) {
    try {
      if (await bcrypt.compare(candidate, hash)) return true;
    } catch { continue; }
  }
  return false;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Session token (signed, opaque, no JWT lib needed)
// ──────────────────────────────────────────────────────────────────────────
// Cache the secret at module load so signing and verifying use the SAME value.
// Generating a new secret per call would invalidate every token on first verify.
let _secret: string | null = null;
let _secretChecked = false;

declare global {
  // Vite SSR can instantiate auth.ts more than once in dev; share the dev
  // fallback secret process-wide so login (sign) and middleware (verify) match.
  // eslint-disable-next-line no-var
  var __umbralSessionSecret: string | undefined;
}

// Lista de SESSION_SECRETs conocidos (de .env.example y docker-compose).
// Si el deploy está usando uno de estos en producción, es un compromiso
// de facto: cualquiera con acceso al repo público puede forjar sesiones.
const KNOWN_WEAK_SECRETS = new Set([
  'change-me-please-this-is-32-chars-or-more',
  'change-me-in-production-use-openssl-rand-hex-32',
  'changeme',
  'secret',
  'development-secret-key-please-change-in-production',
]);

function getSecret(): string {
  if (_secret) return _secret;
  if (globalThis.__umbralSessionSecret) {
    _secret = globalThis.__umbralSessionSecret;
    return _secret;
  }
  const s = process.env.SESSION_SECRET;
  // En producción un secreto público (de .env.example o docker-compose) es
  // un compromiso de facto: cualquiera con el repo puede forjar sesiones.
  // No lo usamos: caemos al secreto aleatorio, que invalida sesiones al
  // reiniciar pero no se puede adivinar.
  const weakInProd = !!s && process.env.NODE_ENV === 'production' && KNOWN_WEAK_SECRETS.has(s);
  if (weakInProd && !_secretChecked) {
    console.error(
      '\n[umbral FATAL] SESSION_SECRET está usando un valor conocido (de .env.example o docker-compose).\n' +
      'Se ignora y se usa un secreto aleatorio: las sesiones se pierden en cada reinicio.\n' +
      'Generá uno con `openssl rand -hex 32` y pasalo vía -e SESSION_SECRET=... o .env.\n',
    );
  }
  if (s && s.length >= 16 && !weakInProd) {
    _secretChecked = true;
    _secret = s;
    globalThis.__umbralSessionSecret = _secret;
    return _secret;
  }
  // Dev fallback — in prod this is set by docker-compose.
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[umbral] SESSION_SECRET not set or too short. Using a random secret (sessions will invalidate on restart).',
    );
  }
  _secretChecked = true;
  _secret = crypto.randomBytes(32).toString('hex');
  globalThis.__umbralSessionSecret = _secret;
  return _secret;
}

/** Secreto del server (firma de sesiones, cifrado de los seeds TOTP). */
export function getSessionSecret(): string {
  return getSecret();
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────
// Session token
// ──────────────────────────────────────────────────────────────────────────
// Formato: v2.<id>.<subject>.<iat>.<authEpoch>.<userEpoch>.<hmac>
//
// - subject: `legacy` (password único / super-admin) o `u-<base64url(userId)>`.
//   El token anterior no decía de qué usuario era: se validaba probando el
//   userEpoch de cada user, y como todo user nuevo arranca con userEpoch 0
//   —igual que el token legacy— cualquier usuario recién creado entraba como
//   super-admin.
// - iat: segundos epoch de emisión. La expiración la impone el server
//   (security.session.ttlHours), no sólo el Max-Age de la cookie.
// - id: identificador aleatorio de la sesión; se usa para derivar el CSRF
//   por sesión y para revocarla en el logout.
export const LEGACY_SUBJECT = 'legacy';

export interface SessionClaims {
  id: string;
  /** 'legacy' o el id del usuario. */
  subject: string;
  iat: number;
  authEpoch: number;
  userEpoch: number;
}

function encodeSubject(subject: string): string {
  return subject === LEGACY_SUBJECT ? LEGACY_SUBJECT : `u-${Buffer.from(subject, 'utf8').toString('base64url')}`;
}

function decodeSubject(raw: string): string | null {
  if (raw === LEGACY_SUBJECT) return LEGACY_SUBJECT;
  if (!raw.startsWith('u-')) return null;
  const decoded = Buffer.from(raw.slice(2), 'base64url').toString('utf8');
  return decoded.length > 0 ? decoded : null;
}

export function createSessionToken(opts: {
  subject: string;
  authEpoch: number;
  userEpoch?: number;
  now?: number;
}): string {
  const id = generateToken(24);
  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const payload = `v2.${id}.${encodeSubject(opts.subject)}.${iat}.${opts.authEpoch}.${opts.userEpoch ?? 0}`;
  return `${payload}.${sign(payload)}`;
}

/** Verifica la firma y devuelve los claims. No chequea epochs ni expiración:
 *  eso depende del config y lo hace `resolveSession`. */
export function parseSessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 7 || parts[0] !== 'v2') return null;
  const sig = parts[6];
  const payload = parts.slice(0, 6).join('.');
  if (!safeEqual(sig, sign(payload))) return null;
  const subject = decodeSubject(parts[2]);
  const iat = Number(parts[3]);
  const authEpoch = Number(parts[4]);
  const userEpoch = Number(parts[5]);
  if (!subject || ![iat, authEpoch, userEpoch].every(Number.isSafeInteger)) return null;
  return { id: parts[1], subject, iat, authEpoch, userEpoch };
}

/** Comparación en tiempo constante de dos strings (CSRF, firmas). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** CSRF por sesión: HMAC del id de la sesión y del token CSRF base del
 *  config. Rotar el base (cambio de password, rotateCsrfOnLogin) invalida
 *  los CSRF de todas las sesiones; cada sesión tiene el suyo, así que un
 *  usuario no puede usar el de otro. */
export function csrfForSession(sessionId: string, baseCsrf: string): string {
  return crypto.createHmac('sha256', getSecret()).update(`csrf.${sessionId}.${baseCsrf}`).digest('hex');
}

/** CSRF para el token de sesión recién emitido (login, cambio de password). */
export function csrfForToken(token: string, baseCsrf: string): string {
  const claims = parseSessionToken(token);
  return claims ? csrfForSession(claims.id, baseCsrf) : '';
}

// Sesiones revocadas por logout: id → vencimiento (ms). En memoria: alcanza
// porque cada sesión vence sola a las ttlHours; un reinicio sólo deja vivas
// las cookies cerradas que alguien haya copiado antes del logout.
declare global {
  // eslint-disable-next-line no-var
  var __umbralRevokedSessions: Map<string, number> | undefined;
}
const MAX_REVOKED = 10_000;

function revokedSessions(): Map<string, number> {
  return (globalThis.__umbralRevokedSessions ??= new Map());
}

export function revokeSession(claims: SessionClaims, ttlHours: number): void {
  const revoked = revokedSessions();
  const now = Date.now();
  if (revoked.size >= MAX_REVOKED) {
    for (const [id, exp] of revoked) if (exp <= now) revoked.delete(id);
    // Si sigue lleno, descartamos las más viejas (Map preserva el orden).
    for (const id of revoked.keys()) {
      if (revoked.size < MAX_REVOKED) break;
      revoked.delete(id);
    }
  }
  revoked.set(claims.id, claims.iat * 1000 + ttlHours * 3600_000);
}

function isRevoked(id: string): boolean {
  const exp = revokedSessions().get(id);
  if (exp === undefined) return false;
  if (exp <= Date.now()) {
    revokedSessions().delete(id);
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────────
// Session middleware helpers
// ──────────────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'editor' | 'viewer';

export interface AuthContext {
  isAuthenticated: boolean;
  /** CSRF de esta sesión (derivado del id de la sesión). Null sin sesión. */
  csrfToken: string | null;
  /** "legacy" si entró con el password único, username si entró con su
   *  cuenta, `token:<nombre>` con API token. Null si no está autenticado. */
  actor: string | null;
  /** Rol efectivo. El legacy super-admin es 'admin'. */
  role: Role | null;
  /** true si el rol es admin (user admin, legacy o token de escritura). */
  isAdmin: boolean;
  /** username del user actual, o null. Útil para el audit log. */
  username: string | null;
  /** id del user (multi-user), o null. */
  userId?: string | null;
  /** Claims de la sesión (para logout/revocación). */
  session?: SessionClaims | null;
  /** true si la autenticación provino de un Bearer API token. */
  isApiToken?: boolean;
}

export const ANONYMOUS: AuthContext = Object.freeze({
  isAuthenticated: false,
  csrfToken: null,
  actor: null,
  role: null,
  isAdmin: false,
  username: null,
  userId: null,
  session: null,
}) as AuthContext;

/** Valida los claims contra el config vigente y resuelve el principal. */
export function resolveSession(
  claims: SessionClaims | null,
  cfg: Pick<Config, 'auth' | 'security'>,
  now: number = Date.now(),
): AuthContext {
  if (!claims || !cfg.auth) return ANONYMOUS;
  if (claims.authEpoch !== (cfg.auth.authEpoch ?? 0)) return ANONYMOUS;
  const ttlSec = cfg.security.session.ttlHours * 3600;
  const nowSec = Math.floor(now / 1000);
  // 60s de tolerancia hacia el futuro por relojes desfasados.
  if (claims.iat > nowSec + 60 || nowSec - claims.iat > ttlSec) return ANONYMOUS;
  if (isRevoked(claims.id)) return ANONYMOUS;

  const baseCsrf = cfg.auth.csrfToken;
  const users = cfg.auth.users ?? [];
  if (claims.subject === LEGACY_SUBJECT) {
    // El password único deja de valer si el admin lo deshabilitó.
    if (users.length > 0 && cfg.auth.singlePasswordEnabled === false) return ANONYMOUS;
    if (claims.userEpoch !== 0) return ANONYMOUS;
    return {
      isAuthenticated: true,
      csrfToken: csrfForSession(claims.id, baseCsrf),
      actor: 'legacy',
      role: 'admin',
      isAdmin: true,
      username: null,
      userId: null,
      session: claims,
    };
  }
  const user = users.find((u) => u.id === claims.subject);
  if (!user || user.userEpoch !== claims.userEpoch) return ANONYMOUS;
  return {
    isAuthenticated: true,
    csrfToken: csrfForSession(claims.id, baseCsrf),
    actor: user.username,
    role: user.role,
    isAdmin: user.role === 'admin',
    username: user.username,
    userId: user.id,
    session: claims,
  };
}

/** Loads the current config (with auth) and returns the auth state for the request. */
export async function buildAuthContext(request: Request): Promise<AuthContext> {
  const cookie = parseCookie(request.headers.get('cookie') || '');
  const token = cookie[SESSION_COOKIE];
  const cfg = await getConfig();

  // Sin cookie pero con Authorization: API token (si la feature está activa).
  if (!token && request.headers.has('authorization')) {
    const { verifyApiToken } = await import('./api-tokens');
    const apiAuth = await verifyApiToken(request);
    if (apiAuth.valid && apiAuth.token) {
      const isWrite = apiAuth.token.scope === 'write';
      return {
        isAuthenticated: true,
        csrfToken: null,
        actor: `token:${apiAuth.token.name}`,
        role: isWrite ? 'admin' : 'viewer',
        isAdmin: isWrite,
        username: null,
        userId: null,
        session: null,
        isApiToken: true,
      };
    }
  }

  return resolveSession(parseSessionToken(token), cfg);
}

export function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function buildSessionCookie(token: string): Promise<string> {
  const cfg = await getConfig();
  const session = cfg.security.session;
  const domain = cfg.security.network.cookieDomain;
  const maxAge = session.ttlHours * 3600;
  // Secure sólo si el deployment real es HTTPS. Chequear BASE_URL es la señal
  // más confiable (la setea docker-compose o el admin). NO usar NODE_ENV=production
  // como proxy — un deploy HTTP en producción quedaría sin cookies.
  const isHttps =
    session.cookieSecure === 'always' ||
    (session.cookieSecure === 'auto' && process.env.BASE_URL?.startsWith('https://') === true);
  const secure = isHttps ? '; Secure' : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${session.cookieSameSite}${secure}${domainPart}; Max-Age=${maxAge}`;
}

export async function clearSessionCookie(): Promise<string> {
  // Mismo handling que buildSessionCookie: leemos la config para no romper
  // el logout cuando el admin configuró SameSite=None + Secure.
  const cfg = await getConfig();
  const session = cfg.security.session;
  const domain = cfg.security.network.cookieDomain;
  // Mismo criterio que buildSessionCookie: Secure solo si HTTPS real.
  // NO usar NODE_ENV como proxy (un deploy HTTP en prod quedaría sin logout).
  const isHttps =
    session.cookieSecure === 'always' ||
    (session.cookieSecure === 'auto' && process.env.BASE_URL?.startsWith('https://') === true);
  const secure = isHttps ? '; Secure' : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${session.cookieSameSite}${secure}${domainPart}; Max-Age=0`;
}

// El rate limit vive en rate-limit.ts; se re-exporta para no tocar a su
// unico consumidor (POST /api/login).
export { checkRateLimit, type RateLimitResult } from './rate-limit.ts';

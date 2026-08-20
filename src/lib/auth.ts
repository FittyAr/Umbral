import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';

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
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) {
    if (!_secretChecked && process.env.NODE_ENV === 'production' && KNOWN_WEAK_SECRETS.has(s)) {
      console.error(
        '\n[umbral FATAL] SESSION_SECRET está usando un valor conocido (de .env.example o docker-compose).\n' +
        'Esto es un riesgo crítico de seguridad: cualquiera puede forjar sesiones.\n' +
        'Generá uno con `openssl rand -hex 32` y pasalo vía -e SESSION_SECRET=... o .env.\n' +
        'El server sigue corriendo para no romper sesiones existentes, pero cambiá esto YA.\n',
      );
    }
    _secretChecked = true;
    _secret = s;
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
  return _secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Create a signed session token: <id>.<authEpoch>.<userEpoch>.<hmac>.
 *  Para el modo legacy (single password), userEpoch=0. El userEpoch permite
 *  invalidar sesiones de un user específico cuando cambia su password,
 *  sin tocar a los demás. */
export function createSessionToken(authEpoch: number, userEpoch: number = 0): string {
  const id = generateToken(24);
  const payload = `${id}.${authEpoch}.${userEpoch}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  authEpoch: number,
  userEpoch: number = 0,
): boolean {
  if (!token) return false;
  // Formato: <id>.<authEpoch>.<userEpoch>.<sig>. Usamos split con límite
  // para tolerar tokens viejos de 3 partes (los rechazamos, no son válidos).
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [id, tokenAuthEpoch, tokenUserEpoch, sig] = parts;
  if (tokenAuthEpoch !== String(authEpoch)) return false;
  if (tokenUserEpoch !== String(userEpoch)) return false;
  const payload = `${id}.${tokenAuthEpoch}.${tokenUserEpoch}`;
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

// ──────────────────────────────────────────────────────────────────────────
// Session middleware helpers
// ──────────────────────────────────────────────────────────────────────────
export interface AuthContext {
  isAuthenticated: boolean;
  csrfToken: string | null;
  /** "legacy" si entró con el password único, username si entró con su
   *  cuenta. Null si no está autenticado. Útil para el audit log. */
  actor: string | null;
  /** Rol del user actual ('admin' | 'editor' | 'viewer') o null si no
   *  está autenticado o es legacy super-admin (que se considera admin). */
  role: 'admin' | 'editor' | 'viewer' | null;
  /** true si el user actual tiene permisos de admin (sea user admin o
   *  legacy super-admin). La UI lo usa para gating. */
  isAdmin: boolean;
  /** username del user actual, o null. Útil para el audit log. */
  username: string | null;
  /** true si la autenticación provino de un Bearer API token. */
  isApiToken?: boolean;
}

/** Loads the current config (with auth) and returns the auth state for the request. */
export async function buildAuthContext(request: Request): Promise<AuthContext> {
  const cookie = parseCookie(request.headers.get('cookie') || '');
  const token = cookie[SESSION_COOKIE];
  const cfg = await getConfig();

  // Si no hay cookie pero hay Authorization header y apiTokens está activo:
  if (!token && (request.headers.has('authorization') || request.headers.has('Authorization'))) {
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
        isApiToken: true,
      };
    }
  }

  const authEpoch = cfg.auth?.authEpoch ?? 0;

  // Si no hay users[] en config, modo legacy — verificamos sólo con
  // authEpoch (userEpoch=0).
  const users = cfg.auth?.users ?? [];
  if (users.length === 0) {
    const ok = verifySessionToken(token, authEpoch, 0);
    return {
      isAuthenticated: ok,
      csrfToken: cfg.auth?.csrfToken ?? null,
      actor: ok ? 'legacy' : null,
      role: ok ? 'admin' : null,
      isAdmin: ok,
      username: null,
    };
  }

  // Modo multi-user: el token puede ser legacy (super-admin) o per-user.
  // Probamos legacy primero.
  const cfgSingleEnabled = cfg.auth?.singlePasswordEnabled !== false;
  if (cfgSingleEnabled) {
    const legacyOk = verifySessionToken(token, authEpoch, 0);
    if (legacyOk) {
      return {
        isAuthenticated: true,
        csrfToken: cfg.auth?.csrfToken ?? null,
        actor: 'legacy',
        role: 'admin',
        isAdmin: true,
        username: null,
      };
    }
  }

  // Multi-user: el payload del token no incluye el userId (lo podríamos
  // agregar pero requeriría DB lookup en cada verify). Como alternativa,
  // validamos probando contra el userEpoch de CADA user. El que matchee
  // es el user activo. Esto es O(n) por request pero n es chico (típicamente
  // <10) y solo se ejecuta cuando hay un token.
  for (const u of users) {
    const ok = verifySessionToken(token, authEpoch, u.userEpoch);
    if (ok) {
      return {
        isAuthenticated: true,
        csrfToken: cfg.auth?.csrfToken ?? null,
        actor: u.username,
        role: u.role,
        isAdmin: u.role === 'admin',
        username: u.username,
      };
    }
  }

  return {
    isAuthenticated: false,
    csrfToken: cfg.auth?.csrfToken ?? null,
    actor: null,
    role: null,
    isAdmin: false,
    username: null,
  };
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

// ──────────────────────────────────────────────────────────────────────────
// Rate limit (in-memory, per IP)
// ──────────────────────────────────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInSec: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: max - 1, resetInSec: windowSec };
  }
  entry.count++;
  const resetInSec = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > max) {
    return { ok: false, remaining: 0, resetInSec };
  }
  return { ok: true, remaining: max - entry.count, resetInSec };
}

// Periodic cleanup of stale entries (avoid unbounded growth)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (v.resetAt < now) rateLimitMap.delete(k);
  }
}, 5 * 60 * 1000).unref();

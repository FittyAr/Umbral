import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';

export const SESSION_COOKIE = 'hp_session';
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
function getSecret(): string {
  if (_secret) return _secret;
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) {
    _secret = s;
    return _secret;
  }
  // Dev fallback — in prod this is set by docker-compose.
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[homepage] SESSION_SECRET not set or too short. Using a random secret (sessions will invalidate on restart).',
    );
  }
  _secret = crypto.randomBytes(32).toString('hex');
  return _secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Create a signed session token: <id>.<epoch>.<hmac>.
 *  El epoch va firmado adentro del HMAC (parte del payload) → un atacante
 *  no puede bajar el epoch de su propio token para "revivir" una sesión
 *  invalidada por cambio de password. */
export function createSessionToken(epoch: number): string {
  const id = generateToken(24);
  const payload = `${id}.${epoch}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null, epoch: number): boolean {
  if (!token) return false;
  // Formato: <id>.<epoch>.<sig>. Usamos split con límite para tolerar
  // tokens viejos de 2 partes (los rechazamos, no son válidos).
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [id, tokenEpoch, sig] = parts;
  // Epoch debe matchear exactamente — no parseamos, comparison string→number
  // puede traer surprises con leading zeros o NaN.
  if (tokenEpoch !== String(epoch)) return false;
  const payload = `${id}.${tokenEpoch}`;
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
}

/** Loads the current config (with auth) and returns the auth state for the request. */
export async function buildAuthContext(request: Request): Promise<AuthContext> {
  const cookie = parseCookie(request.headers.get('cookie') || '');
  const token = cookie[SESSION_COOKIE];
  const cfg = await getConfig();
  const epoch = cfg.auth?.authEpoch ?? 0;
  return {
    isAuthenticated: verifySessionToken(token, epoch),
    csrfToken: cfg.auth?.csrfToken ?? null,
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

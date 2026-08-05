import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';

export const SESSION_COOKIE = 'hp_session';
export const CSRF_HEADER = 'x-csrf-token';
export const SESSION_TTL_HOURS = 24;
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
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    // Dev fallback — in prod this is set by docker-compose.
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[homepage] SESSION_SECRET not set or too short. Using a random secret (sessions will invalidate on restart).',
      );
    }
    return s && s.length >= 16
      ? s
      : crypto.randomBytes(32).toString('hex');
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Create a signed session token: <random>.<hmac> */
export function createSessionToken(): string {
  const id = generateToken(24);
  return `${id}.${sign(id)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(id);
  // constant-time compare
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
  return {
    isAuthenticated: verifySessionToken(token),
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

export function buildSessionCookie(token: string): string {
  const maxAge = SESSION_TTL_HOURS * 3600;
  const isHttps =
    process.env.BASE_URL?.startsWith('https://') ||
    process.env.NODE_ENV === 'production';
  const secure = isHttps ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
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

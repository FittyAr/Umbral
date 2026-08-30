/**
 * Rate limit en memoria, por clave (hoy la IP del cliente).
 *
 * Vivia en auth.ts, que no es su lugar: no valida credenciales ni sesiones,
 * y lo usa un solo endpoint (POST /api/login). Al ser in-memory, el limite
 * es por proceso: detras de varias instancias hay que contarlo en el proxy.
 */

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
  // Usamos >= (no >) para que el count = max bloquee: el límite documentado
  // es "max attempts" — el maxth request debe ser el que falla, no el
  // (max+1)th. Antes > 30 dejaba pasar el 30th, contaba el 31th como
  // primer fallido. Ahora > = 30 bloquea el 30th.
  if (entry.count >= max) {
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

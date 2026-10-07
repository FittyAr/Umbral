/** Small JSON/HTTP helpers to keep API routes concise. */

export function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, { status });
}

export function noContent(extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  applySecurityHeaders(headers);
  return new Response(null, { status: 204, headers });
}

export interface SecurityHeaderOptions {
  csp?: string | null;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | 'NONE';
  referrerPolicy?: string;
  permissionsPolicy?: string;
  hsts?: 'auto' | 'always' | 'never';
  hstsMaxAge?: number;
  hstsIncludeSubDomains?: boolean;
  hstsPreload?: boolean;
  /** Si se pasa true, se considera que el request es HTTPS. Si no, se
   *  intenta detectar vía BASE_URL. */
  isHttps?: boolean;
}

/** Construye el valor del header Strict-Transport-Security, o null si no aplica. */
function buildHstsValue(opts: SecurityHeaderOptions): string | null {
  if (!opts.isHttps) return null; // HSTS sólo tiene sentido sobre HTTPS
  if (opts.hsts === 'never') return null;
  if (opts.hsts === 'always' || opts.hsts === 'auto') {
    const maxAge = opts.hstsMaxAge ?? 31536000;
    if (maxAge <= 0) return null;
    let v = `max-age=${maxAge}`;
    if (opts.hstsIncludeSubDomains) v += '; includeSubDomains';
    if (opts.hstsPreload) v += '; preload';
    return v;
  }
  return null;
}

/**
 * Apply security headers to an existing Headers object.
 * Defaults are strict; if `csp` is null, no CSP header is sent (permissive).
 * Used by middleware for page responses and by `json()` for API responses.
 */
export function applySecurityHeaders(headers: Headers, opts: SecurityHeaderOptions = {}): void {
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy') && opts.referrerPolicy !== undefined) {
    headers.set('referrer-policy', opts.referrerPolicy);
  } else if (!headers.has('referrer-policy')) {
    headers.set('referrer-policy', 'no-referrer');
  }
  if (!headers.has('x-frame-options') && opts.xFrameOptions && opts.xFrameOptions !== 'NONE') {
    headers.set('x-frame-options', opts.xFrameOptions);
  }
  if (!headers.has('permissions-policy') && opts.permissionsPolicy) {
    headers.set('permissions-policy', opts.permissionsPolicy);
  }
  if (opts.csp && !headers.has('content-security-policy')) {
    headers.set('content-security-policy', opts.csp);
  }
  if (!headers.has('strict-transport-security')) {
    const hsts = buildHstsValue(opts);
    if (hsts) headers.set('strict-transport-security', hsts);
  }
}

export class BodyTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`Body demasiado grande (máx ${maxBytes} bytes)`);
    this.name = 'BodyTooLargeError';
  }
}

/** Default para bodies JSON (el config entero entra holgado). */
export const MAX_JSON_BODY_BYTES = 1024 * 1024;

/**
 * Lee el body contando bytes y corta al pasar `maxBytes`. El middleware ya
 * rechaza un Content-Length grande, pero un request chunked no lo manda y
 * `request.json()`/`formData()` lo bufferizaban entero.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<Buffer> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new BodyTooLargeError(maxBytes);
  if (!request.body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let total = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLargeError(maxBytes);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function readJson<T = unknown>(request: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<T> {
  const buf = await readBodyCapped(request, maxBytes);
  try {
    return JSON.parse(buf.toString('utf8')) as T;
  } catch {
    throw new Error('JSON inválido');
  }
}

/** `formData()` con el mismo tope de bytes que `readBodyCapped`. */
export async function readFormData(request: Request, maxBytes: number): Promise<FormData> {
  const buf = await readBodyCapped(request, maxBytes);
  const contentType = request.headers.get('content-type') || '';
  return new Response(new Uint8Array(buf), { headers: { 'content-type': contentType } }).formData();
}

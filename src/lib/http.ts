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

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('JSON inválido');
  }
}

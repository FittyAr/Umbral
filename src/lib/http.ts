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
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('JSON inválido');
  }
}

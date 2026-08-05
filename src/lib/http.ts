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

export function applySecurityHeaders(headers: Headers) {
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy')) headers.set('referrer-policy', 'no-referrer');
  if (!headers.has('x-frame-options')) headers.set('x-frame-options', 'DENY');
  if (!headers.has('permissions-policy')) {
    headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  }
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('JSON inválido');
  }
}

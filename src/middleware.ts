import { defineMiddleware } from 'astro:middleware';
import { buildAuthContext, CSRF_HEADER } from '~/lib/auth';

const PUBLIC_API_PREFIXES = ['/api/login', '/api/health', '/api/assets/'];
const PUBLIC_PAGE_PATHS = new Set(['/', '/404', '/500', '/manifest.webmanifest', '/sw.js']);
const PUBLIC_PREFIXES = ['/_astro/', '/_image', '/favicon'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Allow public files from /public (anything with an extension, e.g. /icons/x.svg, /manifest.webmanifest)
  if (pathname.startsWith('/icons/')) return true;
  return false;
}

function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // Build auth context for all requests (cheap — single JSON read)
  const auth = await buildAuthContext(request);
  context.locals.auth = auth;
  context.locals.clientIp = clientIp(request);

  // Public routes → pass through
  if (isPublic(pathname)) return next();

  // Admin pages: require session, redirect to /admin if not authed
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    if (!auth.isAuthenticated) {
      return Response.redirect(new URL('/admin', url), 302);
    }
  }

  // Protected API routes: require session + CSRF for unsafe methods
  const isProtectedApi = pathname.startsWith('/api/');
  if (isProtectedApi) {
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const method = request.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const sent = request.headers.get(CSRF_HEADER);
      if (!auth.csrfToken || !sent || sent !== auth.csrfToken) {
        return new Response(JSON.stringify({ error: 'CSRF inválido' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
  }

  return next();
});

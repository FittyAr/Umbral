import { defineMiddleware } from 'astro:middleware';
import { buildAuthContext, CSRF_HEADER } from '~/lib/auth';
import { getConfig } from '~/lib/config';
import { applySecurityHeaders } from '~/lib/http';

const PUBLIC_API_PREFIXES = ['/api/login', '/api/health', '/api/assets/'];
const PUBLIC_PAGE_PATHS = new Set(['/', '/404', '/500', '/manifest.webmanifest', '/sw.js']);
// Prefijos que matchean cualquier URL que EMPIEZA con ellos.
// `_image` se matchea como exact (es un archivo estático, no un prefijo de
// assets dinámicos — antes matcheaba `/_image-foo` también, lo cual era un
// false positive molesto).
const PUBLIC_PREFIXES: ReadonlyArray<string> = ['/_astro/', '/favicon'];
const PUBLIC_EXACT = new Set<string>(['/_image']);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith('/icons/')) return true;
  return false;
}

function clientIp(request: Request, trustForwarded: boolean): string {
  if (trustForwarded) {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = request.headers.get('x-real-ip');
    if (xri) return xri;
  }
  return 'unknown';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // Pull config once (cached) for security/network/headers settings.
  const cfg = await getConfig();
  const headersCfg = cfg.security.headers;
  const netCfg = cfg.security.network;
  const csrfPolicy = cfg.security.auth.csrfPolicy;

  const auth = await buildAuthContext(request);
  context.locals.auth = auth;
  context.locals.clientIp = clientIp(request, netCfg.trustForwardedFor);

  // Admin pages: redirect unauthed to /admin (the login page).
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    if (!auth.isAuthenticated) {
      return Response.redirect(new URL('/admin', url), 302);
    }
  }

  // Protected API routes (everything under /api except the public prefixes).
  const isPublicApi = PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
  if (pathname.startsWith('/api/') && !isPublicApi) {
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const method = request.method.toUpperCase();
    const requiresCsrf =
      csrfPolicy === 'all' || (csrfPolicy === 'mutations' && UNSAFE_METHODS.has(method));
    if (requiresCsrf) {
      const sent = request.headers.get(CSRF_HEADER);
      if (!auth.csrfToken || !sent || sent !== auth.csrfToken) {
        return new Response(JSON.stringify({ error: 'CSRF inválido' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
  }

  const response = await next();

  // Apply config-driven security headers to all HTML responses and
  // to public asset responses too (CSP, X-Frame-Options, etc.).
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('text/html') || isPublic(pathname)) {
    applySecurityHeaders(response.headers, {
      csp: headersCfg.csp,
      xFrameOptions: headersCfg.xFrameOptions,
      referrerPolicy: headersCfg.referrerPolicy,
      permissionsPolicy: headersCfg.permissionsPolicy,
    });
  }

  return response;
});

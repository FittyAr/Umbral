import { defineMiddleware } from 'astro:middleware';
import { buildAuthContext, CSRF_HEADER } from '~/lib/auth';
import { getConfig } from '~/lib/config';
import { applySecurityHeaders } from '~/lib/http';

// /api/status: el home lo usa para el health check de las cards con
// `card.healthCheck = true`. Es seguro hacerlo público — el endpoint sólo
// hace HEAD a URLs que pasan la SSRF guard del handler y no expone
// secrets (password hash, csrf, etc.).
const PUBLIC_API_PREFIXES = ['/api/login', '/api/health', '/api/status', '/api/assets/', '/api/locale', '/api/qr/', '/api/auth/'];
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

function clientIp(request: Request, trustForwarded: boolean, socketIp: string): string {
  if (trustForwarded) {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = request.headers.get('x-real-ip');
    if (xri) return xri;
  }
  // Sin proxy confiable: usamos la IP del socket TCP directamente.
  // Si no está disponible (test, edge), caemos a 'unknown' para
  // debuggear (mejor que inventar).
  return socketIp || 'unknown';
}

/** Detecta HTTPS: BASE_URL en env o X-Forwarded-Proto si el admin confió
 *  en el proxy. Sólo lo usamos para HSTS — no para lógica de auth.
 *
 *  BUGFIX: X-Forwarded-Proto puede ser "https,http" si el request pasó por
 *  varios proxies. El primero es el protocolo original del cliente. */
function detectHttps(request: Request, trustForwarded: boolean): boolean {
  if (process.env.BASE_URL?.startsWith('https://') === true) return true;
  if (trustForwarded) {
    const xfp = request.headers.get('x-forwarded-proto');
    if (xfp) {
      // Tomamos el primer hop (el más cercano al cliente) y limpiamos espacios.
      const first = xfp.split(',')[0]?.trim().toLowerCase();
      if (first === 'https') return true;
    }
  }
  return false;
}

/** Cap en bytes para requests que mutan el config. Evita que un admin (o
 *  alguien con la cookie) mande un body gigante que reventaría memoria
 *  antes de que zod lo rechace. 1MB es más que suficiente para el config. */
const MAX_CONFIG_BODY_BYTES = 1 * 1024 * 1024;

/** Cap para uploads (multipart). El mayor permitido por config es 5MB
 *  (background); sumamos ~1MB de overhead de multipart y dejamos margen
 *  para el metadata. Sin este cap, request.formData() carga todo en RAM. */
const MAX_UPLOAD_BODY_BYTES = 10 * 1024 * 1024;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // Pull config once (cached) for security/network/headers settings.
  const cfg = await getConfig();
  const headersCfg = cfg.security.headers;
  const netCfg = cfg.security.network;
  const csrfPolicy = cfg.security.auth.csrfPolicy;
  const isHttps = detectHttps(request, netCfg.trustForwardedFor);

  const auth = await buildAuthContext(request);
  context.locals.auth = auth;
  context.locals.clientIp = clientIp(request, netCfg.trustForwardedFor, context.clientAddress);

  // Body size cap para endpoints que aceptan JSON grande. Si el cliente
  // declara Content-Length mayor al cap, rechazamos sin leer el body
  // (ahorra memoria). Si no declara, dejamos pasar — Astro/Node tiene
  // sus propios límites y se cortará igual.
  if (pathname === '/api/config' || pathname === '/api/import') {
    const cl = request.headers.get('content-length');
    if (cl && Number(cl) > MAX_CONFIG_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: `Body demasiado grande (${cl} bytes, máx ${MAX_CONFIG_BODY_BYTES})` }),
        { status: 413, headers: { 'content-type': 'application/json' } },
      );
    }
  }
  // Body cap para uploads (multipart). Sin esto, un admin comprometido
  // podría subir 10GB y reventar la RAM del proceso. Astro/Node no
  // impone límite por default en multipart.
  if (pathname === '/api/upload') {
    const cl = request.headers.get('content-length');
    if (cl && Number(cl) > MAX_UPLOAD_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: `Upload demasiado grande (${cl} bytes, máx ${MAX_UPLOAD_BODY_BYTES})` }),
        { status: 413, headers: { 'content-type': 'application/json' } },
      );
    }
  }

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
    const isMutation = UNSAFE_METHODS.has(method);

    if (auth.isApiToken) {
      if (isMutation && !auth.isAdmin) {
        return new Response(JSON.stringify({ error: 'Token solo tiene permisos de lectura' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      // Los API tokens no requieren CSRF
    } else {
      const requiresCsrf =
        csrfPolicy === 'all' || (csrfPolicy === 'mutations' && isMutation);
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
      hsts: headersCfg.hsts,
      hstsMaxAge: headersCfg.hstsMaxAge,
      hstsIncludeSubDomains: headersCfg.hstsIncludeSubDomains,
      hstsPreload: headersCfg.hstsPreload,
      isHttps,
    });
  }

  return response;
});

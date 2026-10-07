import { defineMiddleware } from 'astro:middleware';
import { buildAuthContext, CSRF_HEADER, safeEqual } from '~/lib/auth';
import { hasRole, requiredRole } from '~/lib/authz';
import { resolveClientIp } from '~/lib/client-ip';
import { getConfig } from '~/lib/config';
import { applySecurityHeaders } from '~/lib/http';

// /api/status: el home lo usa para el health check de las cards con
// `card.healthCheck = true`. Es seguro hacerlo público — el endpoint sólo
// hace HEAD a URLs que pasan la SSRF guard del handler y no expone
// secrets (password hash, csrf, etc.).
// De `/api/auth/` sólo el flow OIDC puede ser público: `start` y `callback`
// corren ANTES de que exista sesión, así que no hay token CSRF que mandar.
// El prefijo entero estaba en la lista, y eso dejaba `/api/auth/totp/*` —que
// activa y desactiva el segundo factor de un usuario con un POST— y
// `/api/auth/hash-password` sin verificación de CSRF: quedaban colgados de
// que la cookie sea SameSite=Lax, no del control que el resto del panel usa.
// Paths exactos y prefijos (terminan en `/`) por separado: con un prefijo
// `/api/login` también quedaba público cualquier `/api/loginXYZ`.
const PUBLIC_API_EXACT = new Set(['/api/login', '/api/health', '/api/status', '/api/locale']);
const PUBLIC_API_PREFIXES = ['/api/assets/', '/api/icons/', '/api/qr/', '/api/auth/oidc/'];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_EXACT.has(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}
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
  if (isPublicApiPath(pathname)) return true;
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith('/icons/')) return true;
  return false;
}

function safeClientAddress(context: { clientAddress?: string }): string {
  try {
    return context.clientAddress || 'unknown';
  } catch {
    // @astrojs/node can throw ClientAddressNotAvailable in some
    // adapter/dev-server paths. Never let that abort the request.
    return 'unknown';
  }
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

  // Las rutas prerenderizadas se generan en el build y se sirven como
  // archivos: no hay sesión que validar ni headers de request que leer
  // (tocarlos durante el prerender emite warnings de Astro).
  if (context.isPrerendered) return next();

  // Pull config once (cached) for security/network/headers settings.
  const cfg = await getConfig();
  const headersCfg = cfg.security.headers;
  const netCfg = cfg.security.network;
  const csrfPolicy = cfg.security.auth.csrfPolicy;
  const trustForwarded =
    netCfg.trustForwardedFor ||
    process.env.TRUST_FORWARDED_FOR === 'true' ||
    process.env.TRUST_PROXY === 'true';
  const isHttps = detectHttps(request, trustForwarded);

  const auth = await buildAuthContext(request);
  context.locals.auth = auth;
  context.locals.clientIp = resolveClientIp({
    socketIp: safeClientAddress(context),
    forwardedFor: request.headers.get('x-forwarded-for'),
    realIp: request.headers.get('x-real-ip'),
    trustForwarded,
    trustedProxies: netCfg.trustedProxies,
  });

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
  if (pathname.startsWith('/api/') && !isPublicApiPath(pathname)) {
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const method = request.method.toUpperCase();
    const isMutation = UNSAFE_METHODS.has(method);

    // Rol mínimo por ruta y método (lib/authz.ts). Aplica igual a sesiones
    // y a API tokens (escritura = admin, lectura = viewer).
    if (!hasRole(auth.role, requiredRole(pathname, method))) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes para esta operación' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Los API tokens no requieren CSRF (no viajan en cookies).
    if (!auth.isApiToken) {
      const requiresCsrf =
        csrfPolicy === 'all' || (csrfPolicy === 'mutations' && isMutation);
      if (requiresCsrf) {
        const sent = request.headers.get(CSRF_HEADER);
        if (!auth.csrfToken || !safeEqual(sent, auth.csrfToken)) {
          return new Response(JSON.stringify({ error: 'CSRF inválido' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    }
  }

  const response = await next();

  // Versión del config para el control de concurrencia del panel: cada
  // respuesta de la API lleva el `updatedAt` vigente, el panel lo guarda y lo
  // manda como If-Match al guardar (ver PUT /api/config).
  if (pathname.startsWith('/api/') && auth.isAuthenticated && !auth.isApiToken) {
    try {
      const fresh = await getConfig();
      const version = fresh._meta?.updatedAt;
      if (version) response.headers.set('x-config-version', version);
    } catch {
      // headers inmutables (redirects) o config ilegible: no es crítico
    }
  }

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

import { z } from 'zod';

/**
 * CSP por defecto. Sin orígenes remotos: el render por defecto es 100%
 * local. Quien active `theme.useGoogleFonts` no tiene que tocarla: el
 * middleware suma fonts.googleapis.com y fonts.gstatic.com (withGoogleFonts).
 */
export const DEFAULT_CSP =
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

/**
 * Defaults de versiones anteriores, con 'unsafe-inline' y 'unsafe-eval' en
 * script-src (Alpine evaluaba strings y había scripts inline). Un config que
 * todavía tiene uno de estos exactos se migra a DEFAULT_CSP al cargar; una
 * CSP personalizada no se toca.
 */
export const LEGACY_DEFAULT_CSPS: readonly string[] = [
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
];

// ──────────────────────────────────────────────────────────────────────────
// Security (editables desde /admin → Hardening)
//
// Defaults permisivos: la app tiene que "simplemente funcionar" recién salida
// de la caja. Quien quiera endurecer va a /admin → Hardening.
// ──────────────────────────────────────────────────────────────────────────
export const SessionSecuritySchema = z.object({
  // Duración de la cookie de sesión. Default 24h.
  ttlHours: z.number().int().min(1).max(720).default(24),
  // SameSite. Default 'Lax' (más permisivo que 'Strict' para que funcionen
  // links externos y formularios cross-site razonables). Endurecer a 'Strict'.
  cookieSameSite: z.enum(['Strict', 'Lax', 'None']).default('Lax'),
  // Flag Secure. 'auto' = sólo si BASE_URL empieza con https://.
  // 'always' = forzar siempre (útil en deployments internos con TLS terminado).
  // 'never' = no marcar nunca.
  cookieSecure: z.enum(['auto', 'always', 'never']).default('auto'),
  // Rotar el CSRF token en cada login (mejora seguridad, fuerza re-render del admin).
  rotateCsrfOnLogin: z.boolean().default(false),
});

export const AuthSecuritySchema = z.object({
  // Largo mínimo para nuevos passwords (en /api/password).
  // 0 = sin mínimo. Default 0 (permisivo, respeta passwords legados cortos).
  minPasswordLength: z.number().int().min(0).max(128).default(0),
  // Rate limit en /api/login por IP.
  rateLimitMax: z.number().int().min(1).max(10000).default(30),
  rateLimitWindowSec: z.number().int().min(1).max(3600).default(60),
  // Política CSRF. 'mutations' = POST/PUT/DELETE/PATCH requieren CSRF.
  // 'all' = también GET (raro, máxima paranoia).
  // 'none' = desactivado (NO recomendado salvo en LAN aislada).
  csrfPolicy: z.enum(['mutations', 'all', 'none']).default('mutations'),
});

export const UploadSecuritySchema = z.object({
  // Tamaños máximos por tipo de asset (en bytes).
  maxBytesLogo: z.number().int().min(1024).max(50 * 1024 * 1024).default(1 * 1024 * 1024),
  maxBytesFavicon: z.number().int().min(1024).max(10 * 1024 * 1024).default(256 * 1024),
  maxBytesIcon: z.number().int().min(1024).max(20 * 1024 * 1024).default(512 * 1024),
  maxBytesBackground: z.number().int().min(1024).max(100 * 1024 * 1024).default(5 * 1024 * 1024),
  // MIME types permitidos (whitelist). Default: lo común para web.
  // Endurecer: sacar 'image/svg+xml' si no necesitás SVG, o 'image/gif' si no.
  // BUGFIX: antes aceptaba CUALQUIER string (incluyendo 'text/html'), lo que
  // permitía a un admin subir HTML y servirlo como página (XSS via cache
  // del browser o embed directo). Sólo image/*.
  allowedMimeTypes: z
    .array(z.string().regex(/^image\//, 'Sólo se permiten MIME types image/*'))
    .default(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']),
  // Permitir SVG. Si lo desactivás, se rechazan todos los SVG subidos.
  // Si lo permitís, sanitizeSvg decide si pasan por DOMPurify.
  allowSvg: z.boolean().default(true),
  sanitizeSvg: z.boolean().default(true),
  // Procesar imágenes con sharp (resize + WebP). Desactivar ahorra CPU
  // pero sirve archivos originales sin optimizar.
  processImages: z.boolean().default(true),
});

export const NetworkSecuritySchema = z.object({
  // Confiar en X-Forwarded-For / X-Real-IP para rate limit.
  // Activar SOLO si hay un reverse proxy en frente que sanea esos headers.
  // Activar sin proxy = cualquier cliente puede falsificar su IP.
  trustForwardedFor: z.boolean().default(false),
  // IPs/CIDRs de los proxies confiables: lib/client-ip.ts los saltea al leer
  // X-Forwarded-For desde la derecha para encontrar la IP real del cliente.
  trustedProxies: z.array(z.string()).default([]),
  trustedProxiesText: z.string().optional(),
  // Dominio al que se emite la cookie (default: hostname del request).
  // Útil si querés compartir sesión entre subdominios ('.example.com').
  cookieDomain: z.string().nullable().default(null),
  // allowInternalHosts: en /api/status y otros lugares donde el server hace
  // fetch saliente, decide si el SSRF guard permite hosts privados
  // (10/8, 172.16/12, 192.168/16, 169.254/16, IPv6 link-local, etc.) o los
  // bloquea por seguridad.
  //
  // Default `true` porque Umbral está pensado como portal interno (deploy en
  // LAN o docker compose), y un admin legítimo quiere monitorear sus
  // propios servicios. Cambialo a `false` si exponés Umbral a internet y
  // querés cerrar el vector SSRF clásico (atacante mete una URL a
  // http://169.254.169.254/ para traerte metadata de la nube).
  allowInternalHosts: z.boolean().default(true),
});

export const HeadersSecuritySchema = z.object({
  // Content-Security-Policy. null = no se envía el header (permisivo).
  // Endurecer: dejar el default sugerido.
  //
  // Sin 'unsafe-inline' ni 'unsafe-eval' en script-src: el panel usa el
  // build CSP de Alpine (las expresiones se interpretan sin `new Function`)
  // y no hay scripts inline; los datos del server viajan en
  // <script type="application/json">, que el navegador no ejecuta.
  csp: z.string().nullable().default(DEFAULT_CSP),
  // X-Frame-Options. DENY por default (anti clickjacking).
  xFrameOptions: z.enum(['DENY', 'SAMEORIGIN', 'NONE']).default('DENY'),
  // Referrer-Policy. 'no-referrer' por default.
  referrerPolicy: z
    .enum(['no-referrer', 'same-origin', 'strict-origin-when-cross-origin', 'no-referrer-when-downgrade'])
    .default('no-referrer'),
  // Permissions-Policy. Default estricto (cámara/mic/geo deshabilitados).
  permissionsPolicy: z.string().default('camera=(), microphone=(), geolocation=()'),
  // HSTS — sólo aplica si el request es HTTPS. 'auto' = activarlo siempre
  // que detectemos HTTPS; 'always' = forzar; 'never' = desactivado. Default
  // 'auto' así un deploy HTTPS queda hardened out-of-the-box sin tocar nada.
  hsts: z.enum(['auto', 'always', 'never']).default('auto'),
  // HSTS max-age en segundos. 1 año es el sweet spot (RFC 6797 §7.2).
  hstsMaxAge: z.number().int().min(0).max(63072000).default(31536000), // 1y
  // includeSubDomains para HSTS. Activar si TODOS los subdominios son HTTPS.
  hstsIncludeSubDomains: z.boolean().default(false),
  // preload permite enviar el dominio a la lista de HSTS preload de Chrome.
  // Requiere includeSubDomains y max-age >= 31536000 (1 año) según
  // hstspreload.org. Default false porque es un commitment fuerte.
  hstsPreload: z.boolean().default(false),
});

// Cada subsección con `.default({})`: un config con `security` pero sin,
// por ejemplo, `headers` (agregada en una versión posterior) fallaba el
// parse estricto y también el parcial (`.partial()` no llega a las claves
// anidadas), y el server no arrancaba.
export const SecuritySchema = z.object({
  session: SessionSecuritySchema.default({}),
  auth: AuthSecuritySchema.default({}),
  uploads: UploadSecuritySchema.default({}),
  network: NetworkSecuritySchema.default({}),
  headers: HeadersSecuritySchema.default({}),
});

export type Security = z.infer<typeof SecuritySchema>;
export type SessionSecurity = z.infer<typeof SessionSecuritySchema>;
export type AuthSecurity = z.infer<typeof AuthSecuritySchema>;
export type UploadSecurity = z.infer<typeof UploadSecuritySchema>;
export type NetworkSecurity = z.infer<typeof NetworkSecuritySchema>;
export type HeadersSecurity = z.infer<typeof HeadersSecuritySchema>;

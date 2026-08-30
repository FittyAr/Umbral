import { z } from 'zod';

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
  // Lista de IPs/CIDRs confiables (para logging/auditoría). Hoy es informativo.
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
  // Nota sobre 'unsafe-eval' en script-src: Alpine.js 3 evalúa expresiones
  // del estilo x-data, x-show, x-text, etc. con `new Function(...)` /
  // `new AsyncFunction(...)`. Sin 'unsafe-eval' en la CSP, la consola se
  // inunda de "EvalError: Evaluating a string as JavaScript violates…".
  // Para endurecer realmente: usar el build CSP de Alpine (cambia import)
  // o nonces por request. Por defecto dejamos 'unsafe-eval' para que la app
  // "simplemente funcione" — quien quiera quitarlo sabe lo que hace.
  csp: z
    .string()
    .nullable()
    .default(
      // Sin orígenes remotos: el render por defecto es 100% local. Quien active
      // `theme.useGoogleFonts` tiene que agregar fonts.googleapis.com a
      // style-src y fonts.gstatic.com a font-src. Debe coincidir con el
      // default de `src/lib/config.ts`.
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
    ),
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

export const SecuritySchema = z.object({
  session: SessionSecuritySchema,
  auth: AuthSecuritySchema,
  uploads: UploadSecuritySchema,
  network: NetworkSecuritySchema,
  headers: HeadersSecuritySchema,
});

export type Security = z.infer<typeof SecuritySchema>;
export type SessionSecurity = z.infer<typeof SessionSecuritySchema>;
export type AuthSecurity = z.infer<typeof AuthSecuritySchema>;
export type UploadSecurity = z.infer<typeof UploadSecuritySchema>;
export type NetworkSecurity = z.infer<typeof NetworkSecuritySchema>;
export type HeadersSecurity = z.infer<typeof HeadersSecuritySchema>;

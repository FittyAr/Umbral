import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Branding
// ──────────────────────────────────────────────────────────────────────────
export const BrandingSchema = z.object({
  companyName: z.string().min(1).max(80).default('Mi Empresa'),
  logo: z.string().nullable().default(null), // relative path under /api/assets/
  favicon: z.string().nullable().default(null),
});

// ──────────────────────────────────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────────────────────────────────
/** CSS font-family safe characters: letters, digits, spaces, hyphen, underscore.
 *  Previene inyecciones via `set:html` en PublicLayout.astro. */
const SAFE_FONT_FAMILY = /^[\w\- ]{1,60}$/;

/** Caracteres seguros para valores CSS (color hex, gradient, image URL).
 *  Bloquea `<`, `>`, `"`, `'`, backtick, `{`, `}` (rompen set:html o cierran
 *  contexto CSS). Permite espacios (los gradients los necesitan), `:`, `,`,
 *  `(`, `)`, `#`, `%`, números, letras, guiones, puntos, `/`, `?`, `=`, `&`.
 *  El value de background se inyecta en `set:html` en PublicLayout, así que
 *  este regex es nuestra última línea contra XSS/CSS injection. */
const SAFE_CSS_VALUE = /^[^\u0000-\u001f<>'"`{}|\\^]{0,500}$/;

export const BackgroundSchema = z.object({
  type: z.enum(['image', 'color', 'gradient']).default('gradient'),
  value: z.string().min(1).max(200).regex(SAFE_CSS_VALUE, 'Valor CSS contiene caracteres no permitidos').default('linear-gradient(135deg, #0f172a, #1e3a8a)'),
  blur: z.number().min(0).max(40).default(0),
  overlay: z.number().min(0).max(1).default(0),
  overlayColor: z.string().default('#000000'),
});

export const ThemeSchema = z.object({
  background: BackgroundSchema,
  cardStyle: z.enum(['flat', 'glass', 'outlined']).default('glass'),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  textColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#f1f5f9'),
  fontFamily: z
    .string()
    .min(1)
    .max(60)
    .regex(SAFE_FONT_FAMILY, 'Tipografía contiene caracteres no permitidos')
    .default('Inter'),
  fontUrl: z
    .string()
    .max(500)
    .refine(
      (v) =>
        v === '' ||
        // Sólo Google Fonts (or system-ui=empty). Bloquea otros origins que
        // podrían usarse para tracking o cargar CSS hostil.
        /^https:\/\/fonts\.googleapis\.com\/css2\?[a-zA-Z0-9=&;:@?.,_+%\-]+$/.test(v),
      'fontUrl debe venir de fonts.googleapis.com o estar vacío',
    )
    .default(''),
  colorMode: z.enum(['light', 'dark', 'auto']).default('auto'),
});

// ──────────────────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────────────────
export const LayoutSchema = z.object({
  columnsDesktop: z.number().int().min(2).max(8).default(4),
  columnsTablet: z.number().int().min(2).max(6).default(3),
  columnsMobile: z.number().int().min(1).max(3).default(2),
  cardSize: z.enum(['small', 'medium', 'large']).default('medium'),
  showDescriptions: z.boolean().default(true),
});

// ──────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  name: z.string().min(1).max(60),
  icon: z.string().default('folder'),
});

// ──────────────────────────────────────────────────────────────────────────
// Cards
// ──────────────────────────────────────────────────────────────────────────
export const CardSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  description: z.string().max(200).default(''),
  url: z.string().url(),
  icon: z.string().default('globe'), // nombre de ícono (Lucide) o path /api/assets/<file>
  category: z.string().min(1),
  openInNewTab: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  order: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
});

// ──────────────────────────────────────────────────────────────────────────
// Auth (no se expone al admin: vive solo en el JSON raíz)
//
// authEpoch: contador que se incrementa cada vez que cambia la password.
// El session token incluye el epoch con el que fue emitido; al verificarlo,
// si no matchea el actual, la sesión es inválida. Esto cierra el gap de
// "cambié la password pero las sesiones viejas siguen vivas" — antes sólo
// se rotaba el CSRF, la session token seguía siendo válida hasta expirar.
// ──────────────────────────────────────────────────────────────────────────
export const AuthSchema = z.object({
  passwordHash: z.string().min(1),
  csrfToken: z.string().min(1),
  authEpoch: z.number().int().min(0).default(0),
});

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
  allowedMimeTypes: z
    .array(z.string())
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
  // Dominio al que se emite la cookie (default: hostname del request).
  // Útil si querés compartir sesión entre subdominios ('.example.com').
  cookieDomain: z.string().nullable().default(null),
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
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
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

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
  security: SecuritySchema,
  categories: z.array(CategorySchema).default([]),
  cards: z.array(CardSchema).default([]),
  auth: AuthSchema.optional(),
  _meta: z
    .object({
      createdAt: z.string().nullable().default(null),
      updatedAt: z.string().nullable().default(null),
    })
    .default({ createdAt: null, updatedAt: null }),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type Branding = z.infer<typeof BrandingSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

// Partial schema for PUT /api/config (no auth, no _meta).
// Build it from scratch using the same shape as ConfigSchema but with .partial() and
// omitting the protected fields.
const FullConfigShape = {
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
  categories: z.array(CategorySchema).default([]),
  cards: z.array(CardSchema).default([]),
};

export const ConfigUpdateSchema = z
  .object({
    version: z.literal(1).optional(),
    branding: BrandingSchema.partial().optional(),
    theme: ThemeSchema.partial().optional(),
    layout: LayoutSchema.partial().optional(),
    security: SecuritySchema.partial().optional(),
    categories: z.array(CategorySchema).optional(),
    cards: z.array(CardSchema).optional(),
    // auth y _meta son sólo del server — el client los manda sin querer al
    // guardar el cfg entero. Aceptamos silenciosamente y los descartamos.
    auth: z.unknown().optional(),
    _meta: z.unknown().optional(),
  })
  .strict();

export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

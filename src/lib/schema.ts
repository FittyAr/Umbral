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

/** Safe color for token overrides: hex or rgba()/rgb(). */
const SAFE_COLOR_VALUE = /^(#([0-9a-fA-F]{3}){1,2}|rgba?\([0-9,.\s%]+\))$/;

export const TokenOverridesSchema = z.object({
  bg: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  bgElev: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  surface: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  surfaceHover: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  surfaceStrong: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  text: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  textMuted: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  textSubtle: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  textFaint: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  textInverse: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  border: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  borderStrong: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  accent: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  accentMuted: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  accentStrong: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  accentFg: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
  shadowCard: z.string().max(200).regex(SAFE_CSS_VALUE, 'Valor CSS inválido').optional(),
  shadowCardHover: z.string().max(200).regex(SAFE_CSS_VALUE, 'Valor CSS inválido').optional(),
  shadowModal: z.string().max(200).regex(SAFE_CSS_VALUE, 'Valor CSS inválido').optional(),
  icon: z.string().max(80).regex(SAFE_COLOR_VALUE, 'Color inválido').optional(),
}).optional();

export const SharedTokensSchema = z.object({
  radius: z.number().min(0).max(24).optional(),
  radiusSm: z.number().min(0).max(24).optional(),
  radiusLg: z.number().min(0).max(24).optional(),
  cardBlur: z.number().min(0).max(40).optional(),
  cardBorderWidth: z.number().min(0).max(4).optional(),
  shadowIntensity: z.enum(['none', 'subtle', 'normal', 'strong']).optional(),
}).optional();

export const ThemeTokensSchema = z.object({
  dark: TokenOverridesSchema,
  light: TokenOverridesSchema,
  shared: SharedTokensSchema,
}).optional();

export const CustomThemePresetSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  name: z.string().min(1).max(40),
  theme: z.object({
    background: BackgroundSchema.partial().optional(),
    backgroundLight: BackgroundSchema.partial().optional(),
    cardStyle: z.enum(['flat', 'glass', 'outlined']).optional(),
    accentColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional(),
    textColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional(),
    fontFamily: z.string().max(60).regex(SAFE_FONT_FAMILY).optional(),
    fontWeight: z.enum(['400', '500', '600', '700']).optional(),
    colorMode: z.enum(['light', 'dark', 'auto']).optional(),
    autoStrategy: z.enum(['system', 'schedule']).optional(),
    groupLayout: z.enum(['vertical', 'horizontal']).optional(),
    showClock: z.boolean().optional(),
    showRefresh: z.boolean().optional(),
    showStatusBar: z.boolean().optional(),
    showModeToggle: z.boolean().optional(),
    clockPosition: z.enum(['header-left', 'header-right']).optional(),
    clockFormat: z.enum(['12h', '24h']).optional(),
    headerOpacity: z.number().min(0).max(1).optional(),
    footerOpacity: z.number().min(0).max(1).optional(),
    iconTint: z.enum(['original', 'accent', 'text', 'custom']).optional(),
    tokens: ThemeTokensSchema,
  }),
});

export const ThemeSchema = z.object({
  background: BackgroundSchema,
  backgroundLight: BackgroundSchema.optional(),
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
  fontWeight: z.enum(['400', '500', '600', '700']).default('400'),
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
  useGoogleFonts: z.boolean().default(false),
  colorMode: z.enum(['light', 'dark', 'auto']).default('auto'),
  autoStrategy: z.enum(['system', 'schedule']).default('system'),
  // ── Optional widgets (off by default — opt-in) ──
  groupLayout: z.enum(['vertical', 'horizontal']).default('vertical'),
  showClock: z.boolean().default(false),
  showRefresh: z.boolean().default(false),
  showStatusBar: z.boolean().default(false),
  showModeToggle: z.boolean().default(true),
  clockPosition: z.enum(['header-left', 'header-right']).default('header-right'),
  clockFormat: z.enum(['12h', '24h']).default('24h'),
  headerOpacity: z.number().min(0).max(1).default(1),
  footerOpacity: z.number().min(0).max(1).default(1),
  iconTint: z.enum(['original', 'accent', 'text', 'custom']).default('original'),
  customPresets: z.array(CustomThemePresetSchema).max(5).default([]),
  tokens: ThemeTokensSchema,
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
  gap: z.number().min(0).max(3).default(1),
  maxWidth: z.number().int().min(720).max(2560).default(1280),
  gridAlign: z.enum(['left', 'center']).default('center'),
  cardRadius: z.number().int().min(0).max(32).default(12),
  compact: z.boolean().default(false),
  // healthCheckInterval: cada cuántos segundos volver a probar las cards con
  // healthCheck=true. Mínimo 10s (evita martillar el server), máximo 1h.
  healthCheckInterval: z.number().int().min(10).max(3600).default(60),
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
  // name/icon vacíos permitidos en categorías fantasma (isGhost): buckets
  // internos para cards sueltas en la portada, sin título visible.
  name: z.string().max(60).default(''),
  icon: z.string().default(''),
  isLocked: z.boolean().default(false),
  password: z.string().default(''),
  isSubpage: z.boolean().default(false),
  // Ghost: no se muestra en tab Categorías ni como header en la portada.
  // Vive en `categories[]` para preservar el orden intercalado (grupo A,
  // sueltas, grupo B). Vacío → se auto-elimina en move/sync/save.
  isGhost: z.boolean().default(false),
}).superRefine((cat, ctx) => {
  if (!cat.isGhost && !cat.name.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Nombre requerido',
    });
  }
  if (cat.isGhost && cat.isSubpage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['isSubpage'],
      message: 'Una categoría fantasma no puede ser subpágina',
    });
  }
  if (cat.isGhost && cat.isLocked) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['isLocked'],
      message: 'Una categoría fantasma no puede estar bloqueada',
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Cards
// ──────────────────────────────────────────────────────────────────────────
/** Una URL de tarjeta puede ser:
 *  - `https://...` o `http://...` (link externo normal), o
 *  - un path interno que empieza con `/` (ej: `/docs`, `/admin`).
 *  El `href` del card es el `url` literal, así que `/docs` navega a la
 *  página interna y `https://...` abre el sitio externo. El HTML escape
 *  lo maneja Astro; el regex bloquea javascript:/data:/vbscript:.
 */
const SAFE_CARD_URL = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

export const CardSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  // kind: 'link' = tarjeta clickeable normal (con URL). 'note' = tarjeta
  // informativa, sin link — el `url` es opcional y la card no es clickeable.
  // Útil para tips, anuncios, info fija del equipo, etc.
  kind: z.enum(['link', 'note']).default('link'),
  // BUGFIX (PUT /api/config 400 reportado por el user): el .max(200) +
  // .default('') original rechazaba cualquier descripción de más de 200
  // chars con "String must contain at most 200 character(s)". El user tenía
  // cards con descripciones largas pre-existentes (pegar descripciones de
  // Wikipedia, IA devolvió más de lo pedido, etc.) y no podía guardar la
  // config. Ahora clampeamos en vez de rechazar: el texto largo se trunca
  // silenciosamente a 200 chars al guardar. Si el user quiere algo más
  // corto, lo edita a mano.
  //
  // Para hacer esto sin romper la validación, sacamos .max(200) y dejamos
  // solo el .transform() que SIEMPRE corre (no necesita pasar validación
  // previa). El tipo resultante sigue siendo string, así que el resto del
  // código no cambia.
  //
  // Markdown: si `features.markdown.enabled`, el admin puede usar formato
  // rico (1000 chars). Si está apagada, se clampea a 200 y se renderiza
  // como plain. El handler saveConfig decide el límite según la feature
  // (no acá en el schema, para que el JSON legacy siga parseable).
  description: z.string().default(''),
  // 'plain' (default) = texto plano escapado por Astro. 'markdown' = se
  // parsea con marked + DOMPurify antes de inyectar. Si la feature
  // features.markdown está apagada, saveConfig fuerza 'plain'
  // independientemente del JSON (ver saveConfig abajo).
  descriptionFormat: z.enum(['plain', 'markdown']).default('plain'),
  // Tags (opt-in: features.tags). Array de strings kebab-case
  // lowercase, max 30 chars cada uno, max 10 por card. Las tags son
  // cross-cutting (una card puede tener tags de varias "dimensiones":
  // ej: "urgent", "frontend", "legacy"). Se usan para búsqueda y filtrado.
  // Si la feature está apagada, saveConfig dropea este campo (defense in
  // depth — el server no persiste tags si el admin no las activó).
  //
  // El preprocess normaliza cada tag (lowercase, kebab-case, trim, max 30
  // chars) ANTES de validar. Tags inválidos (después de normalizar) se
  // dropean silenciosamente con un filter. La dedup se hace acá también.
  tags: z.preprocess(
    (raw) => {
      if (!Array.isArray(raw)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const t of raw) {
        if (typeof t !== 'string') continue;
        const norm = t.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 30);
        if (!/^[a-z0-9-]{1,30}$/.test(norm)) continue;
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
        if (out.length >= 10) break;
      }
      return out;
    },
    z.array(z.string()).max(10, 'Máximo 10 tags por tarjeta'),
  ).default([]),
  // Pinned (opt-in: features.pinned). Las cards pinned se renderizan
  // primero en su categoría, sin importar el `order`. Default false (no
  // pinned). Si la feature está apagada, el server fuerza `false` por
  // defense in depth — un request que mande `pinned: true` sin la
  // feature activa queda persistido como `pinned: false`.
  pinned: z.boolean().default(false),
  // Latency warning threshold (opt-in: features.metrics). Si la card
  // tiene un valor y el último check supera este threshold en ms, se
  // muestra un dot amarillo (no rojo — sigue funcionando pero lento).
  // Default 0 = sin threshold. Si la feature está apagada, este campo
  // se ignora en el render.
  latencyThresholdMs: z.number().int().min(0).max(60_000).default(0),
  // URL: para 'link' es obligatoria; para 'note' es opcional. Aceptamos
  // string vacío como caso válido (no falla el regex). El check de "es
  // obligatoria para link" está en el superRefine de abajo.
  //
  // BUGFIX (cards.10.url inválida reportado por el user): antes hacía solo
  // .refine(regex). El regex rechaza cualquier whitespace, así que un
  // copy-paste con \n al final o un espacio al principio reventaba con
  // "URL inválida" — frustrante y silencioso. Ahora:
  // 1) trim() de espacios/newlines al principio y al final
  // 2) si no tiene esquema y no es path interno (/...), prepend "http://"
  //    (cubre el caso común de tipear "10.155.49.240:40314" sin http://)
  // 3) si empieza con "//" (protocol-relative), prepend "http:"
  // El .refine() corre DESPUÉS del transform, así que la validación es
  // sobre el valor ya normalizado.
  url: z
    .string()
    .max(2048)
    .transform((v) => {
      let s = v.trim();
      if (!s) return s;
      if (s.startsWith('//')) return 'http:' + s;
      if (!/^https?:\/\//i.test(s) && !s.startsWith('/')) return 'http://' + s;
      return s;
    })
    .refine(
      (v) => v === '' || SAFE_CARD_URL.test(v),
      'URL inválida (http(s):// o path interno /...)',
    )
    .default(''),
  icon: z.string().default('globe'), // nombre de ícono (Lucide) o path /api/assets/<file>
  category: z.string().min(1),
  openInNewTab: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  order: z.number().int().min(0).default(0),
  // Ancho de la tarjeta en columnas del grid. El render lo recorta a las
  // columnas disponibles de cada breakpoint (ver lib/card-span.ts), así que
  // el máximo (8 = columnsDesktop máximo) siempre significa "todo el ancho"
  // aunque después cambies la config de layout.
  span: z.number().int().min(1).max(8).default(1),
  enabled: z.boolean().default(true),
  // healthCheck: si true, el home hace ping a la URL periódicamente y muestra
  // un dot verde/rojo en la card. Útil para detectar servicios caídos.
  // Solo aplica a kind='link' — una nota no tiene URL que monitorear.
  // Requiere que la URL responda a HEAD o GET dentro del timeout (default 5s).
  healthCheck: z.boolean().default(false),
}).superRefine((card, ctx) => {
  // kind='link' requiere URL no vacía.
  if (card.kind === 'link' && !card.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'URL requerida para tarjeta tipo "link"',
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Auth (no se expone al admin: vive solo en el JSON raíz)
//
// authEpoch: contador GLOBAL que se incrementa cada vez que cambia la
// password del super-admin. El session token incluye el epoch con el que
// fue emitido; al verificarlo, si no matchea el actual, la sesión es
// inválida. Esto cierra el gap de "cambié la password pero las sesiones
// viejas siguen vivas" — antes sólo se rotaba el CSRF, la session token
// seguía siendo válida hasta expirar.
//
// A partir de Ola 3.1 (features.multiUser), soportamos users[] con
// epoch por usuario (userEpoch: number) para invalidar sesiones de un
// usuario específico (ej: Alice cambia su password) sin tocar a los
// demás. Los tokens de sesión incluyen tanto el authEpoch global como
// el userEpoch al que fueron emitidos.
// ──────────────────────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(['admin', 'editor', 'viewer']);
export const UserSchema = z.object({
  id: z.string().min(8).max(80),
  username: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, 'Username debe ser lowercase, alfanumérico + guiones y underscores'),
  displayName: z.string().min(1).max(80).default(''),
  passwordHash: z.string().min(1),
  role: UserRoleSchema.default('viewer'),
  // epoch por usuario — incrementa cuando ese user cambia su password
  // o es borrado. Permite invalidar sesiones de un user sin tocar a los
  // demás (escenario típico: "comprometieron a Alice, le cambio la pass").
  userEpoch: z.number().int().min(0).default(0),
  createdAt: z.string().datetime().nullable().default(null),
  lastLoginAt: z.string().datetime().nullable().default(null),
  // 2FA: secret TOTP cifrado (sólo si features.totp2fa está activa y el
  // user lo activó). null = sin 2FA. El server lo lee server-side.
  // (El render del admin no muestra esto — sólo el endpoint de login
  // lo valida. La función pública es: 'el admin no debería ver los
  // secrets de los 2FA en ningún lado'.)
  totpSecret: z.string().nullable().default(null).optional(),
});

export const AuthSchema = z.object({
  passwordHash: z.string().min(1),
  csrfToken: z.string().min(1),
  authEpoch: z.number().int().min(0).default(0),
  // Multi-user (opt-in: features.multiUser). Default vacío → legacy mode
  // (sólo password único). Si tiene al menos un user, se activa el modo
  // multi-user. Los users[] se dropean al guardar si la feature está
  // apagada (defense in depth).
  users: z.array(UserSchema).default([]),
  // Si true, el password único (super-admin) sigue siendo válido como
  // rescue path. Default true. El admin puede flipearlo a false desde
  // el tab Password para "solo usuarios + sin rescue path".
  // Validación: si users[] está vacío y singlePasswordEnabled=false,
  // el sistema no es accesible — el server rechaza este estado al
  // guardar (revisar en saveConfig).
  singlePasswordEnabled: z.boolean().default(true),
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

// ──────────────────────────────────────────────────────────────────────────
// AI (opcional — no se activa hasta que el admin configure provider+apiKey)
//
// Soporta el formato OpenAI-compatible (/v1/chat/completions). Eso cubre:
// - OpenAI (https://api.openai.com/v1)
// - Ollama local (http://localhost:11434/v1) — modelos open source
// - LM Studio local (http://localhost:1234/v1)
// - OpenRouter (https://openrouter.ai/api/v1)
// - Cualquier otro proxy que respete la API de OpenAI
//
// Cuando `enabled` es false, /api/ai devuelve 503 — el admin lo activa
// explícitamente. La apiKey puede ser vacía para providers que no la
// requieren (algunos Ollama).
// ──────────────────────────────────────────────────────────────────────────
export const AISchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['openai-compatible']).default('openai-compatible'),
  baseUrl: z.string().max(200).default('https://api.openai.com/v1'),
  apiKey: z.string().max(500).default(''),
  model: z.string().max(80).default('gpt-4o-mini'),
  // systemPrompt opcional: el admin puede customizar la personalidad del
  // asistente. Si está vacío, usamos uno default en el idioma `language`.
  systemPrompt: z.string().max(2000).default(''),
  // Idioma en que la IA escribe las tarjetas. Default 'es' (castellano
  // rioplatense, el tono que ven los users en la UI). Cambialo si tus
  // servicios/usuarios son en otro idioma.
  language: z.enum(['es', 'en', 'pt', 'fr', 'de', 'it']).default('es'),
});

// ──────────────────────────────────────────────────────────────────────────
// External search (Brave / Tavily) — opcional, off by default
//
// Usado por /api/fetch-card-info cuando el fetch directo a la URL falla o
// no devuelve info útil. Orden de búsqueda: Brave (si key) → Tavily (si
// key) → Wikipedia REST → DuckDuckGo Instant Answer. Las dos últimas no
// requieren key así que andan out-of-the-box.
//
// Para SearXNG self-hosted: el user puede usar el preset "Custom / Otro"
// en el form de externalSearch y apuntar a su instance. No hay un campo
// dedicado porque SearXNG no requiere key.
// ──────────────────────────────────────────────────────────────────────────
export const ExternalSearchSchema = z.object({
  braveApiKey: z.string().max(200).default(''),
  tavilyApiKey: z.string().max(200).default(''),
});

// ──────────────────────────────────────────────────────────────────────────
// Webhooks (opt-in: features.webhooks)
//
// Lista de webhooks a los que Umbral notifica cuando una card con
// healthCheck=true cambia de estado (de healthy → failing o vice versa).
// Opt-in: si features.webhooks.enabled === false, el engine NO se
// ejecuta aunque haya webhooks configurados (defense in depth).
//
// Cada webhook define:
// - id: identificador único (uuid v4)
// - name: label visible en el admin
// - url: endpoint HTTPS al que POSTear el payload
// - events: array de eventos que disparan este webhook (health_fail, health_recover)
// - minFailures: cuántas fallas consecutivas antes de disparar health_fail
// - cooldownMin: minutos entre notificaciones del mismo webhook (anti-spam)
// - enabled: si false, no se ejecuta pero queda en config
// ──────────────────────────────────────────────────────────────────────────
export const WebhookEventSchema = z.enum(['health_fail', 'health_recover']);

export const WebhookSchema = z.object({
  id: z.string().min(8).max(80),
  name: z.string().min(1).max(60),
  // URL: sólo http(s). Validamos el formato acá; el engine aplica SSRF
  // guard antes de hacer fetch (bloquea loopback, private IPs, etc).
  url: z.string().url().refine(
    (u) => /^https?:\/\//.test(u),
    'URL debe empezar con http:// o https://',
  ).refine(
    (u) => u.length <= 500,
    'URL demasiado larga (max 500 chars)',
  ),
  events: z.array(WebhookEventSchema).min(1, 'Al menos un evento').default(['health_fail']),
  minFailures: z.number().int().min(1).max(20).default(3),
  cooldownMin: z.number().int().min(0).max(1440).default(30),
  enabled: z.boolean().default(true),
});

export const WebhooksSchema = z.object({
  items: z.array(WebhookSchema).default([]),
});
// Sin `.default({})` en el outer: si lo hacemos, WebhooksSchema deja de
// tener `.partial()`. El campo en ConfigSchema es .optional() así que
// configs viejos siguen parseando. saveConfig maneja el default (items: []).

export type Webhook = z.infer<typeof WebhookSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Maintenance windows (opt-in: features.maintenanceWindows)
//
// Lista de ventanas de mantenimiento programadas. Durante una ventana
// activa, las cards afectadas muestran un badge ámbar "🔧 Mantenimiento"
// en la portada y NO disparan webhooks de health_fail (reducir spam
// durante deploys).
//
// Una ventana tiene:
// - id: identificador único
// - cardIds: array de card IDs afectados (o ['*'] para "todas")
// - startsAt / endsAt: ISO timestamps (UTC). endsAt > startsAt.
// - reason: descripción libre (ej: "Deploy v2.1")
// - enabled: si false, la ventana queda guardada pero no se aplica
//
// Auto-cleanup: las ventanas con endsAt < now - 24h se consideran
// "históricas" y se pueden borrar en bulk desde la UI.
// ──────────────────────────────────────────────────────────────────────────
export const MaintenanceWindowSchema = z.object({
  id: z.string().min(8).max(80),
  cardIds: z.array(z.string().min(1).max(80)).min(1, 'Al menos una card o "*"').default(['*']),
  // '*' como sentinel para "todas las cards". Validamos que el primer
  // elemento sea '*' o un cardId real (no se puede mezclar).
  startsAt: z.string().datetime({ message: 'startsAt debe ser ISO 8601 UTC' }),
  endsAt: z.string().datetime({ message: 'endsAt debe ser ISO 8601 UTC' }),
  reason: z.string().max(120).default(''),
  enabled: z.boolean().default(true),
}).refine(
  (w) => new Date(w.endsAt).getTime() > new Date(w.startsAt).getTime(),
  { message: 'endsAt debe ser posterior a startsAt', path: ['endsAt'] },
);

export const MaintenanceWindowsSchema = z.object({
  items: z.array(MaintenanceWindowSchema).default([]),
});
// Sin `.default({})` en outer (mismo fix que FeaturesSchema/WebhooksSchema)
// para que `.partial()` funcione. El default de items=[] lo aplica el
// preprocess en saveConfig.

export type MaintenanceWindow = z.infer<typeof MaintenanceWindowSchema>;

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
export type AI = z.infer<typeof AISchema>;
export type ExternalSearch = z.infer<typeof ExternalSearchSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Features (feature flags opt-in)
//
// PRINCIPIO 7 del plan de ampliación: toda feature nueva debe poder
// apagarse. El admin decide qué activa; si no la quiere, no la paga (ni
// en código que corre, ni en dependencias, ni en tamaño de config, ni en
// ruido visual). El loader usa `isFeatureEnabled()` para gating y los
// módulos que requieran deps nuevas se importan dinámicamente.
//
// Default `false` para TODO. La app "simplemente funciona" como en v1.x.
// Si el admin apaga una feature que ya tenía datos, los datos se
// preservan en config.json pero inertes; al volver a activar, reaparecen.
//
// Esta sección es el primer bloque que las próximas olas (markdown, tags,
// pinned, presets, audit log viewer, webhooks, métricas, QR, multi-user,
// OIDC, multi-portal) van a poblar. Por ahora arranca vacía con la
// infraestructura lista.
// ──────────────────────────────────────────────────────────────────────────
const FeatureFlagSchema = z.object({
  enabled: z.boolean().default(false),
});

export const FeaturesSchema = z.object({
  i18n: z
    .object({
      enabled: z.boolean().default(false),
      locale: z.enum(['es', 'en', 'pt']).default('es'),
    })
    .default({ enabled: false, locale: 'es' }),
  markdown: FeatureFlagSchema.default({ enabled: false }),
  tags: FeatureFlagSchema.default({ enabled: false }),
  pinned: FeatureFlagSchema.default({ enabled: false }),
  presets: FeatureFlagSchema.default({ enabled: true }),
  auditLogViewer: FeatureFlagSchema.default({ enabled: true }),
  qr: FeatureFlagSchema.default({ enabled: false }),
  metrics: z
    .object({
      enabled: z.boolean().default(false),
      persistToDisk: z.boolean().default(false),
      retentionHours: z.number().int().min(1).max(720).default(24),
    })
    .default({ enabled: false, persistToDisk: false, retentionHours: 24 }),
  webhooks: FeatureFlagSchema.default({ enabled: false }),
  maintenanceWindows: FeatureFlagSchema.default({ enabled: false }),
  multiUser: FeatureFlagSchema.default({ enabled: false }),
  totp2fa: FeatureFlagSchema.default({ enabled: false }),
  oidc: FeatureFlagSchema.default({ enabled: false }),
  apiTokens: FeatureFlagSchema.default({ enabled: false }),
  multiPortal: FeatureFlagSchema.default({ enabled: false }),
  status: FeatureFlagSchema.default({ enabled: false }),
  ai: FeatureFlagSchema.default({ enabled: false }),
  iconPacks: FeatureFlagSchema.default({ enabled: false }),
});
// NOTA: NO usamos `.default({})` en el outer schema. Si lo hacemos,
// FeaturesSchema se convierte en un ZodDefault que no tiene `.partial()`.
// En su lugar, declaramos `features: FeaturesSchema.optional()` en el
// ConfigSchema (abajo). El código que lo lee debe chequear `cfg.features`
// por null antes de usarlo — el helper `isFeatureEnabled()` ya lo hace.

export type Features = z.infer<typeof FeaturesSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Portals (opt-in: features.multiPortal) — una sola instancia sirve
// múltiples portales (ej: "IT", "Marketing", "Dev"), cada uno con su
// propio config, uploads, audit log. Routing por Host header o path
// prefix. Ver el plan Ola 4.1.
//
// Cuando la feature está apagada, el portal implícito es "default" y
// todo vive en data/ (legacy). Cuando se prende, se migra automáticamente
// data/ → data/portals/default/.
// ──────────────────────────────────────────────────────────────────────────
export const PortalSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case (a-z, 0-9, guiones)'),
  name: z.string().min(1).max(80),
  // host: dominio que matchea. Vacío = matchea por pathPrefix solamente.
  // '*' = wildcard (matchea cualquier host).
  host: z.string().max(200).optional().default(''),
  // pathPrefix: prefijo de path. '*' = matchea todos los paths (default
  // portal). Default '/'.
  pathPrefix: z.string().max(20).regex(/^[/a-z*0-9-]*$/, 'pathPrefix debe empezar con / y solo letras/digitos/guiones/asterisco').default('/'),
});
export const PortalsSchema = z.object({
  items: z.array(PortalSchema).default([]),
  defaultPortal: z.string().min(1).max(40).default('default'),
});
export type Portal = z.infer<typeof PortalSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
// OIDC (opt-in: features.oidc) — login con OpenID Connect (Keycloak,
// Google Workspace, Authentik, Azure AD, etc.). DEFAULT OFF — incluso
// para instalaciones nuevas, el admin debe explícitamente configurar
// un provider. La razón: OIDC cambia el flujo de auth (agrega rutas,
// superficie de ataque diferente) y no queremos que se active por
// accidente. Ver src/lib/oidc.ts.
// ──────────────────────────────────────────────────────────────────────────
export const OIDCProviderSchema = z.object({
  id: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  name: z.string().min(1).max(60),
  // Issuer URL: el .well-known/openid-configuration se descubre desde acá
  // (ej: https://keycloak.example.com/realms/umbral).
  issuer: z.string().url().refine((u) => /^https?:\/\//.test(u), 'issuer debe ser http(s)'),
  clientId: z.string().min(1).max(200),
  clientSecret: z.string().min(1).max(500),
  scopes: z.array(z.string().min(1).max(60)).default(['openid', 'profile', 'email']),
  claimMap: z.object({
    username: z.string().min(1).max(60).default('preferred_username'),
    email: z.string().min(1).max(60).default('email'),
    displayName: z.string().min(1).max(60).default('name'),
    role: z.string().min(1).max(60).default('umbral_role'),
  }).default({}),
  // Si true y el user no existe en users[], se crea automáticamente
  // con el rol por default. Si false, login falla con "user not provisioned".
  autoProvision: z.boolean().default(false),
  defaultRole: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  enabled: z.boolean().default(true),
  redirectPath: z.string().max(100).default('/'),
});
export const OIDCSchema = z.object({
  providers: z.array(OIDCProviderSchema).default([]),
});
export type OIDCProvider = z.infer<typeof OIDCProviderSchema>;

// ──────────────────────────────────────────────────────────────────────────
// API tokens (opt-in: features.apiTokens) — para integraciones externas
// (CI/CD, scripts, el CLI de Ola 4.2). Un token es una string opaca
// que el server valida contra el hash bcrypt guardado en disco. El
// header es "Authorization: Bearer umb_xxx". Los tokens tienen un
// scope (read/write) y un expiresAt opcional. El admin los crea/borra
// desde el panel. Audit log: api_token_created / api_token_used.
// ──────────────────────────────────────────────────────────────────────────
export const ApiTokenScopeSchema = z.enum(['read', 'write']);
export const ApiTokenSchema = z.object({
  id: z.string().min(8).max(80),
  name: z.string().min(1).max(80),
  // Sólo guardamos el hash bcrypt, NUNCA el plaintext (igual que users).
  tokenHash: z.string().min(1),
  // "read" = GET endpoints. "write" = todo (incluye read).
  scope: ApiTokenScopeSchema.default('read'),
  // ISO 8601 UTC. null = no expira.
  expiresAt: z.string().datetime().nullable().default(null),
  // Metadata para el admin
  createdAt: z.string().datetime().nullable().default(null),
  lastUsedAt: z.string().datetime().nullable().default(null),
  // Últimos 4 chars del token (para identificar en la lista). NUNCA el
  // token completo — eso es el secret que sale una sola vez al crear.
  tokenLast4: z.string().length(4).default('****'),
  // "true" para revocar (preserva el slot en el array para audit log).
  revoked: z.boolean().default(false),
});
export const ApiTokensSchema = z.object({
  items: z.array(ApiTokenSchema).default([]),
});
export type ApiToken = z.infer<typeof ApiTokenSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
  security: SecuritySchema,
  // `ai` es opt-in: el admin lo activa desde el panel cuando quiera.
  // Default vacío → todos los endpoints /api/ai devuelven 503.
  ai: AISchema.optional(),
  // Webhooks (opt-in: features.webhooks). Si la feature está apagada,
  // el engine NO se ejecuta aunque haya webhooks configurados.
  webhooks: WebhooksSchema.optional(),
  // Maintenance windows (opt-in: features.maintenanceWindows). Si la
  // feature está apagada, el render las ignora y los webhooks no las
  // respetan.
  maintenanceWindows: MaintenanceWindowsSchema.optional(),
  // OIDC (opt-in: features.oidc). Lista de providers (Keycloak, Google,
  // Authentik, etc.). Default array vacío = sin providers. Si la feature
  // está apagada, el engine no se ejecuta y los endpoints /api/auth/oidc/*
  // devuelven 404 (defense-in-depth).
  oidc: OIDCSchema.optional(),
  // API tokens (opt-in: features.apiTokens). Lista de tokens para
  // integraciones externas. Si la feature está apagada, los tokens no se
  // persisten (defense-in-depth).
  apiTokens: ApiTokensSchema.optional(),
  // External search (Brave / Tavily / etc) — opcional, también.
  // Default vacío → auto-completar usa sólo Wikipedia + DuckDuckGo (sin key).
  externalSearch: ExternalSearchSchema.optional(),
  // Multi-portal (opt-in: features.multiPortal). Lista de portales adicionales.
  portals: PortalsSchema.optional(),
  // Features flags: sistema unificado de opt-in. Ver FeaturesSchema arriba
  // y src/lib/features.ts para el helper `isFeatureEnabled()`. Cada ola
  // del roadmap (markdown, tags, webhooks, multi-portal, ...) se registra
  // acá con default `enabled: false`.
  features: FeaturesSchema.optional(),
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
    ai: AISchema.partial().optional(),
    externalSearch: ExternalSearchSchema.partial().optional(),
    webhooks: WebhooksSchema.partial().optional(),
    maintenanceWindows: MaintenanceWindowsSchema.partial().optional(),
    portals: PortalsSchema.partial().optional(),
    oidc: OIDCSchema.partial().optional(),
    apiTokens: ApiTokensSchema.partial().optional(),
    // Features flags: el admin puede togglear individuales. Cada feature
    // tiene su sub-schema; aceptamos partials para permitir updates
    // granulares (ej: cambiar sólo `features.i18n.locale`).
    features: FeaturesSchema.partial().optional(),
    categories: z.array(CategorySchema).optional(),
    cards: z.array(CardSchema).optional(),
    // auth y _meta son sólo del server — el client los manda sin querer al
    // guardar el cfg entero. Aceptamos silenciosamente y los descartamos.
    auth: z.unknown().optional(),
    _meta: z.unknown().optional(),
  })
  .strict();

export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

import { z } from 'zod';
import { SAFE_CSS_VALUE, SAFE_COLOR_VALUE, SAFE_FONT_FAMILY } from './primitives.ts';

export const BackgroundSchema = z.object({
  type: z.enum(['image', 'color', 'gradient']).default('gradient'),
  value: z.string().min(1).max(200).regex(SAFE_CSS_VALUE, 'Valor CSS contiene caracteres no permitidos').default('linear-gradient(135deg, #0f172a, #1e3a8a)'),
  blur: z.number().min(0).max(40).default(0),
  overlay: z.number().min(0).max(1).default(0),
  overlayColor: z.string().default('#000000'),
});

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

// ──────────────────────────────────────────────────────────────────────────
// Animaciones (opt-in: features.animations)
//
// Todo arranca en 'none'/false: prender la feature no cambia nada de lo que
// se ve hasta que el admin elige un efecto. Los componentes que las
// implementan (@astroanimate/core) se degradan a contenido visible sin JS,
// así que una animación nunca puede esconder una tarjeta.
// ──────────────────────────────────────────────────────────────────────────
const AnimationEffectSchema = z.enum([
  'none',
  'fade',
  'scale',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'blur',
]);

export const ThemeAnimationsSchema = z
  .object({
    cardEntrance: AnimationEffectSchema.default('none'),
    cardEntranceDuration: z.number().int().min(100).max(2000).default(600),
    /** Retardo acumulado por tarjeta, en ms. 0 = todas entran juntas. */
    cardEntranceStagger: z.number().int().min(0).max(300).default(0),
    /** Entrada de cada bloque de categoría, además de la de sus tarjetas. */
    categoryEntrance: AnimationEffectSchema.default('none'),
    /** Cuánto se desplaza el elemento en los efectos de slide, en px. */
    entranceDistance: z.number().int().min(4).max(64).default(16),
    entranceEasing: z.enum(['ease-out', 'ease-in-out', 'linear', 'spring']).default('ease-out'),
    /**
     * `load` anima al cargar la página; `scroll` espera a que el elemento
     * entre en pantalla. El disparo por scroll necesita JavaScript: sin él
     * no se esconde nada, simplemente no hay animación.
     */
    entranceTrigger: z.enum(['load', 'scroll']).default('load'),
    /** `default` deja el hover que ya tenían las tarjetas. */
    cardHover: z.enum(['default', 'none', 'lift', 'grow', 'glow', 'tilt']).default('default'),
    /** Duración de la transición de hover, en ms. 180 es el valor histórico. */
    hoverDuration: z.number().int().min(0).max(600).default(180),
    headerEffect: AnimationEffectSchema.default('none'),
    /** Título del header letra por letra. El texto se sirve completo igual. */
    titleTypewriter: z.boolean().default(false),
    counters: z.boolean().default(false),
    /**
     * Con esto en true no se anima nada para quien pidió menos movimiento en
     * su sistema. Se puede apagar, pero el CSS global mantiene el guard igual.
     */
    respectReducedMotion: z.boolean().default(true),
  })
  .default({});

export type ThemeAnimations = z.infer<typeof ThemeAnimationsSchema>;

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
  animations: ThemeAnimationsSchema,
});

export type Theme = z.infer<typeof ThemeSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

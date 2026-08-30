/**
 * Cálculo de las variables CSS de un tema: overrides por modo, rampa de
 * texto, sombras compartidas y los bloques que emite `PublicLayout`.
 */
import type { Background, Theme } from '../schema';
import { type ColorMode, colorToHexApprox, deriveAccentVariants, deriveTextRamp, relativeLuminance } from './color-utils.ts';
import { FONT_FALLBACK, SHADOW_PRESETS, TOKEN_DEFAULTS_DARK, TOKEN_DEFAULTS_LIGHT, TOKEN_KEY_MAP } from './token-defaults.ts';

function applyTokenOverrides(
  vars: Record<string, string>,
  overrides: Record<string, string | undefined> | undefined,
): void {
  if (!overrides) return;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') continue;
    const cssKey = TOKEN_KEY_MAP[key] ?? (key.startsWith('--') ? key : `--${key}`);
    vars[cssKey] = value;
  }
}

function applySharedTokens(vars: Record<string, string>, theme: Theme, mode: ColorMode): void {
  const shared = theme.tokens?.shared;
  if (!shared) return;
  if (shared.radius !== undefined) vars['--radius'] = `${shared.radius}px`;
  if (shared.radiusSm !== undefined) vars['--radius-sm'] = `${shared.radiusSm}px`;
  if (shared.radiusLg !== undefined) vars['--radius-lg'] = `${shared.radiusLg}px`;
  if (shared.shadowIntensity) {
    if (shared.shadowIntensity === 'none') {
      vars['--shadow-card'] = 'none';
      vars['--shadow-card-hover'] = 'none';
      vars['--shadow-modal'] = 'none';
    } else {
      const shadows = SHADOW_PRESETS[shared.shadowIntensity][mode];
      vars['--shadow-card'] = shadows.card;
      vars['--shadow-card-hover'] = shadows.cardHover;
      vars['--shadow-modal'] = shadows.modal;
    }
  }
  if (shared.cardBlur !== undefined) {
    vars['--card-blur'] = `${shared.cardBlur}px`;
  }
  if (shared.cardBorderWidth !== undefined) {
    vars['--card-border-width'] = `${shared.cardBorderWidth}px`;
  }
}

function resolveLegacyTextColor(theme: Theme, mode: ColorMode): string | undefined {
  const legacy = theme.textColor;
  if (!legacy) return undefined;
  const isLightText = relativeLuminance(legacy) > 0.5;
  if (mode === 'dark' && isLightText) return legacy;
  if (mode === 'light' && !isLightText) return legacy;
  return undefined;
}

function resolveIconColor(theme: Theme, mode: ColorMode, vars: Record<string, string>): string | undefined {
  const tint = theme.iconTint ?? 'original';
  if (tint === 'original') return undefined;
  if (tint === 'accent') return vars['--accent'];
  if (tint === 'text') return vars['--text'];
  const custom = mode === 'light' ? theme.tokens?.light?.icon : theme.tokens?.dark?.icon;
  return custom || vars['--accent'];
}

/** Resolve background for a color mode (dark uses `background`, light uses `backgroundLight` if set). */
export function resolveBackground(theme: Theme, mode: ColorMode): Background {
  if (mode === 'light' && theme.backgroundLight) {
    return theme.backgroundLight;
  }
  return theme.background;
}

function isImageBackgroundValue(value: string): boolean {
  return (
    value.startsWith('/')
    || value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('data:')
  );
}

export function computeBackgroundStyle(bg: Background): string {
  const blur = bg.blur > 0 ? `filter:blur(${bg.blur}px);` : '';
  if (bg.type === 'image' && isImageBackgroundValue(bg.value)) {
    return `background-image:url('${bg.value}');background-size:cover;background-position:center;${blur}`;
  }
  return `background:${bg.value};${blur}`;
}

/** Compute full CSS variable map for a theme + color mode. */
export function computeThemeVars(theme: Theme, mode: ColorMode): Record<string, string> {
  const defaults = mode === 'light' ? TOKEN_DEFAULTS_LIGHT : TOKEN_DEFAULTS_DARK;
  const vars: Record<string, string> = { ...defaults };

  vars['--font'] = `'${theme.fontFamily}', ${FONT_FALLBACK}`;
  if (theme.fontWeight) {
    vars['--font-weight'] = theme.fontWeight;
  }

  Object.assign(vars, deriveAccentVariants(theme.accentColor, mode));

  const modeOverrides = mode === 'light' ? theme.tokens?.light : theme.tokens?.dark;
  applyTokenOverrides(vars, modeOverrides as Record<string, string | undefined> | undefined);

  if (!modeOverrides?.text) {
    const legacyText = resolveLegacyTextColor(theme, mode);
    if (legacyText) vars['--text'] = legacyText;
  }

  const bgHex = colorToHexApprox(vars['--bg'] ?? '#0b1220') ?? '#0b1220';
  const textHex = colorToHexApprox(vars['--text'] ?? '#f1f5f9') ?? '#f1f5f9';
  if (!modeOverrides?.textMuted && !modeOverrides?.textSubtle && !modeOverrides?.textFaint) {
    Object.assign(vars, deriveTextRamp(textHex, bgHex, mode));
  }

  const iconColor = resolveIconColor(theme, mode, vars);
  if (iconColor) vars['--icon-color'] = iconColor;

  applySharedTokens(vars, theme, mode);

  return vars;
}

export function themeVarsToCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

/** CSS blocks for PublicLayout: dark on :root, light overrides on [data-mode="light"]. */
export function computeThemeCssBlocks(theme: Theme): { root: string; light: string; shared: string } {
  const darkVars = computeThemeVars(theme, 'dark');
  const lightVars = computeThemeVars(theme, 'light');

  const rootKeys = ['--accent', '--accent-muted', '--accent-strong', '--accent-fg', '--text', '--font', '--font-weight'];
  const root = rootKeys
    .filter((k) => darkVars[k])
    .map((k) => `${k}:${darkVars[k]}`)
    .join(';');

  const lightDiffKeys = Object.keys(lightVars).filter(
    (k) => lightVars[k] !== darkVars[k] || rootKeys.includes(k),
  );
  const light = lightDiffKeys.map((k) => `${k}:${lightVars[k]}`).join(';');

  const sharedParts: string[] = [];
  const shared = theme.tokens?.shared;
  if (shared?.radius !== undefined) sharedParts.push(`--radius:${shared.radius}px`);
  if (shared?.radiusSm !== undefined) sharedParts.push(`--radius-sm:${shared.radiusSm}px`);
  if (shared?.radiusLg !== undefined) sharedParts.push(`--radius-lg:${shared.radiusLg}px`);
  if (shared?.cardBlur !== undefined) {
    sharedParts.push(`--card-blur:${shared.cardBlur}px`);
  }
  if (shared?.cardBorderWidth !== undefined) {
    sharedParts.push(`--card-border-width:${shared.cardBorderWidth}px`);
  }

  return { root, light, shared: sharedParts.join(';') };
}

export function resolveColorMode(
  colorMode: Theme['colorMode'],
  autoStrategy: Theme['autoStrategy'] = 'system',
): ColorMode {
  if (colorMode === 'light' || colorMode === 'dark') return colorMode;
  if (autoStrategy === 'schedule') {
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? 'light' : 'dark';
  }
  if (typeof globalThis !== 'undefined' && 'matchMedia' in globalThis) {
    return globalThis.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

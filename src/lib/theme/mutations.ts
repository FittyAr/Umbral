/**
 * Mutaciones de un objeto `theme` vivo.
 *
 * Son in-place porque el objeto que editan es el proxy reactivo de Alpine:
 * reemplazarlo por otro rompe los bindings del formulario del admin.
 */
import type { Theme } from '../schema';
import { type ColorMode, hexToRgb } from './color-utils.ts';

/** JSON clone safe for Alpine proxies (structuredClone throws on Proxy). */
export function cloneThemePlain(base: Theme): Theme {
  return JSON.parse(JSON.stringify(base));
}

/** Deep-merge partial theme onto base (used by presets). Returns a new plain object. */
export function mergeThemePartial(base: Theme, partial: Partial<Theme>): Theme {
  const merged = cloneThemePlain(base);
  applyThemePartialInPlace(merged, partial);
  return merged;
}

const THEME_SCALAR_KEYS = [
  'cardStyle', 'accentColor', 'textColor', 'fontFamily', 'fontUrl', 'fontWeight',
  'colorMode', 'autoStrategy', 'groupLayout', 'showClock', 'showRefresh',
  'showStatusBar', 'showModeToggle', 'clockPosition', 'clockFormat',
  'headerOpacity', 'footerOpacity', 'useGoogleFonts', 'iconTint',
] as const;

/** Mutate an existing theme object in-place (Alpine-safe). */
export function applyThemePartialInPlace(target: Theme, partial: Partial<Theme>): void {
  if (partial.background) {
    if (!target.background) target.background = { ...partial.background } as Theme['background'];
    else Object.assign(target.background, partial.background);
  }
  if (partial.backgroundLight) {
    if (!target.backgroundLight) target.backgroundLight = { ...partial.backgroundLight } as Theme['backgroundLight'];
    else Object.assign(target.backgroundLight, partial.backgroundLight);
  }
  if (partial.tokens) {
    target.tokens = target.tokens ?? {};
    if (partial.tokens.dark) {
      target.tokens.dark = { ...target.tokens.dark, ...partial.tokens.dark };
    }
    if (partial.tokens.light) {
      target.tokens.light = { ...target.tokens.light, ...partial.tokens.light };
    }
    if (partial.tokens.shared) {
      target.tokens.shared = { ...target.tokens.shared, ...partial.tokens.shared };
    }
  }
  if (partial.customPresets) target.customPresets = partial.customPresets;
  for (const key of THEME_SCALAR_KEYS) {
    const val = partial[key];
    if (val !== undefined) (target as Record<string, unknown>)[key] = val;
  }
}

/** Replace theme fields in-place from a full theme snapshot (reset/import). */
export function replaceThemeInPlace(target: Theme, source: Theme): void {
  const plain = cloneThemePlain(source);
  target.tokens = plain.tokens;
  target.customPresets = plain.customPresets ?? [];
  applyThemePartialInPlace(target, plain);
}

/** Derive surface/border tokens from accent for advanced editor. */
export function deriveTokensFromAccent(
  accentHex: string,
  mode: ColorMode,
): Record<string, string> {
  const rgb = hexToRgb(accentHex);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  if (mode === 'dark') {
    return {
      bg: '#0b1220',
      bgElev: '#111a2e',
      surface: 'rgba(255, 255, 255, 0.04)',
      surfaceHover: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.16)',
      textMuted: '#cbd5e1',
      textSubtle: '#94a3b8',
      accentMuted: `rgba(${r}, ${g}, ${b}, 0.12)`,
    };
  }
  return {
    bg: '#f6f8fb',
    bgElev: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceHover: 'rgba(15, 23, 42, 0.04)',
    border: 'rgba(15, 23, 42, 0.10)',
    borderStrong: 'rgba(15, 23, 42, 0.18)',
    textMuted: '#334155',
    textSubtle: '#475569',
    accentMuted: `rgba(${r}, ${g}, ${b}, 0.10)`,
  };
}

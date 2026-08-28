import type { Background, Theme } from './schema';

export type ColorMode = 'light' | 'dark';

const FONT_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Default token values mirroring global.css :root (dark). */
export const TOKEN_DEFAULTS_DARK: Record<string, string> = {
  '--bg': '#0b1220',
  '--bg-elev': '#111a2e',
  '--surface': 'rgba(255, 255, 255, 0.04)',
  '--surface-hover': 'rgba(255, 255, 255, 0.08)',
  '--surface-strong': '#1e293b',
  '--text': '#f1f5f9',
  '--text-muted': '#cbd5e1',
  '--text-subtle': '#94a3b8',
  '--text-faint': '#64748b',
  '--text-inverse': '#0f172a',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--border-strong': 'rgba(255, 255, 255, 0.16)',
  '--accent': '#60a5fa',
  '--accent-muted': 'rgba(96, 165, 250, 0.12)',
  '--accent-strong': '#2563eb',
  '--accent-fg': '#ffffff',
  '--shadow-card': '0 8px 24px rgba(0, 0, 0, 0.30)',
  '--shadow-card-hover': '0 12px 32px rgba(0, 0, 0, 0.40)',
  '--shadow-modal': '0 16px 48px rgba(0, 0, 0, 0.45)',
  '--shadow-text': '0 2px 8px rgba(0, 0, 0, 0.40)',
  '--shadow-icon': '0 1px 2px rgba(0, 0, 0, 0.20)',
  '--card-blur': '12px',
  '--card-border-width': '1.5px',
  '--radius': '10px',
  '--radius-sm': '6px',
  '--radius-lg': '14px',
};

/** Default token values mirroring global.css html[data-mode="light"]. */
export const TOKEN_DEFAULTS_LIGHT: Record<string, string> = {
  '--bg': '#f6f8fb',
  '--bg-elev': '#ffffff',
  '--surface': 'rgba(255, 255, 255, 0.85)',
  '--surface-hover': 'rgba(15, 23, 42, 0.04)',
  '--surface-strong': '#ffffff',
  '--text': '#0f172a',
  '--text-muted': '#334155',
  '--text-subtle': '#475569',
  '--text-faint': '#64748b',
  '--text-inverse': '#f1f5f9',
  '--border': 'rgba(15, 23, 42, 0.10)',
  '--border-strong': 'rgba(15, 23, 42, 0.18)',
  '--accent': '#2563eb',
  '--accent-muted': 'rgba(37, 99, 235, 0.10)',
  '--accent-strong': '#1d4ed8',
  '--accent-fg': '#ffffff',
  '--shadow-card': '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
  '--shadow-card-hover': '0 2px 4px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.10)',
  '--shadow-modal': '0 4px 12px rgba(15, 23, 42, 0.10), 0 16px 48px rgba(15, 23, 42, 0.16)',
  '--shadow-text': '0 1px 2px rgba(15, 23, 42, 0.05)',
  '--shadow-icon': 'none',
  '--card-blur': '12px',
  '--card-border-width': '1.5px',
  '--radius': '10px',
  '--radius-sm': '6px',
  '--radius-lg': '14px',
};

/** Maps TokenOverridesSchema camelCase keys to CSS variable names. */
export const TOKEN_KEY_MAP: Record<string, string> = {
  bg: '--bg',
  bgElev: '--bg-elev',
  surface: '--surface',
  surfaceHover: '--surface-hover',
  surfaceStrong: '--surface-strong',
  text: '--text',
  textMuted: '--text-muted',
  textSubtle: '--text-subtle',
  textFaint: '--text-faint',
  textInverse: '--text-inverse',
  border: '--border',
  borderStrong: '--border-strong',
  accent: '--accent',
  accentMuted: '--accent-muted',
  accentStrong: '--accent-strong',
  accentFg: '--accent-fg',
  shadowCard: '--shadow-card',
  shadowCardHover: '--shadow-card-hover',
  shadowModal: '--shadow-modal',
  icon: '--icon-color',
};

const SHADOW_PRESETS = {
  none: { card: 'none', cardHover: 'none', modal: 'none' },
  subtle: {
    dark: {
      card: '0 4px 12px rgba(0, 0, 0, 0.20)',
      cardHover: '0 6px 16px rgba(0, 0, 0, 0.28)',
      modal: '0 8px 24px rgba(0, 0, 0, 0.30)',
    },
    light: {
      card: '0 1px 2px rgba(15, 23, 42, 0.03), 0 2px 8px rgba(15, 23, 42, 0.04)',
      cardHover: '0 2px 4px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
      modal: '0 2px 8px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.10)',
    },
  },
  normal: {
    dark: {
      card: TOKEN_DEFAULTS_DARK['--shadow-card'],
      cardHover: TOKEN_DEFAULTS_DARK['--shadow-card-hover'],
      modal: TOKEN_DEFAULTS_DARK['--shadow-modal'],
    },
    light: {
      card: TOKEN_DEFAULTS_LIGHT['--shadow-card'],
      cardHover: TOKEN_DEFAULTS_LIGHT['--shadow-card-hover'],
      modal: TOKEN_DEFAULTS_LIGHT['--shadow-modal'],
    },
  },
  strong: {
    dark: {
      card: '0 12px 32px rgba(0, 0, 0, 0.45)',
      cardHover: '0 16px 40px rgba(0, 0, 0, 0.55)',
      modal: '0 20px 56px rgba(0, 0, 0, 0.60)',
    },
    light: {
      card: '0 4px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.12)',
      cardHover: '0 6px 12px rgba(15, 23, 42, 0.10), 0 12px 32px rgba(15, 23, 42, 0.16)',
      modal: '0 8px 16px rgba(15, 23, 42, 0.12), 0 24px 64px rgba(15, 23, 42, 0.20)',
    },
  },
} as const;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function mixChannel(a: number, b: number, t: number): number {
  return Math.round(clamp(a + (b - a) * t, 0, 255));
}

function mixHex(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return a;
  const r = mixChannel(rgbA.r, rgbB.r, t);
  const g = mixChannel(rgbA.g, rgbB.g, t);
  const bl = mixChannel(rgbA.b, rgbB.b, t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Relative luminance (WCAG 2.x). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse hex or rgba() to hex for contrast checks (approximate for rgba). */
export function colorToHexApprox(color: string): string | null {
  if (color.startsWith('#')) return hexToRgb(color) ? color : null;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const [, r, g, b] = m;
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

/** Derive muted/subtle/faint text from primary text blended toward background. */
export function deriveTextRamp(
  textHex: string,
  bgHex: string,
  _mode: ColorMode,
): Record<string, string> {
  return {
    '--text-muted': mixHex(textHex, bgHex, 0.20),
    '--text-subtle': mixHex(textHex, bgHex, 0.38),
    '--text-faint': mixHex(textHex, bgHex, 0.55),
  };
}

export function deriveAccentVariants(accentHex: string, mode: ColorMode): Record<string, string> {
  const rgb = hexToRgb(accentHex);
  if (!rgb) {
    return {
      '--accent': accentHex,
      '--accent-muted': mode === 'dark' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(37, 99, 235, 0.10)',
      '--accent-strong': mode === 'dark' ? '#2563eb' : '#1d4ed8',
      '--accent-fg': '#ffffff',
    };
  }
  const { r, g, b } = rgb;
  const strongTarget = mode === 'dark' ? 0.35 : -0.25;
  const strongR = mixChannel(r, mode === 'dark' ? 0 : 255, Math.abs(strongTarget));
  const strongG = mixChannel(g, mode === 'dark' ? 0 : 255, Math.abs(strongTarget));
  const strongB = mixChannel(b, mode === 'dark' ? 0 : 255, Math.abs(strongTarget));
  const strongHex = `#${[strongR, strongG, strongB].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return {
    '--accent': accentHex,
    '--accent-muted': `rgba(${r}, ${g}, ${b}, ${mode === 'dark' ? 0.12 : 0.10})`,
    '--accent-strong': strongHex,
    '--accent-fg': '#ffffff',
  };
}

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
    const preset = SHADOW_PRESETS[shared.shadowIntensity];
    if (shared.shadowIntensity === 'none') {
      vars['--shadow-card'] = 'none';
      vars['--shadow-card-hover'] = 'none';
      vars['--shadow-modal'] = 'none';
    } else {
      const shadows = preset[mode];
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
    return { ...theme.background, ...theme.backgroundLight };
  }
  return theme.background;
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

export function computeBackgroundStyle(bg: Background): string {
  const blur = bg.blur > 0 ? `filter:blur(${bg.blur}px);` : '';
  if (bg.type === 'image') {
    return `background-image:url('${bg.value}');background-size:cover;background-position:center;${blur}`;
  }
  return `background:${bg.value};${blur}`;
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

export function buildGradientCss(angle: number, stops: { color: string; pos: number }[]): string {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const parts = sorted.map((s) => `${s.color} ${s.pos}%`).join(', ');
  return `linear-gradient(${angle}deg, ${parts})`;
}

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

export const TOKEN_CATEGORIES: Record<string, string[]> = {
  surfaces: ['bg', 'bgElev', 'surface', 'surfaceHover', 'surfaceStrong'],
  text: ['text', 'textMuted', 'textSubtle', 'textFaint', 'textInverse'],
  borders: ['border', 'borderStrong'],
  accent: ['accent', 'accentMuted', 'accentStrong', 'accentFg'],
  shadows: ['shadowCard', 'shadowCardHover', 'shadowModal'],
  icons: ['icon'],
};

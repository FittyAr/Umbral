/**
 * Valores por defecto de los tokens de tema, el mapeo camelCase → variable
 * CSS y los presets de sombra. Espeja `global.css`.
 */

export const FONT_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";

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

export const SHADOW_PRESETS = {
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

export const TOKEN_CATEGORIES: Record<string, string[]> = {
  surfaces: ['bg', 'bgElev', 'surface', 'surfaceHover', 'surfaceStrong'],
  text: ['text', 'textMuted', 'textSubtle', 'textFaint', 'textInverse'],
  borders: ['border', 'borderStrong'],
  accent: ['accent', 'accentMuted', 'accentStrong', 'accentFg'],
  shadows: ['shadowCard', 'shadowCardHover', 'shadowModal'],
  icons: ['icon'],
};

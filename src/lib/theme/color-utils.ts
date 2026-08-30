/**
 * Utilidades de color puras: conversión, mezcla, contraste WCAG y las
 * variantes derivadas del acento.
 *
 * Estaban duplicadas entre `theme-tokens.ts` y `theme-admin-client.ts`, que
 * es la clase de duplicación que se desincroniza sin que nadie lo note: el
 * admin mostraba un contraste calculado con una implementación y el público
 * pintaba con la otra.
 */

export type ColorMode = 'light' | 'dark';

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

export function buildGradientCss(angle: number, stops: { color: string; pos: number }[]): string {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const parts = sorted.map((s) => `${s.color} ${s.pos}%`).join(', ');
  return `linear-gradient(${angle}deg, ${parts})`;
}

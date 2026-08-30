/**
 * Client-side theme utilities exposed to Alpine adminApp and ThemeScript.
 * Mirrors src/lib/theme-tokens.ts for live preview in the admin panel.
 */

import type { Theme, Background } from './schema.ts';
import { ThemeSchema } from './schema.ts';
import {
  computeThemeVars,
  themeVarsToCss,
  resolveBackground,
  computeBackgroundStyle,
  type ColorMode,
} from './theme-tokens.ts';

export const THEME_PREVIEW_STORAGE_KEY = 'umbral-theme-preview';
export const THEME_PREVIEW_FONT_LINK_ID = 'umbral-theme-preview-font';

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

export function deriveAccentVariants(accentHex: string, mode: 'light' | 'dark') {
  const rgb = hexToRgb(accentHex);
  if (!rgb) {
    return {
      accentMuted: mode === 'dark' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(37, 99, 235, 0.10)',
      accentStrong: mode === 'dark' ? '#2563eb' : '#1d4ed8',
    };
  }
  const { r, g, b } = rgb;
  const t = mode === 'dark' ? 0.35 : 0.25;
  const strongR = Math.round(mode === 'dark' ? r * (1 - t) : r + (255 - r) * t);
  const strongG = Math.round(mode === 'dark' ? g * (1 - t) : g + (255 - g) * t);
  const strongB = Math.round(mode === 'dark' ? b * (1 - t) : b + (255 - b) * t);
  const strongHex = `#${[strongR, strongG, strongB].map((n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')).join('')}`;
  return {
    accentMuted: `rgba(${r}, ${g}, ${b}, ${mode === 'dark' ? 0.12 : 0.10})`,
    accentStrong: strongHex,
  };
}

export function buildGradientCss(angle: number, stops: { color: string; pos: number }[]): string {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const parts = sorted.map((s) => `${s.color} ${s.pos}%`).join(', ');
  return `linear-gradient(${angle}deg, ${parts})`;
}

/** @deprecated Use themeFrameInlineStyle + computeThemeVars for full token parity. */
export function computePreviewVars(theme: Record<string, unknown>, mode: 'light' | 'dark'): Record<string, string> {
  const accent = String(theme.accentColor || '#60a5fa');
  const text = String(theme.textColor || (mode === 'dark' ? '#f1f5f9' : '#0f172a'));
  const font = String(theme.fontFamily || 'Inter');
  const weight = String(theme.fontWeight || '400');
  const derived = deriveAccentVariants(accent, mode);
  return {
    '--accent': accent,
    '--text': text,
    '--font': `'${font}', system-ui, sans-serif`,
    '--font-weight': weight,
    '--accent-muted': derived.accentMuted,
    '--accent-strong': derived.accentStrong,
  };
}

export function resolvePreviewMode(
  previewMode: 'light' | 'dark' | 'auto',
  colorMode: string,
  autoStrategy: string,
): 'light' | 'dark' {
  if (previewMode === 'light' || previewMode === 'dark') return previewMode;
  if (colorMode === 'light' || colorMode === 'dark') return colorMode;
  return resolveAutoModeForTheme({ autoStrategy });
}

export function resolveAutoModeForTheme(theme: Record<string, unknown>): 'light' | 'dark' {
  const strategy = String(theme.autoStrategy || 'system');
  if (strategy === 'schedule') {
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? 'light' : 'dark';
  }
  if (typeof globalThis !== 'undefined' && 'matchMedia' in globalThis) {
    return globalThis.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function resolveDraftMode(
  theme: Theme,
  previewMode: 'light' | 'dark' | 'auto' | undefined,
  options?: { isPreview?: boolean },
): ColorMode {
  if (previewMode === 'light' || previewMode === 'dark') return previewMode;
  if (previewMode === 'auto') {
    return resolvePreviewMode('auto', theme.colorMode, theme.autoStrategy || 'system');
  }
  if (options?.isPreview) {
    if (theme.colorMode === 'light' || theme.colorMode === 'dark') return theme.colorMode;
    return resolveAutoModeForTheme(theme);
  }
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('umbral-color-mode') : null;
  const colorMode = stored || theme.colorMode || 'auto';
  if (colorMode === 'light' || colorMode === 'dark') return colorMode;
  return resolveAutoModeForTheme(theme);
}

export function themeFrameInlineStyle(theme: Theme, mode: ColorMode): string {
  return themeVarsToCss(computeThemeVars(theme, mode));
}

export function backgroundPreviewStyle(bg: Record<string, unknown>): string {
  return computeBackgroundStyle({
    type: (bg.type as Background['type']) || 'gradient',
    value: String(bg.value || '#0f172a'),
    blur: Number(bg.blur || 0),
    overlay: Number(bg.overlay || 0),
    overlayColor: String(bg.overlayColor || '#000000'),
  });
}

export function persistThemePreviewDraft(theme: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_PREVIEW_STORAGE_KEY, JSON.stringify(theme));
  } catch { /* quota */ }
}

export function parseThemeDraft(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseThemeFromDraft(raw: Record<string, unknown>): {
  theme: Theme;
  previewMode?: 'light' | 'dark' | 'auto';
} {
  const previewMode = raw._previewMode as 'light' | 'dark' | 'auto' | undefined;
  const { _previewMode: _ignored, ...themeRaw } = raw;
  const theme = ThemeSchema.parse({ background: {}, ...themeRaw });
  return { theme, previewMode };
}

function makeCanvasTransparent(doc: Document): void {
  doc.documentElement.style.background = 'transparent';
  if (doc.body) doc.body.style.background = 'transparent';
}

function ensureBgLayer(doc: Document, mode: 'dark' | 'light'): HTMLElement {
  let layer = doc.querySelector(`.bg-layer[data-bg-mode="${mode}"]`) as HTMLElement | null;
  if (!layer) {
    const legacy = doc.querySelector('.bg-layer:not([data-bg-mode])') as HTMLElement | null;
    if (legacy && mode === 'dark') {
      legacy.setAttribute('data-bg-mode', 'dark');
      return legacy;
    }
    layer = doc.createElement('div');
    layer.className = 'bg-layer';
    layer.setAttribute('data-bg-mode', mode);
    const anchor = doc.querySelector('.bg-layer') || doc.body.lastElementChild;
    if (anchor?.parentNode) anchor.parentNode.appendChild(layer);
    else doc.body.appendChild(layer);
  }
  return layer;
}

function ensureBgOverlay(doc: Document, mode: 'dark' | 'light'): HTMLElement {
  let overlay = doc.querySelector(`.bg-overlay[data-bg-mode="${mode}"]`) as HTMLElement | null;
  if (!overlay) {
    const legacy = doc.querySelector('.bg-overlay:not([data-bg-mode])') as HTMLElement | null;
    if (legacy && mode === 'dark') {
      legacy.setAttribute('data-bg-mode', 'dark');
      return legacy;
    }
    overlay = doc.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.setAttribute('data-bg-mode', mode);
    const bgLayer = doc.querySelector('.bg-layer');
    if (bgLayer?.parentNode) bgLayer.parentNode.insertBefore(overlay, bgLayer.nextSibling);
    else doc.body.appendChild(overlay);
  }
  return overlay;
}

function applyOverlayStyle(overlayEl: HTMLElement, bg: Record<string, unknown>): void {
  const overlayOpacity = Number(bg.overlay || 0);
  if (overlayOpacity > 0) {
    overlayEl.style.background = String(bg.overlayColor || '#000000');
    overlayEl.style.opacity = String(overlayOpacity);
    overlayEl.style.display = '';
  } else {
    overlayEl.style.opacity = '0';
    overlayEl.style.display = 'none';
  }
}

function applyBackgroundLayers(doc: Document, theme: Theme): void {
  const bgDark = theme.background as unknown as Record<string, unknown>;
  const bgLight = resolveBackground(theme, 'light') as unknown as Record<string, unknown>;
  ensureBgLayer(doc, 'dark').setAttribute('style', backgroundPreviewStyle(bgDark));
  ensureBgLayer(doc, 'light').setAttribute('style', backgroundPreviewStyle(bgLight));
  applyOverlayStyle(ensureBgOverlay(doc, 'dark'), bgDark);
  applyOverlayStyle(ensureBgOverlay(doc, 'light'), bgLight);
}

function ensureDraftFontLink(doc: Document, theme: Theme): void {
  const url = theme.fontUrl || googleFontUrl(theme.fontFamily, theme.fontWeight || '400');
  if (!url) return;
  let link = doc.getElementById(THEME_PREVIEW_FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement('link');
    link.id = THEME_PREVIEW_FONT_LINK_ID;
    link.rel = 'stylesheet';
    doc.head.appendChild(link);
  }
  link.href = url;
}

function applyCssVars(doc: Document, vars: Record<string, string>): void {
  const root = doc.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/** Apply a theme draft to the live public page DOM (preview tab). */
export function applyThemeDraft(themeInput: unknown, doc: Document = document): void {
  const raw = parseThemeDraft(themeInput);
  if (!raw || typeof doc === 'undefined') return;

  const { theme, previewMode } = parseThemeFromDraft(raw);
  const mode = resolveDraftMode(theme, previewMode, { isPreview: true });
  const vars = computeThemeVars(theme, mode);
  const root = doc.documentElement;

  applyCssVars(doc, vars);
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-theme-preview', '1');
  if (doc.body) {
    doc.body.style.fontWeight = vars['--font-weight'] || theme.fontWeight || '';
  }
  makeCanvasTransparent(doc);
  ensureDraftFontLink(doc, theme);
  applyBackgroundLayers(doc, theme);

  doc.querySelectorAll('.card').forEach((card) => {
    card.setAttribute('data-style', theme.cardStyle || 'glass');
  });

  const iconTint = theme.iconTint ?? 'original';
  doc.querySelectorAll('.card-icon').forEach((iconEl) => {
    const el = iconEl as HTMLElement;
    const img = el.querySelector('img');
    if (iconTint !== 'original' && img?.src) {
      el.setAttribute('data-icon-tint', iconTint);
      el.style.setProperty('--icon-url', `url('${img.src}')`);
    } else {
      el.removeAttribute('data-icon-tint');
      el.style.removeProperty('--icon-url');
    }
  });

  const header = doc.querySelector('.header') as HTMLElement | null;
  if (header) {
    const headerOpacity = Number(theme.headerOpacity ?? 1);
    if (headerOpacity < 1) {
      header.style.setProperty('--header-opacity', String(headerOpacity));
      header.style.opacity = String(headerOpacity);
    } else {
      header.style.removeProperty('--header-opacity');
      header.style.opacity = '';
    }
  }

  const footerWrap = doc.querySelector('.status-bar-wrap') as HTMLElement | null;
  const statusBar = doc.querySelector('.status-bar') as HTMLElement | null;
  const footerEl = footerWrap || statusBar;
  if (footerEl) {
    const footerOpacity = Number(theme.footerOpacity ?? 1);
    if (footerOpacity < 1) {
      footerEl.style.setProperty('--footer-opacity', String(footerOpacity));
      footerEl.style.opacity = String(footerOpacity);
    } else {
      footerEl.style.removeProperty('--footer-opacity');
      footerEl.style.opacity = '';
    }
  }

  const widgetMap: [string, boolean][] = [
    ['clock', Boolean(theme.showClock)],
    ['refresh', Boolean(theme.showRefresh)],
    ['statusBar', Boolean(theme.showStatusBar)],
    ['modeToggle', theme.showModeToggle !== false],
  ];
  for (const [name, visible] of widgetMap) {
    doc.querySelectorAll(`[data-theme-widget="${name}"]`).forEach((el) => {
      (el as HTMLElement).style.display = visible ? '' : 'none';
    });
  }
}

export const GOOGLE_FONTS_MAP: Record<string, string> = {
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  Lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  'Source Sans 3': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap',
  Nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
  Raleway: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap',
};

export function googleFontUrl(family: string, weight = '400'): string {
  const base = GOOGLE_FONTS_MAP[family];
  if (!base) return '';
  return base.replace(/wght@[^&]+/, `wght@${weight}`);
}

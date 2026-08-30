import type { AdminFragment } from "./types";
import * as themeClient from "~/lib/theme-admin-client";
import {
  applyThemePartialInPlace,
  replaceThemeInPlace,
  deriveTokensFromAccent,
  TOKEN_KEY_MAP,
  computeThemeVars,
  contrastRatio,
  colorToHexApprox,
} from "~/lib/theme-tokens";
import { getBuiltinPreset } from "~/lib/theme-presets";
import { computeAnimationCss, PREVIEW_TARGETS } from "~/lib/animations";
import { newId } from '~/lib/ids';

/**
 * Fragmento del objeto Alpine del admin: dominio theme.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createThemeState(): AdminFragment {
  return {
    themePreviewMode: 'auto',
    themePreviewRev: 0,
    themeAdvancedMode: 'dark',
    themeBgEditMode: 'dark',
    themeTextEditMode: 'dark',
    themeUseAdvancedCss: false,
    themeGradientAngle: 135,
    themeGradientStops: [
      { color: '#0f172a', pos: 0 },
      { color: '#1e3a8a', pos: 50 },
      { color: '#0f172a', pos: 100 },
    ],
    themeTokenSearch: '',
    updateFontUrl() {
      const t = this.cfg.theme;
      if (t.useGoogleFonts && t.fontFamily && t.fontFamily !== 'system-ui') {
        t.fontUrl = themeClient.googleFontUrl(t.fontFamily, t.fontWeight || '400');
      } else {
        t.fontUrl = '';
      }
      this.markDirty();
    },

    ensureThemeDefaults() {
      const th = this.cfg.theme;
      if (!th) return;
      if (!th.fontWeight) th.fontWeight = '400';
      if (typeof th.useGoogleFonts !== 'boolean') th.useGoogleFonts = false;
      if (!th.autoStrategy) th.autoStrategy = 'system';
      if (typeof th.showModeToggle !== 'boolean') th.showModeToggle = true;
      if (!th.clockPosition) th.clockPosition = 'header-right';
      if (!th.clockFormat) th.clockFormat = '24h';
      if (typeof th.headerOpacity !== 'number') th.headerOpacity = 1;
      if (typeof th.footerOpacity !== 'number') th.footerOpacity = 1;
      if (!Array.isArray(th.customPresets)) th.customPresets = [];
      if (!th.tokens) th.tokens = {};
      if (!th.tokens.shared) th.tokens.shared = {};
      if (!th.iconTint) th.iconTint = 'original';
    },

    themePreviewClockTick: 0,

    themePreviewClock() {
      void this.themePreviewClockTick;
      const fmt = this.cfg.theme.clockFormat || '24h';
      const now = new Date();
      if (fmt === '12h') {
        let h = now.getHours() % 12;
        if (h === 0) h = 12;
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        return `${h}:${m}:${s} ${ampm}`;
      }
      return now.toLocaleTimeString('es-AR', { hour12: false });
    },

    themeAnimationsReplay() { this.themePreviewRev++; },
    /** Deja la sección como recién instalada, sin tocar el resto del tema. */
    themeAnimationsResetAll() {
      Object.assign(this.cfg.theme.animations, {
        cardEntrance: 'none',
        categoryEntrance: 'none',
        headerEffect: 'none',
        cardHover: 'default',
        hoverDuration: 180,
        titleTypewriter: false,
        counters: false,
      });
    },

    themePresetsList() {
      const builtin = window.__builtinThemePresets || [];
      const custom = (this.cfg?.theme?.customPresets || []).map((cp) => ({
        id: cp.id,
        nameKey: cp.name,
        descriptionKey: cp.name,
        previewColors: [cp.theme?.accentColor || '#60a5fa', '#0f172a', cp.theme?.textColor || '#f1f5f9'],
        theme: cp.theme,
        custom: true,
      }));
      return [...builtin, ...custom];
    },

    presetLabel(preset) {
      if (preset.custom) return preset.nameKey;
      return window.__themePresetI18n?.names?.[preset.id] || preset.id;
    },

    presetDesc(preset) {
      if (preset.custom) return '';
      return window.__themePresetI18n?.descs?.[preset.id] || '';
    },

    presetVariantDarkLabel() {
      return window.__themePresetI18n?.variantDark || 'Oscuro';
    },

    presetVariantLightLabel() {
      return window.__themePresetI18n?.variantLight || 'Claro';
    },

    presetApplyCustomLabel() {
      return window.__themePresetI18n?.applyCustom || 'Aplicar';
    },

    presetThumbStyle(preset, variant = 'dark') {
      if (preset.custom) {
        const [a, b, c] = preset.previewColors || ['#0f172a', '#1e3a8a', '#0f172a'];
        return `background:linear-gradient(135deg, ${a}, ${b}, ${c})`;
      }
      const colors = preset.previewColors?.[variant]
        || preset.previewColors?.dark
        || ['#0f172a', '#1e3a8a', '#0f172a'];
      const [a, b, c] = colors;
      return `background:linear-gradient(135deg, ${a}, ${b}, ${c})`;
    },

    applyThemePresetById(id, variant = 'dark') {
      const builtin = getBuiltinPreset(id);
      const custom = (this.cfg.theme.customPresets || []).find((p) => p.id === id);
      if (custom) {
        applyThemePartialInPlace(this.cfg.theme, custom.theme);
      } else if (builtin) {
        applyThemePartialInPlace(this.cfg.theme, { ...builtin.theme, colorMode: variant });
      } else return;
      if (!custom) this.themePreviewMode = variant;
      this.parseGradientFromBackground();
      this.updateFontUrl();
      this.themePreviewRev++;
      this.syncThemePreviewStorage();
      this.markDirty();
      window.umbralAdmin.toast(this.l('themePresetApplied'), 'success');
    },

    saveCustomThemePreset() {
      const name = prompt('Nombre del preset:', 'Mi tema');
      if (!name) return;
      const id = newId('custom');
      if (!this.cfg.theme.customPresets) this.cfg.theme.customPresets = [];
      if (this.cfg.theme.customPresets.length >= 5) {
        window.umbralAdmin.toast('Máximo 5 presets custom', 'error');
        return;
      }
      const snapshot = JSON.parse(JSON.stringify(this.cfg.theme));
      delete snapshot.customPresets;
      delete snapshot.tokens;
      this.cfg.theme.customPresets.push({ id, name, theme: snapshot });
      this.markDirty();
      window.umbralAdmin.toast(this.l('themePresetSaved'), 'success');
    },

    resetThemeToDefaults() {
      if (!confirm('¿Restaurar tema a defaults?')) return;
      const defaults = window.__initialConfig?.theme || {};
      replaceThemeInPlace(this.cfg.theme, JSON.parse(JSON.stringify(defaults)));
      this.ensureThemeDefaults();
      this.parseGradientFromBackground();
      this.updateFontUrl();
      this.themePreviewRev++;
      this.syncThemePreviewStorage();
      this.markDirty();
    },

    buildGradientCss() {
      return themeClient.buildGradientCss(this.themeGradientAngle, this.themeGradientStops);
    },

    syncGradientToBackground() {
      const bg = this.getActiveBackgroundRef();
      if (bg.type === 'gradient' && !this.themeUseAdvancedCss) {
        bg.value = this.buildGradientCss();
        this.themePreviewRev++;
        this.syncThemePreviewStorage();
      }
    },

    parseGradientFromBackground() {
      const val = this.getActiveBackgroundRef()?.value || '';
      const m = val.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
      if (!m) return;
      this.themeGradientAngle = parseInt(m[1], 10);
      const stops = m[2].split(',').map((s) => s.trim());
      this.themeGradientStops = stops.slice(0, 4).map((s, i) => {
        const parts = s.split(/\s+/);
        return { color: parts[0], pos: parseInt(parts[1], 10) || Math.round((i / Math.max(stops.length - 1, 1)) * 100) };
      });
    },

    onBackgroundTypeChange() {
      if (this.getActiveBackgroundRef().type === 'gradient') this.syncGradientToBackground();
    },

    getActiveBackgroundRef() {
      if (this.themeBgEditMode === 'light') {
        if (!this.cfg.theme.backgroundLight) {
          this.cfg.theme.backgroundLight = JSON.parse(JSON.stringify(this.cfg.theme.background));
        }
        return this.cfg.theme.backgroundLight;
      }
      return this.cfg.theme.background;
    },

    getActiveBgProp(key) {
      return this.getActiveBackgroundRef()?.[key];
    },

    setActiveBgProp(key, value) {
      this.getActiveBackgroundRef()[key] = value;
      this.themePreviewRev++;
      this.syncThemePreviewStorage();
      this.markDirty();
    },

    copyBackgroundFromOtherMode() {
      const src = this.themeBgEditMode === 'light'
        ? this.cfg.theme.background
        : (this.cfg.theme.backgroundLight || this.cfg.theme.background);
      const dst = this.getActiveBackgroundRef();
      Object.assign(dst, JSON.parse(JSON.stringify(src)));
      this.parseGradientFromBackground();
      this.themePreviewRev++;
      this.syncThemePreviewStorage();
      this.markDirty();
    },


    tokenColorInputForMode(key) {
      const v = this.getModeToken(key);
      if (v && v.startsWith('#')) return v;
      return '#888888';
    },

    themeTokenDefaultPlaceholder(key) {
      return '(default)';
    },

    themeTextContrastRatio() {
      const mode = this.themeTextEditMode;
      const vars = computeThemeVars(this.cfg.theme, mode);
      if (!vars) return 0;
      const text = colorToHexApprox(vars['--text'] || '');
      const surface = colorToHexApprox(vars['--surface'] || '');
      if (!text || !surface) return 0;
      return contrastRatio(text, surface) ?? 0;
    },

    themeContrastLabel(key) {
      if (key !== 'text') return '';
      const ratio = this.themeTextContrastRatio();
      if (!ratio) return '';
      const pass = this.l('themeContrastPass');
      const fail = this.l('themeContrastFail');
      const label = ratio >= 4.5 ? pass : fail;
      return `${ratio.toFixed(1)}:1 · ${label}`;
    },

    themeContrastClass(key) {
      if (key !== 'text') return '';
      return this.themeTextContrastRatio() >= 4.5 ? 'theme-contrast-ok' : 'theme-contrast-fail';
    },

    themePreviewActiveBg() {
      const mode = this.effectivePreviewMode();
      if (mode === 'light' && this.cfg.theme.backgroundLight) {
        return this.cfg.theme.backgroundLight;
      }
      return this.cfg.theme.background;
    },

    themePreviewBgStyleForMode() {
      return themeClient.backgroundPreviewStyle(this.themePreviewActiveBg());
    },

    themePreviewOverlayStyleForMode() {
      const bg = this.themePreviewActiveBg();
      return `background:${bg.overlayColor};opacity:${bg.overlay}`;
    },

    themePreviewCardIconStyle(card) {
      const tint = this.cfg.theme.iconTint ?? 'original';
      const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 2L2 7l10 5 10-5-10-5z"/></svg>');
      if (tint === 'original') {
        return `background:${card.color};`;
      }
      return `--icon-url:url("data:image/svg+xml,${svg}");`;
    },

    onAdvancedCssToggle() {
      if (!this.themeUseAdvancedCss && this.cfg.theme.background.type === 'gradient') {
        this.syncGradientToBackground();
      }
    },

    effectivePreviewMode() {
      return themeClient.resolvePreviewMode(
        this.themePreviewMode,
        this.cfg.theme.colorMode,
        this.cfg.theme.autoStrategy || 'system',
      );
    },

    themePreviewFrameStyle() {
      return themeClient.themeFrameInlineStyle(this.cfg.theme, this.effectivePreviewMode());
    },

    themePreviewBgStyle() {
      return themeClient.backgroundPreviewStyle(this.cfg.theme.background);
    },

    themePreviewOverlayStyle() {
      const bg = this.cfg.theme.background;
      return `background:${bg.overlayColor};opacity:${bg.overlay}`;
    },

    /**
     * CSS de animaciones para la miniatura, generado con el mismo helper
     * que la portada pero apuntando al markup del preview.
     *
     * El disparo por scroll se fuerza a 'load': en la miniatura no corre
     * el IntersectionObserver, así que si no, elegir "al entrar en
     * pantalla" haría que la vista previa dejara de mostrar el efecto.
     */
    themePreviewAnimationCss() {
      if (!this.isFeatureOn('animations')) return '';
      const animations = { ...this.cfg.theme.animations, entranceTrigger: 'load' };
      const targets = { ...PREVIEW_TARGETS, nameSuffix: `-p${this.themePreviewRev}` };
      return computeAnimationCss(animations, targets);
    },

    themePreviewCards() {
      const accent = this.cfg.theme.accentColor;
      return [
        { title: 'App', color: accent },
        { title: 'Docs', color: accent },
        { title: 'Admin', color: accent },
      ];
    },

    themePreviewAccentMutedStyle() {
      const mode = this.effectivePreviewMode();
      const d = themeClient.deriveAccentVariants(this.cfg.theme.accentColor, mode);
      return `width:32px;height:32px;border-radius:6px;background:${d.accentMuted}`;
    },

    themePreviewAccentStrongStyle() {
      const mode = this.effectivePreviewMode();
      const d = themeClient.deriveAccentVariants(this.cfg.theme.accentColor, mode);
      return `width:32px;height:32px;border-radius:6px;background:${d.accentStrong}`;
    },

    syncThemePreviewStorage() {
      themeClient.persistThemePreviewDraft?.({
        ...this.cfg?.theme,
        _previewMode: this.themePreviewMode,
      });
    },

    openThemePreviewTab() {
      this.syncThemePreviewStorage();
      const base = window.umbralAdmin?.baseUrl || '/';
      const url = base + (base.endsWith('/') ? '' : '/') + '?themePreview=1';
      window.open(url, '_blank');
    },

    setSharedToken(key, value) {
      if (!this.cfg.theme.tokens) this.cfg.theme.tokens = {};
      if (!this.cfg.theme.tokens.shared) this.cfg.theme.tokens.shared = {};
      this.cfg.theme.tokens.shared[key] = value;
      this.markDirty();
    },

    ensureModeTokens(mode) {
      const m = mode || this.themeAdvancedMode;
      if (!this.cfg.theme.tokens) this.cfg.theme.tokens = {};
      if (!this.cfg.theme.tokens[m]) {
        this.cfg.theme.tokens[m] = {};
      }
    },

    tokenModeForKey(key) {
      const textKeys = ['text', 'textMuted', 'textSubtle', 'textFaint', 'icon'];
      if (textKeys.includes(key)) return this.themeTextEditMode;
      return this.themeAdvancedMode;
    },

    getModeToken(key) {
      const mode = this.tokenModeForKey(key);
      return this.cfg.theme.tokens?.[mode]?.[key] || '';
    },

    setModeToken(key, value) {
      const mode = this.tokenModeForKey(key);
      this.ensureModeTokens(mode);
      if (!value) {
        delete this.cfg.theme.tokens[mode][key];
      } else {
        this.cfg.theme.tokens[mode][key] = value;
      }
      this.themePreviewRev++;
      this.syncThemePreviewStorage();
      this.markDirty();
    },

    tokenColorInput(key) {
      const v = this.getModeToken(key);
      return v.startsWith('#') ? v : '#000000';
    },

    themeFilteredTokenKeys() {
      const keys = window.__themeTokenKeys || Object.keys(TOKEN_KEY_MAP || {});
      const q = (this.themeTokenSearch || '').toLowerCase();
      return keys.filter((k) => !q || k.toLowerCase().includes(q) || k.replace(/([A-Z])/g, '-$1').toLowerCase().includes(q));
    },

    deriveThemeTokensFromAccent() {
      const mode = this.themeAdvancedMode;
      const derived = deriveTokensFromAccent(this.cfg.theme.accentColor, mode);
      this.ensureModeTokens();
      Object.assign(this.cfg.theme.tokens[mode], derived);
      this.markDirty();
    },

    resetThemeTokenCategory(category) {
      const cats = window.__themeTokenCategories || {};
      const keys = cats[category] || [];
      this.ensureModeTokens();
      for (const k of keys) delete this.cfg.theme.tokens[this.themeAdvancedMode][k];
      this.markDirty();
    },

    exportThemeJson() {
      const blob = new Blob([JSON.stringify({ theme: this.cfg.theme }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'umbral-theme.json';
      a.click();
      window.umbralAdmin.toast(this.l('themeExported'), 'success');
    },

    importThemeJson() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!data.theme) throw new Error('JSON inválido: falta theme');
          applyThemePartialInPlace(this.cfg.theme, data.theme);
          this.ensureThemeDefaults();
          this.parseGradientFromBackground();
          this.updateFontUrl();
          this.themePreviewRev++;
          this.syncThemePreviewStorage();
          this.markDirty();
          window.umbralAdmin.toast(this.l('themeImported'), 'success');
        } catch (e) {
          window.umbralAdmin.toast(e.message, 'error');
        }
      };
      input.click();
    },

    previewStyle() {
      return this.themePreviewBgStyle();
    },

  };
}

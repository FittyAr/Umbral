import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  computeThemeVars,
  themeVarsToCss,
  mergeThemePartial,
  applyThemePartialInPlace,
  buildGradientCss,
  deriveAccentVariants,
  deriveTextRamp,
  contrastRatio,
  colorToHexApprox,
  resolveBackground,
  computeBackgroundStyle,
} from '../src/lib/theme-tokens.ts';
import { applyThemePreset, applyThemePresetPartial, getBuiltinPreset, getPresetVariant, BUILTIN_THEME_PRESETS } from '../src/lib/theme-presets.ts';
import { ThemeSchema } from '../src/lib/schema/index.ts';
import {
  applyThemeDraft,
  backgroundPreviewStyle,
  parseThemeDraft,
  resolveDraftMode,
  themeFrameInlineStyle,
  THEME_PREVIEW_STORAGE_KEY,
} from '../src/lib/theme-admin-client.ts';

describe('theme-tokens', () => {
  const baseTheme = ThemeSchema.parse({ background: {} });

  test('computeThemeVars sets accent and derived variants', () => {
    const vars = computeThemeVars({ ...baseTheme, accentColor: '#ff0000' }, 'dark');
    assert.equal(vars['--accent'], '#ff0000');
    assert.ok(vars['--accent-muted']?.includes('255'));
    assert.ok(vars['--accent-strong']);
  });

  test('deriveTextRamp produces muted/subtle/faint from text and bg', () => {
    const ramp = deriveTextRamp('#ffffff', '#000000', 'dark');
    assert.ok(ramp['--text-muted']);
    assert.ok(ramp['--text-subtle']);
    assert.ok(ramp['--text-faint']);
    assert.notEqual(ramp['--text-muted'], '#ffffff');
  });

  test('legacy textColor applies only to matching mode by luminance', () => {
    const lightTextTheme = { ...baseTheme, textColor: '#fff7ed' };
    const darkVars = computeThemeVars(lightTextTheme, 'dark');
    const lightVars = computeThemeVars(lightTextTheme, 'light');
    assert.equal(darkVars['--text'], '#fff7ed');
    assert.notEqual(lightVars['--text'], '#fff7ed');
  });

  test('resolveBackground uses backgroundLight in light mode', () => {
    const theme = ThemeSchema.parse({
      background: { type: 'color', value: '#000000' },
      backgroundLight: { type: 'color', value: '#ffffff' },
    });
    assert.equal(resolveBackground(theme, 'dark').value, '#000000');
    assert.equal(resolveBackground(theme, 'light').value, '#ffffff');
  });

  test('iconTint accent sets --icon-color', () => {
    const vars = computeThemeVars({ ...baseTheme, iconTint: 'accent' }, 'dark');
    assert.equal(vars['--icon-color'], vars['--accent']);
  });

  test('iconTint text sets --icon-color to text', () => {
    const vars = computeThemeVars({ ...baseTheme, iconTint: 'text', tokens: { dark: { text: '#abcdef' } } }, 'dark');
    assert.equal(vars['--icon-color'], '#abcdef');
  });

  test('contrastRatio returns expected range', () => {
    const ratio = contrastRatio('#ffffff', '#000000');
    assert.ok(ratio >= 20);
    assert.ok(ratio <= 21);
  });

  test('colorToHexApprox parses rgba', () => {
    assert.equal(colorToHexApprox('rgba(255, 255, 255, 0.04)'), '#ffffff');
  });

  test('themeVarsToCss produces valid CSS string', () => {
    const css = themeVarsToCss({ '--accent': '#60a5fa', '--text': '#fff' });
    assert.match(css, /--accent:#60a5fa/);
    assert.match(css, /--text:#fff/);
  });

  test('buildGradientCss orders stops by position', () => {
    const css = buildGradientCss(135, [
      { color: '#000', pos: 100 },
      { color: '#fff', pos: 0 },
    ]);
    assert.match(css, /linear-gradient\(135deg, #fff 0%, #000 100%\)/);
  });

  test('mergeThemePartial deep-merges background', () => {
    const merged = mergeThemePartial(baseTheme, {
      background: { value: '#111111' },
    });
    assert.equal(merged.background.value, '#111111');
    assert.equal(merged.background.type, baseTheme.background.type);
  });

  test('mergeThemePartial works with proxy-like objects', () => {
    const proxyLike = new Proxy(baseTheme, {
      get(target, prop) {
        return target[prop as keyof typeof target];
      },
    });
    const merged = mergeThemePartial(proxyLike as typeof baseTheme, { accentColor: '#ff0000' });
    assert.equal(merged.accentColor, '#ff0000');
  });

  test('applyThemePartialInPlace mutates target in place', () => {
    const target = ThemeSchema.parse({ background: {} });
    applyThemePartialInPlace(target, { accentColor: '#abcdef', background: { value: '#222222' } });
    assert.equal(target.accentColor, '#abcdef');
    assert.equal(target.background.value, '#222222');
  });

  test('deriveAccentVariants returns hex strong color', () => {
    const v = deriveAccentVariants('#60a5fa', 'dark');
    assert.equal(v['--accent'], '#60a5fa');
    assert.match(v['--accent-strong'], /^#[0-9a-f]{6}$/i);
  });
});

describe('theme-presets', () => {
  const baseTheme = ThemeSchema.parse({ background: {} });

  test('has 8 builtin presets', () => {
    assert.equal(BUILTIN_THEME_PRESETS.length, 8);
  });

  test('each builtin preset has dual palette tokens', () => {
    for (const preset of BUILTIN_THEME_PRESETS) {
      assert.ok(preset.previewColors.dark, `${preset.id} missing dark previewColors`);
      assert.ok(preset.previewColors.light, `${preset.id} missing light previewColors`);
      assert.ok(preset.theme.tokens?.dark?.text, `${preset.id} missing dark text token`);
      assert.ok(preset.theme.tokens?.light?.text, `${preset.id} missing light text token`);
      assert.ok(preset.theme.backgroundLight, `${preset.id} missing backgroundLight`);
    }
  });

  test('each preset meets AA contrast for text on surface in both modes', () => {
    for (const preset of BUILTIN_THEME_PRESETS) {
      for (const mode of ['dark', 'light'] as const) {
        const merged = applyThemePreset(baseTheme, preset, mode);
        const vars = computeThemeVars(merged, mode);
        const text = colorToHexApprox(vars['--text'] || '');
        const surface = colorToHexApprox(vars['--surface-strong'] || vars['--surface'] || '');
        assert.ok(text && surface, `${preset.id}/${mode}: missing text or surface hex`);
        const ratio = contrastRatio(text, surface);
        assert.ok(ratio >= 4.5, `${preset.id}/${mode}: text/surface contrast ${ratio.toFixed(2)} < 4.5`);
      }
    }
  });

  test('applyThemePreset merges dark variant', () => {
    const preset = getBuiltinPreset('terminal');
    assert.ok(preset);
    const merged = applyThemePreset(baseTheme, preset!, 'dark');
    assert.equal(merged.cardStyle, 'outlined');
    assert.equal(merged.accentColor, '#22c55e');
    assert.equal(merged.colorMode, 'dark');
  });

  test('applyThemePreset light sets colorMode and has backgroundLight', () => {
    const preset = getBuiltinPreset('sunset');
    assert.ok(preset);
    const light = applyThemePreset(baseTheme, preset!, 'light');
    assert.equal(light.colorMode, 'light');
    assert.notEqual(light.background.value, light.backgroundLight?.value);
    assert.match(light.backgroundLight?.value || '', /#fff7ed/i);
  });

  test('getPresetVariant returns preview colors for mode', () => {
    const preset = getBuiltinPreset('sunset');
    assert.ok(preset);
    const light = getPresetVariant(preset, 'light');
    assert.deepEqual(light.previewColors, preset.previewColors.light);
    assert.match(light.theme.backgroundLight?.value || '', /#fff7ed/i);
  });

  test('custom preset partial validates via ThemeSchema defaults', () => {
    const merged = applyThemePresetPartial(baseTheme, { accentColor: '#ff5722' });
    const parsed = ThemeSchema.parse(merged);
    assert.equal(parsed.accentColor, '#ff5722');
  });
});

describe('cardStyle runtime', () => {
  test('ThemeSchema defaults cardStyle to glass', () => {
    const t = ThemeSchema.parse({ background: {} });
    assert.equal(t.cardStyle, 'glass');
  });

  test('ThemeSchema defaults iconTint to original', () => {
    const t = ThemeSchema.parse({ background: {} });
    assert.equal(t.iconTint, 'original');
  });

  test('cardStyle enum accepts flat/glass/outlined', () => {
    for (const style of ['flat', 'glass', 'outlined'] as const) {
      const t = ThemeSchema.parse({ background: {}, cardStyle: style });
      assert.equal(t.cardStyle, style);
    }
  });
});

describe('theme preview draft', () => {
  test('backgroundPreviewStyle includes gradient value', () => {
    const gradient = 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)';
    const css = backgroundPreviewStyle({ type: 'gradient', value: gradient, blur: 0 });
    assert.match(css, /background:linear-gradient/);
    assert.match(css, /#0f172a/);
  });

  test('parseThemeDraft parses JSON string', () => {
    const draft = parseThemeDraft('{"accentColor":"#ff0000"}');
    assert.equal(draft?.accentColor, '#ff0000');
  });

  test('applyThemeDraft sets dual bg-layer styles', () => {
    const dom = new JSDOM('<!doctype html><html><body><div class="bg-layer"></div></body></html>');
    const doc = dom.window.document;
    const gradientDark = 'linear-gradient(160deg, #0c4a6e 0%, #0ea5e9 100%)';
    const gradientLight = 'linear-gradient(160deg, #e0f2fe 0%, #bae6fd 100%)';
    applyThemeDraft({
      accentColor: '#38bdf8',
      textColor: '#e0f2fe',
      background: { type: 'gradient', value: gradientDark, blur: 0, overlay: 0 },
      backgroundLight: { type: 'gradient', value: gradientLight, blur: 0, overlay: 0 },
      cardStyle: 'glass',
      colorMode: 'dark',
      _previewMode: 'dark',
    }, doc);
    const darkBg = doc.querySelector('.bg-layer[data-bg-mode="dark"]');
    const lightBg = doc.querySelector('.bg-layer[data-bg-mode="light"]');
    assert.ok(darkBg);
    assert.ok(lightBg);
    assert.match(darkBg.getAttribute('style') || '', /#0c4a6e/);
    assert.match(lightBg.getAttribute('style') || '', /#e0f2fe/);
  });

  test('applyThemeDraft applies full token vars including surface and border', () => {
    const preset = getBuiltinPreset('sunset');
    assert.ok(preset);
    const merged = applyThemePreset(ThemeSchema.parse({ background: {} }), preset!, 'dark');
    const dom = new JSDOM('<!doctype html><html><body><div class="bg-layer"></div></body></html>');
    const doc = dom.window.document;
    applyThemeDraft({ ...merged, _previewMode: 'dark' }, doc);
    const expected = computeThemeVars(merged, 'dark');
    assert.equal(doc.documentElement.style.getPropertyValue('--text'), expected['--text']);
    assert.equal(doc.documentElement.style.getPropertyValue('--surface'), expected['--surface']);
    assert.equal(doc.documentElement.style.getPropertyValue('--border'), expected['--border']);
    assert.equal(doc.documentElement.getAttribute('data-theme-preview'), '1');
  });

  test('resolveDraftMode honors _previewMode from draft', () => {
    const theme = ThemeSchema.parse({ background: {}, colorMode: 'dark' });
    assert.equal(resolveDraftMode(theme, 'light', { isPreview: true }), 'light');
    assert.equal(resolveDraftMode(theme, 'dark', { isPreview: true }), 'dark');
  });

  test('resolveDraftMode in preview ignores stored color mode preference', () => {
    const theme = ThemeSchema.parse({ background: {}, colorMode: 'dark' });
    const prev = globalThis.localStorage;
    const store: Record<string, string> = { 'umbral-color-mode': 'light' };
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
      },
      configurable: true,
    });
    assert.equal(resolveDraftMode(theme, undefined, { isPreview: true }), 'dark');
    Object.defineProperty(globalThis, 'localStorage', { value: prev, configurable: true });
  });

  test('themeFrameInlineStyle matches computeThemeVars output', () => {
    const preset = getBuiltinPreset('sunset');
    assert.ok(preset);
    const theme = applyThemePreset(ThemeSchema.parse({ background: {} }), preset!, 'dark');
    const css = themeFrameInlineStyle(theme, 'dark');
    assert.match(css, /--accent:#fb923c/);
    assert.match(css, /--text:#fff7ed/);
    assert.match(css, /--surface:/);
  });

  test('THEME_PREVIEW_STORAGE_KEY is stable', () => {
    assert.equal(THEME_PREVIEW_STORAGE_KEY, 'umbral-theme-preview');
  });

  test('resolveBackground uses backgroundLight atomically in light mode', () => {
    const theme = ThemeSchema.parse({
      background: {
        type: 'image',
        value: '/api/assets/dark-bg.png',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #e2e8f0, #93c5fd)',
        blur: 0,
        overlay: 0,
        overlayColor: '#ffffff',
      },
    });
    const light = resolveBackground(theme, 'light');
    assert.equal(light.type, 'gradient');
    assert.equal(light.value, 'linear-gradient(135deg, #e2e8f0, #93c5fd)');
    assert.notEqual(light.type, 'image');
  });

  test('computeBackgroundStyle does not url() gradient when type is image', () => {
    const css = computeBackgroundStyle({
      type: 'image',
      value: 'linear-gradient(258deg, #000, #fff)',
      blur: 0,
      overlay: 0,
      overlayColor: '#000',
    });
    assert.match(css, /^background:linear-gradient/);
    assert.doesNotMatch(css, /url\(/);
  });
});

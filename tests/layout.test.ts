import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { LayoutSchema } from '../src/lib/schema.ts';
import {
  buildLayoutCssVars,
  layoutCssVarsToString,
  getPreviewColumns,
  layoutPreviewSampleGroups,
  layoutPreviewFrameStyle,
  layoutPreviewPageStyle,
  PREVIEW_GAP_SCALE,
} from '../src/lib/layout-admin-client.ts';

describe('LayoutSchema', () => {
  test('applies defaults for legacy configs missing new fields', () => {
    const layout = LayoutSchema.parse({
      columnsDesktop: 5,
      columnsTablet: 3,
      columnsMobile: 2,
      cardSize: 'medium',
      showDescriptions: true,
      healthCheckInterval: 120,
    });

    assert.equal(layout.gap, 1);
    assert.equal(layout.maxWidth, 1280);
    assert.equal(layout.gridAlign, 'center');
    assert.equal(layout.cardRadius, 12);
    assert.equal(layout.compact, false);
    // Defaults reproduce the spacing that used to come from the header margin.
    assert.equal(layout.categoryGap, 2);
    assert.equal(layout.ghostCategoryGap, 0.35);
  });

  test('validates new field boundaries', () => {
    assert.throws(() => LayoutSchema.parse({ gap: -0.1 }));
    assert.throws(() => LayoutSchema.parse({ maxWidth: 500 }));
    assert.throws(() => LayoutSchema.parse({ cardRadius: 40 }));
    assert.throws(() => LayoutSchema.parse({ categoryGap: -0.1 }));
    assert.throws(() => LayoutSchema.parse({ categoryGap: 6.5 }));
    assert.throws(() => LayoutSchema.parse({ ghostCategoryGap: -1 }));
    assert.throws(() => LayoutSchema.parse({ ghostCategoryGap: 7 }));
  });

  test('allows collapsing either gap to zero', () => {
    const layout = LayoutSchema.parse({ categoryGap: 0, ghostCategoryGap: 0 });
    assert.equal(layout.categoryGap, 0);
    assert.equal(layout.ghostCategoryGap, 0);
  });
});

describe('layout-admin-client', () => {
  const layout = LayoutSchema.parse({});

  test('buildLayoutCssVars includes grid variables', () => {
    const vars = buildLayoutCssVars({ ...layout, gap: 1.5, maxWidth: 1440, cardRadius: 8 });
    assert.equal(vars['--grid-gap'], '1.5rem');
    assert.equal(vars['--content-max-width'], '1440px');
    assert.equal(vars['--card-radius'], '8px');
    assert.equal(vars['--cols-desktop'], '4');
  });

  test('buildLayoutCssVars exposes the category spacing variables', () => {
    const vars = buildLayoutCssVars({ ...layout, categoryGap: 3.5, ghostCategoryGap: 0 });
    assert.equal(vars['--category-gap'], '3.5rem');
    assert.equal(vars['--ghost-category-gap'], '0rem');
  });

  test('layoutCssVarsToString joins variables', () => {
    const str = layoutCssVarsToString({ '--grid-gap': '1rem', '--cols-mobile': '2' });
    assert.match(str, /--grid-gap:1rem/);
    assert.match(str, /--cols-mobile:2/);
  });

  test('getPreviewColumns respects viewport', () => {
    const custom = LayoutSchema.parse({ columnsMobile: 1, columnsTablet: 2, columnsDesktop: 6 });
    assert.equal(getPreviewColumns(custom, 'mobile'), 1);
    assert.equal(getPreviewColumns(custom, 'tablet'), 2);
    assert.equal(getPreviewColumns(custom, 'desktop'), 6);
  });

  test('layoutPreviewSampleGroups fills a full row per titled group', () => {
    const groups = layoutPreviewSampleGroups(true, 7);
    const titled = groups.filter((g) => !g.isGhost);
    assert.equal(titled.length, 2);
    for (const group of titled) assert.equal(group.cards.length, 7);
    assert.ok(groups[0].cards[0].description);
    const noDesc = layoutPreviewSampleGroups(false, 4);
    assert.equal(noDesc[0].cards[0].description, '');
    assert.equal(noDesc[0].cards.length, 4);
  });

  test('layoutPreviewSampleGroups puts an untitled ghost block between the groups', () => {
    const groups = layoutPreviewSampleGroups(true, 4);
    assert.deepEqual(groups.map((g) => g.isGhost), [false, true, false]);
    const ghost = groups[1];
    assert.equal(ghost.name, '');
    // A partial row reads as "loose cards" instead of another full group.
    assert.equal(ghost.cards.length, 3);
    assert.ok(ghost.cards.length > 0);
  });

  test('the ghost sample keeps at least one card on a single-column layout', () => {
    const groups = layoutPreviewSampleGroups(true, 1);
    assert.equal(groups[1].cards.length, 1);
  });

  test('layoutPreviewFrameStyle fills panel without transform scale', () => {
    const style = layoutPreviewFrameStyle(layout, 'desktop', 300);
    assert.match(style, /width:100%/);
    assert.doesNotMatch(style, /transform:scale\(/);
    assert.match(style, /--preview-cols:4/);
  });

  test('layoutPreviewPageStyle reflects maxWidth and gridAlign', () => {
    const centered = layoutPreviewPageStyle(
      { ...layout, maxWidth: 720, gridAlign: 'center' },
      'desktop',
    );
    assert.match(centered, /margin-inline:auto/);
    assert.match(centered, /width:50%/); // 720/1440

    const left = layoutPreviewPageStyle(
      { ...layout, maxWidth: 1440, gridAlign: 'left' },
      'desktop',
    );
    assert.match(left, /margin-inline:0 auto/);
    assert.match(left, /width:100%/);
  });

  test('preview styles scale the category gaps down to mockup size', () => {
    const wide = { ...layout, categoryGap: 2, ghostCategoryGap: 0.35 };
    for (const style of [
      layoutPreviewFrameStyle(wide, 'desktop', 300),
      layoutPreviewPageStyle(wide, 'desktop'),
    ]) {
      // Full-size rem values would swamp the small sample cards.
      assert.match(style, /--preview-category-gap:0\.85rem/);
      assert.match(style, /--preview-ghost-category-gap:0\.15rem/);
    }
  });

  test('preview gaps stay proportional when the configured gap changes', () => {
    const tight = layoutPreviewFrameStyle({ ...layout, categoryGap: 0 }, 'desktop', 300);
    assert.match(tight, /--preview-category-gap:0rem/);

    const loose = layoutPreviewFrameStyle({ ...layout, categoryGap: 6 }, 'desktop', 300);
    assert.match(loose, new RegExp(`--preview-category-gap:${6 * PREVIEW_GAP_SCALE}rem`));
  });
});

describe('category spacing CSS', () => {
  const globalCss = () => readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  test('the gap lives on the section, not on the category header', async () => {
    const css = await globalCss();

    // A ghost category has no header, so header-driven spacing left it with
    // no separation at all and made the result depend on margin collapsing.
    assert.match(css, /\.category-section\s*\{\s*margin-top: var\(--category-gap, 2rem\);/);
    assert.match(
      css,
      /\.category-section\[data-ghost="true"\]\s*\{\s*margin-top: var\(--ghost-category-gap, 0\.35rem\);/,
    );
    assert.doesNotMatch(css, /\.category-header\s*\{[^}]*margin: 2rem/);
  });

  test('compact mode halves the configured gaps instead of overriding them', async () => {
    const css = await globalCss();
    assert.match(css, /data-compact="true"\] \.category-section \{\s*margin-top: calc\(var\(--category-gap, 2rem\) \* 0\.5\)/);
    assert.match(
      css,
      /data-compact="true"\] \.category-section\[data-ghost="true"\] \{\s*margin-top: calc\(var\(--ghost-category-gap, 0\.35rem\) \* 0\.5\)/,
    );
  });

  test('horizontal group columns use the category gap and drop their margin', async () => {
    const css = await globalCss();
    assert.match(css, /\.groups-horizontal \{[^}]*gap: var\(--category-gap, 1\.25rem\)/);
    assert.match(css, /\.group-col\.category-section,[\s\S]*?\{\s*margin-top: 0;/);
  });

  test('PublicLayout injects both spacing variables', async () => {
    const src = await readFile(new URL('../src/layouts/PublicLayout.astro', import.meta.url), 'utf8');
    assert.match(src, /--category-gap:\$\{l\.categoryGap\}rem/);
    assert.match(src, /--ghost-category-gap:\$\{l\.ghostCategoryGap\}rem/);
  });

  // Que el tab de Layout exponga un control por cada gap se verifica sobre el
  // HTML renderizado en tests/admin-ui.astro.test.ts, que corre con la
  // Container API de Astro y no depende del texto del fuente.
});

describe('PublicLayout favicon', () => {
  test('always emits a rel=icon link, falling back to the bundled favicon.svg', async () => {
    const src = await readFile(new URL('../src/layouts/PublicLayout.astro', import.meta.url), 'utf8');

    // An unconditional link keeps the browser from probing /favicon.ico (404).
    assert.match(src, /<link rel="icon" href=\{faviconUrl\} \/>/);
    assert.doesNotMatch(src, /\{faviconUrl && <link rel="icon"/);
    assert.match(src, /const faviconUrl = brandFaviconUrl \|\| `\$\{base\}favicon\.svg`/);
  });

  test('the fallback favicon asset actually ships in public/', async () => {
    await assert.doesNotReject(
      access(new URL('../public/favicon.svg', import.meta.url)),
    );
  });
});

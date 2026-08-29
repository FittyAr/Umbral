import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LayoutSchema } from '../src/lib/schema.ts';
import {
  buildLayoutCssVars,
  layoutCssVarsToString,
  getPreviewColumns,
  layoutPreviewSampleGroups,
  layoutPreviewFrameStyle,
  layoutPreviewPageStyle,
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
  });

  test('validates new field boundaries', () => {
    assert.throws(() => LayoutSchema.parse({ gap: -0.1 }));
    assert.throws(() => LayoutSchema.parse({ maxWidth: 500 }));
    assert.throws(() => LayoutSchema.parse({ cardRadius: 40 }));
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

  test('layoutPreviewSampleGroups fills a full row per group', () => {
    const groups = layoutPreviewSampleGroups(true, 7);
    assert.equal(groups[0].cards.length, 7);
    assert.equal(groups[1].cards.length, 7);
    assert.ok(groups[0].cards[0].description);
    const noDesc = layoutPreviewSampleGroups(false, 4);
    assert.equal(noDesc[0].cards[0].description, '');
    assert.equal(noDesc[0].cards.length, 4);
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
});

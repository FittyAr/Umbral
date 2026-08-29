import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  clampCardSpan,
  computeCardSpanCss,
  MAX_CARD_SPAN,
  CARD_SPAN_BREAKPOINTS,
} from '../src/lib/card-span.ts';
import { CardSchema, LayoutSchema } from '../src/lib/schema.ts';

function layout(columnsMobile: number, columnsTablet: number, columnsDesktop: number) {
  return LayoutSchema.parse({ columnsMobile, columnsTablet, columnsDesktop });
}

/** Rules inside a media block. `minWidth` 0 means the base (mobile) block. */
function block(css: string, minWidth: number): string {
  if (minWidth === 0) return css.split('@media')[0];
  const marker = `@media (min-width:${minWidth}px){`;
  const start = css.indexOf(marker);
  if (start < 0) return '';
  const from = start + marker.length;
  const next = css.indexOf('@media', from);
  const body = next < 0 ? css.slice(from) : css.slice(from, next);
  return body.replace(/\}$/, ''); // drop the media block's own closing brace
}

/** Effective span the browser applies at a viewport, replaying the cascade. */
function effectiveSpan(css: string, span: number, viewport: number): number {
  const rule = new RegExp(`\\.grid>\\[data-span="${span}"\\]\\{grid-column:span (\\d+)\\}`);
  let value = 1;
  for (const minWidth of [0, CARD_SPAN_BREAKPOINTS.tablet, CARD_SPAN_BREAKPOINTS.desktop]) {
    if (viewport < minWidth) continue;
    const found = block(css, minWidth).match(rule);
    if (found) value = Number(found[1]);
  }
  return value;
}

describe('clampCardSpan', () => {
  test('caps the span at the available columns', () => {
    assert.equal(clampCardSpan(4, 3), 3);
    assert.equal(clampCardSpan(8, 2), 2);
  });

  test('leaves a span that fits untouched', () => {
    assert.equal(clampCardSpan(2, 4), 2);
    assert.equal(clampCardSpan(4, 4), 4);
  });

  test('never returns less than one column', () => {
    assert.equal(clampCardSpan(0, 4), 1);
    assert.equal(clampCardSpan(-3, 4), 1);
    assert.equal(clampCardSpan(2, 0), 1);
    assert.equal(clampCardSpan(2, -5), 1);
  });

  test('sanitizes non-numeric input instead of producing NaN', () => {
    assert.equal(clampCardSpan(undefined, 4), 1);
    assert.equal(clampCardSpan(null, 4), 1);
    assert.equal(clampCardSpan('3', 4), 1);
    assert.equal(clampCardSpan(Number.NaN, 4), 1);
    assert.equal(clampCardSpan(3, Number.NaN), 1);
  });

  test('truncates fractional spans downward', () => {
    assert.equal(clampCardSpan(2.9, 4), 2);
  });
});

describe('CardSchema span', () => {
  const base = { id: 'c1', title: 'Card', url: 'https://example.com', category: 'cat' };

  test('defaults to a single column for legacy cards', () => {
    assert.equal(CardSchema.parse(base).span, 1);
  });

  test('accepts the full documented range', () => {
    assert.equal(CardSchema.parse({ ...base, span: 1 }).span, 1);
    assert.equal(CardSchema.parse({ ...base, span: MAX_CARD_SPAN }).span, MAX_CARD_SPAN);
  });

  test('rejects out-of-range and fractional spans', () => {
    assert.equal(CardSchema.safeParse({ ...base, span: 0 }).success, false);
    assert.equal(CardSchema.safeParse({ ...base, span: MAX_CARD_SPAN + 1 }).success, false);
    assert.equal(CardSchema.safeParse({ ...base, span: 2.5 }).success, false);
  });

  test('MAX_CARD_SPAN matches the maximum desktop column count', () => {
    assert.equal(LayoutSchema.safeParse({ columnsDesktop: MAX_CARD_SPAN }).success, true);
    assert.equal(LayoutSchema.safeParse({ columnsDesktop: MAX_CARD_SPAN + 1 }).success, false);
  });
});

describe('computeCardSpanCss', () => {
  test('skips the base block when mobile has a single column', () => {
    const css = computeCardSpanCss(layout(1, 3, 4));
    assert.equal(block(css, 0), '');
  });

  test('clamps oversized spans to the columns of each breakpoint', () => {
    const css = computeCardSpanCss(layout(1, 3, 4));
    const tablet = block(css, CARD_SPAN_BREAKPOINTS.tablet);
    const desktop = block(css, CARD_SPAN_BREAKPOINTS.desktop);

    assert.match(tablet, /\[data-span="2"\]\{grid-column:span 2\}/);
    assert.match(tablet, /\[data-span="3"\]\{grid-column:span 3\}/);
    // Spans past the column count still need their own rule: without a base
    // rule to inherit from they would fall back to a single column.
    assert.match(tablet, /\[data-span="5"\]\{grid-column:span 3\}/);
    assert.match(desktop, /\[data-span="4"\]\{grid-column:span 4\}/);
    assert.match(desktop, /\[data-span="8"\]\{grid-column:span 4\}/);
  });

  test('lowers the span when a wider breakpoint has fewer columns', () => {
    // Mobile allows up to 3 columns while tablet starts at 2, so the value
    // has to shrink going up — the cascade would otherwise keep span 3.
    const css = computeCardSpanCss(layout(3, 2, 4));
    assert.equal(effectiveSpan(css, 3, 390), 3);
    assert.equal(effectiveSpan(css, 3, 800), 2);
    assert.equal(effectiveSpan(css, 3, 1280), 3);
  });

  test('the maximum span is full width at every breakpoint', () => {
    const css = computeCardSpanCss(layout(3, 6, 8));
    assert.equal(effectiveSpan(css, MAX_CARD_SPAN, 390), 3);
    assert.equal(effectiveSpan(css, MAX_CARD_SPAN, 800), 6);
    assert.equal(effectiveSpan(css, MAX_CARD_SPAN, 1280), 8);
  });

  test('stays full width after the column count changes', () => {
    const css = computeCardSpanCss(layout(2, 3, 5));
    assert.equal(effectiveSpan(css, MAX_CARD_SPAN, 1280), 5);
  });

  test('emits no redundant block when a breakpoint matches the previous one', () => {
    // Narrowest config the schema allows: 1 mobile column, 2 everywhere else.
    const css = computeCardSpanCss(layout(1, 2, 2));
    assert.equal(block(css, 0), '');
    assert.match(css, /@media \(min-width:640px\)/);
    // Desktop resolves identically to tablet, so it contributes nothing.
    assert.doesNotMatch(css, /@media \(min-width:1024px\)/);
  });

  test('emits nothing when no card asks for extra columns', () => {
    assert.equal(computeCardSpanCss(layout(2, 3, 4), []), '');
    assert.equal(computeCardSpanCss(layout(2, 3, 4), [{ span: 1 }, {}]), '');
  });

  test('emits rules only for the widths actually in use', () => {
    const css = computeCardSpanCss(layout(2, 3, 4), [{ span: 3 }, { span: 3 }, { span: 1 }]);
    assert.match(css, /\[data-span="3"\]/);
    assert.doesNotMatch(css, /\[data-span="2"\]/);
    assert.doesNotMatch(css, /\[data-span="4"\]/);
  });

  test('uses the same breakpoints as the .grid rules in global.css', async () => {
    const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
    assert.match(css, new RegExp(`@media \\(min-width: ${CARD_SPAN_BREAKPOINTS.tablet}px\\)\\s*\\{ \\.grid`));
    assert.match(css, new RegExp(`@media \\(min-width: ${CARD_SPAN_BREAKPOINTS.desktop}px\\)\\s*\\{ \\.grid`));
  });
});

describe('card span wiring', () => {
  test('Card.astro emits data-span on both note and link roots', async () => {
    const src = await readFile(new URL('../src/components/Card.astro', import.meta.url), 'utf8');
    assert.match(src, /const spanAttr = card\.span && card\.span > 1/);
    assert.equal(src.match(/data-span=\{spanAttr\}/g)?.length, 2);
  });

  test('PublicLayout injects the generated span stylesheet', async () => {
    const src = await readFile(new URL('../src/layouts/PublicLayout.astro', import.meta.url), 'utf8');
    assert.match(src, /computeCardSpanCss/);
    assert.match(src, /\{cardSpanCss && <style is:inline set:html=\{cardSpanCss\}>/);
  });

  test('admin editor exposes the width field and defaults new cards to one column', async () => {
    const src = await readFile(new URL('../src/pages/admin/dashboard.astro', import.meta.url), 'utf8');
    assert.match(src, /x-model\.number="editingCard\.span"/);
    assert.match(src, /showHelp\('card\.span'\)/);
    assert.match(src, /cardSpanEffectiveHint\(\)/);
    // addCard() and applyAppPreset() both build a card literal.
    assert.equal(src.match(/^\s*span: 1,$/gm)?.length, 2);
  });
});

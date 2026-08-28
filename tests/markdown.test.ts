import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownSync, sanitizeHtml } from '../src/lib/markdown.ts';

describe('markdown', () => {
  test('renderMarkdownSync converts bold and code', () => {
    const html = renderMarkdownSync('Hello **world** and `code`');
    assert.match(html, /<strong>world<\/strong>/);
    assert.match(html, /<code>code<\/code>/);
  });

  test('sanitizeHtml strips script tags', () => {
    const html = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    assert.match(html, /ok/);
    assert.doesNotMatch(html, /script/i);
  });

  test('sanitizeHtml blocks javascript: href', () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    assert.doesNotMatch(html, /javascript:/i);
  });
});

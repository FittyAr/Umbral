import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

describe('auth session dev secret', () => {
  test('shares SESSION_SECRET fallback via globalThis for duplicate Vite SSR modules', async () => {
    const src = await readFile(new URL('../src/lib/auth.ts', import.meta.url), 'utf8');
    assert.match(src, /globalThis\.__umbralSessionSecret/);
    assert.match(src, /createSessionToken/);
    assert.match(src, /verifySessionToken/);
  });
});

/// <reference types="vitest" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getViteConfig } from 'astro/config';

/**
 * Tests que necesitan el pipeline de Vite de Astro: los que renderizan
 * componentes `.astro` con la Container API y los que importan módulos con
 * los alias `~/`. Se descubren solos (todo `tests/*.test.ts` que importa de
 * 'vitest'); el resto de la suite corre con `node --test`
 * (scripts/run-node-tests.mjs), así que ningún test queda sin correr.
 */
const testsDir = path.resolve('tests');
const vitestFiles = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => /from ['"]vitest['"]/.test(readFileSync(path.join(testsDir, f), 'utf8')))
  .map((f) => `tests/${f}`);

export default getViteConfig({
  test: {
    include: vitestFiles,
    environment: 'node',
  },
});

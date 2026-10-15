/// <reference types="vitest" />
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
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

// Sin DATA_DIR la app usaría la carpeta de datos del usuario (FittyAr/Umbral
// en APPDATA / XDG / Application Support) o el ./data del repo: los tests
// corren siempre contra un directorio temporal propio.
const testDataDir = process.env.DATA_DIR || mkdtempSync(path.join(os.tmpdir(), 'umbral-vitest-'));

export default getViteConfig({
  test: {
    include: vitestFiles,
    environment: 'node',
    env: { DATA_DIR: testDataDir },
  },
});

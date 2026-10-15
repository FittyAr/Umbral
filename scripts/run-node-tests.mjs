#!/usr/bin/env node
/**
 * Corre con `node --test` todos los tests de `tests/` que no son de vitest.
 *
 * Antes cada archivo tenía que agregarse a mano a la cadena de `npm test`, y
 * un test nuevo que nadie sumaba simplemente no corría. Acá se descubren
 * solos: todo `tests/*.test.ts` que no importe de 'vitest'.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const dir = path.resolve('tests');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => !/from ['"]vitest['"]/.test(readFileSync(path.join(dir, f), 'utf8')))
  .sort()
  .map((f) => path.join('tests', f));

if (files.length === 0) {
  console.error('No se encontraron tests de node --test en tests/.');
  process.exit(1);
}

// Sin DATA_DIR la app usaría la carpeta de datos del usuario o el ./data del
// repo: los tests corren contra un directorio temporal propio.
const ownDataDir = !process.env.DATA_DIR;
const testDataDir = process.env.DATA_DIR || mkdtempSync(path.join(os.tmpdir(), 'umbral-node-tests-'));

const res = spawnSync(
  process.execPath,
  ['--test', '--experimental-strip-types', ...process.argv.slice(2), ...files],
  { stdio: 'inherit', env: { ...process.env, DATA_DIR: testDataDir } },
);
if (ownDataDir) rmSync(testDataDir, { recursive: true, force: true });
process.exit(res.status ?? 1);

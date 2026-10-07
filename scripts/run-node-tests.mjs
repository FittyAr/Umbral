#!/usr/bin/env node
/**
 * Corre con `node --test` todos los tests de `tests/` que no son de vitest.
 *
 * Antes cada archivo tenía que agregarse a mano a la cadena de `npm test`, y
 * un test nuevo que nadie sumaba simplemente no corría. Acá se descubren
 * solos: todo `tests/*.test.ts` que no importe de 'vitest'.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

const res = spawnSync(
  process.execPath,
  ['--test', '--experimental-strip-types', ...process.argv.slice(2), ...files],
  { stdio: 'inherit' },
);
process.exit(res.status ?? 1);

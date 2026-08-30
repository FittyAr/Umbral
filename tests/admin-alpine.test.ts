import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ADMIN_LABELS } from '../src/lib/admin-labels.ts';
import { es } from '../src/i18n/es.ts';

const DASHBOARD = 'src/pages/admin/dashboard.astro';
const SCRIPTS_DIR = 'src/scripts/admin';
const COMPONENTS_DIR = 'src/components/admin';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const dashboardSrc = readFileSync(DASHBOARD, 'utf8');
const scriptSrcs = walk(SCRIPTS_DIR).map((p) => readFileSync(p, 'utf8'));
const componentSrcs = walk(COMPONENTS_DIR)
  .filter((p) => p.endsWith('.astro'))
  .map((p) => ({ path: p, src: readFileSync(p, 'utf8') }));

/** Miembros que el objeto Alpine define, ya sea inline o en un fragmento. */
const definedMembers = new Set<string>(Object.keys(ADMIN_LABELS));
for (const src of [dashboardSrc, ...scriptSrcs]) {
  for (const m of src.matchAll(/^ {4,8}(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:\(|:)/gm)) {
    definedMembers.add(m[1]);
  }
}

test('cada label del admin tiene su clave en el catálogo es', () => {
  const missing = Object.entries(ADMIN_LABELS)
    .filter(([, [key]]) => !(key in es))
    .map(([name, [key]]) => `${name} -> ${key}`);
  assert.deepEqual(missing, [], `claves inexistentes: ${missing.join(', ')}`);
});

test('los labels no tienen fallback vacío', () => {
  for (const [name, [, fallback]] of Object.entries(ADMIN_LABELS)) {
    assert.ok(fallback.length > 0, `${name} sin fallback`);
  }
});

/**
 * Los paneles llaman métodos del objeto Alpine por nombre (`x-text="
 * themeTitle()"`). Después de partir el objeto en fragmentos, un método que
 * quedó afuera no falla en el build: falla en el navegador con "no está
 * definido". Este test recorre el markup y verifica que cada método llamado
 * exista en algún lado.
 */
test('los métodos que llama el markup del admin existen', () => {
  const missing: string[] = [];
  for (const { path, src } of componentSrcs) {
    for (const m of src.matchAll(/(?:x-text|x-html|:title|:aria-label)="([A-Za-z_$][\w$]*)\(\)"/g)) {
      if (!definedMembers.has(m[1])) missing.push(`${path}: ${m[1]}()`);
    }
  }
  assert.deepEqual(missing, [], `métodos sin definir:\n  ${missing.join('\n  ')}`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDocMeta, groupDocsBySection, resolveDocFile, SECTION_LABELS, listDocs } from '../src/lib/docs-catalog.ts';
import { buildHealthLabels } from '../src/lib/health-labels.ts';

test('parseDocMeta saca el H1 como título y el blockquote como bajada', () => {
  const md = '# Umbral — Quickstart\n\n> **Dos minutos.** Copiá y pegá.\n\nTexto que no debería ganar.\n';
  const meta = parseDocMeta(md);
  assert.equal(meta.title, 'Quickstart');
  assert.match(meta.description, /Dos minutos/);
});

test('parseDocMeta cae al primer párrafo cuando no hay blockquote', () => {
  const meta = parseDocMeta('# Setup\n\nCómo correr el proyecto en local.\n');
  assert.equal(meta.title, 'Setup');
  assert.equal(meta.description, 'Cómo correr el proyecto en local.');
});

test('parseDocMeta no explota con un markdown sin título', () => {
  assert.equal(parseDocMeta('sin heading\n').title, '(sin título)');
});

test('los docs sin sección caen en general y las secciones tienen etiqueta', () => {
  const grouped = groupDocsBySection([
    { slug: 'suelto', title: 'A', description: '', section: '' },
    { slug: 'install/docker', title: 'B', description: '', section: 'install' },
  ]);
  assert.deepEqual([...grouped.keys()].sort(), ['general', 'install']);
  // Las dos páginas de docs comparten la tabla: la copia de [...slug] no
  // tenía `general` y ahí el grupo salía sin traducir.
  for (const key of grouped.keys()) assert.ok(SECTION_LABELS[key], key);
});

test('resolveDocFile rechaza cualquier intento de salir de docs/', () => {
  for (const evil of ['../secrets', '..\\secrets', 'a\0b', '../../etc/passwd']) {
    assert.equal(resolveDocFile(evil), null, evil);
  }
  assert.ok(resolveDocFile('install/quickstart')?.abs.endsWith('quickstart.md'));
});

test('listDocs cachea: dos llamadas seguidas devuelven el mismo array', async () => {
  const first = await listDocs();
  const second = await listDocs();
  assert.equal(first, second, 'la segunda llamada debería reusar el cache por mtime');
  assert.ok(first.length > 0);
});

test('las etiquetas de salud llevan los placeholders que el cliente reemplaza', () => {
  const plain = buildHealthLabels(false, (k) => k);
  assert.match(plain.ok, /\{latency\}/);
  assert.match(plain.bad, /\{status\}/);
  const translated = buildHealthLabels(true, (key, vars) => `${key}:${JSON.stringify(vars ?? {})}`);
  assert.match(translated.ok, /\{latency\}/);
});

test('el sha256 del candado de categorías vive en un módulo, no inline en las páginas', async () => {
  const lock = await readFile(new URL('../src/scripts/public/category-lock.ts', import.meta.url), 'utf8');
  assert.match(lock, /0x6a09e667/, 'las constantes de SHA-256 deberían estar en el módulo');
  for (const page of ['../src/pages/index.astro', '../src/pages/[category].astro']) {
    const src = await readFile(new URL(page, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /0x6a09e667/, `${page} no debería volver a tener el sha256 inline`);
    assert.match(src, /initCategoryLocks\(\)/, `${page} debería usar el módulo compartido`);
  }
});

test('las URLs de API del cliente respetan el base del deploy', async () => {
  const mod = await import('../src/scripts/public/base-url.ts');
  const g = globalThis as { window?: { __BASE_URL__?: string } };
  const prev = g.window;
  try {
    g.window = { __BASE_URL__: '/umbral/' };
    assert.equal(mod.apiUrl('api/config'), '/umbral/api/config');
    g.window = { __BASE_URL__: '/umbral' };
    assert.equal(mod.apiUrl('/api/config'), '/umbral/api/config');
    g.window = {};
    assert.equal(mod.apiUrl('api/status'), '/api/status');
  } finally {
    g.window = prev;
  }
});

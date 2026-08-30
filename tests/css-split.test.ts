import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir: string, exts: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, exts);
    return exts.some((ext) => full.endsWith(ext)) ? [full] : [];
  });
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('PublicLayout importa public.css y AdminLayout no', () => {
  assert.match(read('src/layouts/PublicLayout.astro'), /styles\/public\.css/);
  assert.doesNotMatch(read('src/layouts/AdminLayout.astro'), /styles\/public\.css/);
});

test('ningun selector de public.css lo usa el markup del admin', () => {
  const adminFiles = [
    ...walk(path.join(ROOT, 'src/components/admin'), ['.astro']),
    ...walk(path.join(ROOT, 'src/pages/admin'), ['.astro']),
    ...walk(path.join(ROOT, 'src/scripts/admin'), ['.ts']),
    path.join(ROOT, 'src/layouts/AdminLayout.astro'),
  ];
  const adminSrc = adminFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  // Clases que el admin comparte con la portada (viven en global.css) y que
  // pueden aparecer como parte de un selector compuesto en public.css.
  const SHARED = new Set(['card', 'card-icon', 'card-desc', 'page-wrap', 'grid', 'header', 'empty']);

  // Sólo las líneas de selector: los comentarios mencionan archivos (".css")
  // y eso no es una clase.
  const publicCss = read('src/styles/public.css')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => line.includes('.') && !line.trim().startsWith('/'))
    .join('\n');
  const classes = new Set(
    [...publicCss.matchAll(/(?<![\w)])\.([a-z][\w-]*)/g)].map((m) => m[1]).filter((c) => !SHARED.has(c)),
  );

  // Las clases que el admin realmente aplica: lo que aparece dentro de un
  // atributo `class`, `class:list` o `:class`. Buscar la palabra suelta daba
  // falsos positivos como `pwForm.current` o `stroke="currentColor"`.
  const applied = new Set<string>();
  for (const match of adminSrc.matchAll(/(?::|:list=|\s)class(?::list)?=(["'{])([\s\S]*?)\1/g)) {
    for (const word of match[2].matchAll(/[a-z][\w-]*/g)) applied.add(word[0]);
  }

  const leaked = [...classes].filter((cls) => applied.has(cls));
  assert.deepEqual(leaked, [], `el admin usa clases que quedaron en public.css: ${leaked.join(', ')}`);
});

test('global.css y public.css tienen las llaves balanceadas', () => {
  for (const file of ['src/styles/global.css', 'src/styles/public.css']) {
    const css = read(file);
    assert.equal(
      (css.match(/\{/g) ?? []).length,
      (css.match(/\}/g) ?? []).length,
      `${file}: llaves desbalanceadas, el corte se comió una regla`,
    );
  }
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createInstalledIconLookup,
  normalizeIconName,
  resolveIconUrl,
} from '../src/lib/icon-url.ts';

const dashboardSrc = readFileSync(
  fileURLToPath(new URL('../src/pages/admin/dashboard.astro', import.meta.url)),
  'utf8',
);

describe('normalizeIconName', () => {
  test('quita la extensión .svg y deja el pack', () => {
    assert.equal(normalizeIconName('lucide/sparkles.svg'), 'lucide/sparkles');
    assert.equal(normalizeIconName('lucide/sparkles'), 'lucide/sparkles');
  });

  test('vacío para nulos', () => {
    assert.equal(normalizeIconName(null), '');
    assert.equal(normalizeIconName(undefined), '');
    assert.equal(normalizeIconName(''), '');
  });
});

describe('createInstalledIconLookup', () => {
  const installed = ['simple-icons/github', 'tabler-icons/home'];

  test('reconoce íconos instalados con y sin extensión', () => {
    const has = createInstalledIconLookup(installed);
    assert.equal(has('simple-icons/github'), true);
    assert.equal(has('simple-icons/github.svg'), true);
    assert.equal(has('tabler-icons/home'), true);
  });

  test('rechaza íconos de packs no instalados', () => {
    const has = createInstalledIconLookup(installed);
    // El caso que dispara los 404: las plantillas apuntan a Lucide y el
    // proyecto arranca sin ningún pack.
    assert.equal(has('lucide/sparkles'), false);
    assert.equal(has('lucide/bot'), false);
    assert.equal(has('simple-icons/slack'), false);
  });

  test('rechaza vacíos y nombres bare sin pack', () => {
    const has = createInstalledIconLookup(installed);
    assert.equal(has(''), false);
    assert.equal(has(null), false);
    assert.equal(has(undefined), false);
    assert.equal(has('github'), false);
  });

  test('sin packs instalados nada resuelve', () => {
    assert.equal(createInstalledIconLookup([])('simple-icons/github'), false);
    assert.equal(createInstalledIconLookup(null)('simple-icons/github'), false);
  });

  test('es independiente por instancia', () => {
    const before = createInstalledIconLookup([]);
    const after = createInstalledIconLookup(['lucide/sparkles']);
    assert.equal(before('lucide/sparkles'), false);
    assert.equal(after('lucide/sparkles'), true);
  });

  test('no altera cómo resolveIconUrl arma la ruta del pack', () => {
    assert.equal(resolveIconUrl('lucide/sparkles'), '/api/icons/lucide/sparkles.svg');
  });
});

describe('dashboard: íconos ausentes no piden SVGs', () => {
  test('resolveIcon filtra íconos de packs no instalados', () => {
    assert.match(dashboardSrc, /if \(!this\.isIconInstalled\(clean\)\) return '';/);
    assert.match(dashboardSrc, /import \{ createInstalledIconLookup \} from '~\/lib\/icon-url';/);
  });

  test('las tarjetas de plantilla usan x-if y no x-show para la imagen', () => {
    // x-show deja el <img> en el DOM, así que el navegador igual pide el src.
    assert.doesNotMatch(dashboardSrc, /x-show="resolveIcon\(/);
    assert.match(dashboardSrc, /<template x-if="resolveIcon\(p\.icon\)">/);
  });

  test('aplicar una plantilla no guarda un ícono irresoluble', () => {
    assert.match(dashboardSrc, /icon: this\.resolveIcon\(p\.icon\) \? p\.icon : '',/);
  });
});

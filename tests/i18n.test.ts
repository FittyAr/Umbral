import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { es } from '../src/i18n/es.ts';
import { en } from '../src/i18n/en.ts';
import { pt } from '../src/i18n/pt.ts';
import { fr } from '../src/i18n/fr.ts';
import { de } from '../src/i18n/de.ts';
import { it } from '../src/i18n/it.ts';
import { zh } from '../src/i18n/zh.ts';
import { ja } from '../src/i18n/ja.ts';
import { ru } from '../src/i18n/ru.ts';
import { helpEs } from '../src/i18n/help/es.ts';
import { helpEn } from '../src/i18n/help/en.ts';
import { helpPt } from '../src/i18n/help/pt.ts';
import { helpFr } from '../src/i18n/help/fr.ts';
import { helpDe } from '../src/i18n/help/de.ts';
import { helpIt } from '../src/i18n/help/it.ts';
import { helpZh } from '../src/i18n/help/zh.ts';
import { helpJa } from '../src/i18n/help/ja.ts';
import { helpRu } from '../src/i18n/help/ru.ts';
import { HELP_CATALOG_KEYS } from '../src/i18n/help/index.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function keysOf(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort();
}

function diff(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((k) => !setB.has(k));
}

describe('i18n locale parity', () => {
  test('all 8 target locales have same keys as es', () => {
    const esKeys = keysOf(es);
    const dictionaries: Record<string, Record<string, unknown>> = {
      en, pt, fr, de, it, zh, ja, ru
    };
    for (const [loc, dict] of Object.entries(dictionaries)) {
      const missing = diff(esKeys, keysOf(dict));
      assert.deepEqual(missing, [], `${loc} missing keys: ${missing.join(', ')}`);
    }
  });
});

describe('help catalog parity', () => {
  test('all help catalogs have all keys from helpEs', () => {
    const esKeys = keysOf(helpEs);
    assert.equal(HELP_CATALOG_KEYS.length, esKeys.length);
    const catalogs: Record<string, Record<string, unknown>> = {
      helpEn, helpPt, helpFr, helpDe, helpIt, helpZh, helpJa, helpRu
    };
    for (const [name, cat] of Object.entries(catalogs)) {
      const missing = diff(esKeys, keysOf(cat));
      assert.deepEqual(missing, [], `${name} missing help keys: ${missing.join(', ')}`);
    }
  });
});

describe('showHelp coverage', () => {
  test('every showHelp key exists in help catalog', () => {
    const srcDir = path.join(ROOT, 'src');
    const files: string[] = [];
    function walk(dir: string) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(astro|ts|tsx)$/.test(ent.name)) files.push(p);
      }
    }
    walk(srcDir);
    const used = new Set<string>();
    // Las claves aparecen de tres formas: la llamada directa, el prop
    // `helpKey="..."` de los componentes de src/components/admin/ui, y el
    // campo `helpKey: '...'` de los arrays de campos que arman los paneles.
    const patterns = [
      /showHelp\(\s*['"]([^'"]+)['"]\s*\)/g,
      /helpKey=["']([^"']+)["']/g,
      /helpKey:\s*['"]([^'"]+)['"]/g,
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const re of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) {
          // `showHelp('${helpKey}')` en HelpIcon.astro es la plantilla, no una clave.
          if (!m[1].includes('${')) used.add(m[1]);
        }
      }
    }
    const catalog = new Set(keysOf(helpEs));
    const missing = [...used].filter((k) => !catalog.has(k)).sort();
    assert.deepEqual(missing, [], `showHelp keys missing from catalog: ${missing.join(', ')}`);
  });
});

describe('icon references', () => {
  test('presets and config use pack-qualified icons only', () => {
    const files = ['src/lib/presets.ts', 'src/lib/config/defaults.ts'];
    const bare: string[] = [];
    const re = /icon:\s*'([^']+)'/g;
    for (const rel of files) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const v = m[1];
        if (!v.includes('/') && !v.startsWith('http') && !v.startsWith('/')) {
          bare.push(`${rel}: ${v}`);
        }
      }
    }
    assert.deepEqual(bare, []);
  });

  test('resolveIconUrl returns null for bare names', async () => {
    const { resolveIconUrl, resolveCardIconUrl, SYSTEM_DOCS_ICON, SYSTEM_DOCS_ICON_PATH } = await import('../src/lib/icon-url.ts');
    assert.equal(resolveIconUrl('file-text'), null);
    assert.equal(resolveIconUrl('lucide/file-text'), '/api/icons/lucide/file-text.svg');
    assert.equal(resolveIconUrl(SYSTEM_DOCS_ICON), SYSTEM_DOCS_ICON_PATH);
    assert.equal(resolveCardIconUrl({ id: 'docs', icon: 'lucide/file-text', url: '/docs' }), SYSTEM_DOCS_ICON_PATH);
    assert.equal(resolveCardIconUrl({ id: 'other', icon: 'simple-icons/github' }), '/api/icons/simple-icons/github.svg');
  });
});

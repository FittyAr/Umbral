import fs from 'node:fs';
import { es } from '../src/i18n/es.ts';
import { en } from '../src/i18n/en.ts';
import { pt } from '../src/i18n/pt.ts';

function merge(base, target) {
  const out = { ...target };
  for (const [k, v] of Object.entries(base)) {
    if (!(k in out)) out[k] = v;
  }
  return out;
}

function writeLocale(name, obj) {
  const lines = [
    "import type { Translations } from './index.ts';",
    '',
    `export const ${name} = {`,
  ];
  for (const [k, v] of Object.entries(obj)) {
    lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  lines.push('} satisfies Translations;');
  fs.writeFileSync(`src/i18n/${name}.ts`, lines.join('\n'));
}

writeLocale('en', merge(es, en));
writeLocale('pt', merge(es, pt));
console.log('[merge-i18n] done');

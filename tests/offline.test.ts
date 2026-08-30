import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { HeadersSecuritySchema, ThemeSchema } from '../src/lib/schema/index.ts';

/**
 * Umbral tiene que funcionar detrás de una VPN sin salida a internet, así que
 * "offline" no es una preferencia: es un requisito. Este archivo lo fija.
 *
 * Lo que se garantiza acá es que un Umbral recién instalado no pide nada a la
 * red. Las fuentes de Google siguen existiendo, pero como opt-in explícito.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('defaults offline', () => {
  test('el tema no carga fuentes externas por defecto', () => {
    const theme = ThemeSchema.parse({ background: {} });

    assert.equal(theme.useGoogleFonts, false);
    assert.ok(!theme.fontUrl, 'fontUrl deberia venir vacio');
  });

  test('el CSP por defecto no habilita ningun host externo', () => {
    const csp = HeadersSecuritySchema.parse({}).csp ?? '';

    assert.ok(csp.length > 0, 'esperaba un CSP por defecto');
    // Sin useGoogleFonts, el default no debe abrir la puerta a fonts.google*.
    assert.equal(csp.includes('fonts.googleapis.com'), false);
    assert.equal(csp.includes('fonts.gstatic.com'), false);
    // `img-src ... https:` es intencional: favicons de las apps del portal.
    const withoutImgSrc = csp.replace(/img-src[^;]*/g, '');
    assert.doesNotMatch(withoutImgSrc, /https?:\/\/(?!fonts)/);
  });
});

describe('dependencias del cliente', () => {
  test('las libs de navegador se bundlean en vez de resolverse en runtime', async () => {
    const config = await readFile(path.join(ROOT, 'astro.config.mjs'), 'utf8');
    const noExternal = config.match(/noExternal:\s*\[([^\]]*)\]/)?.[1] ?? '';

    for (const dep of ['sortablejs', 'alpinejs', '@astroanimate/core']) {
      assert.ok(noExternal.includes(dep), `${dep} deberia estar en ssr.noExternal`);
    }
  });

  test('ninguna dependencia de produccion se sirve desde un CDN', async () => {
    const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.values(pkg.dependencies as Record<string, string>);

    for (const range of deps) {
      assert.doesNotMatch(range, /^(https?:|git|github:)/, `dependencia remota: ${range}`);
    }
  });

  test('@astroanimate/core no arrastra dependencias de runtime', async () => {
    const pkg = JSON.parse(
      await readFile(path.join(ROOT, 'node_modules/@astroanimate/core/package.json'), 'utf8'),
    );

    assert.equal(pkg.dependencies, undefined);
  });
});

describe('marcado servido', () => {
  /** Todos los .astro del proyecto, que es donde podria colarse un <script src>. */
  async function astroFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...(await astroFiles(full)));
      else if (entry.name.endsWith('.astro')) found.push(full);
    }
    return found;
  }

  test('ningun componente carga un script o un stylesheet remoto', async () => {
    const files = await astroFiles(path.join(ROOT, 'src'));
    assert.ok(files.length > 40, 'esperaba encontrar los componentes del proyecto');

    const offenders: string[] = [];
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const remoteScript = /<script[^>]+src=["']https?:\/\//i.test(content);
      // El link de fuentes es el unico remoto permitido, y sale de la config
      // opt-in del usuario, no de una URL escrita en el marcado.
      const remoteStyle = /<link[^>]+href=["']https?:\/\//i.test(content);
      if (remoteScript || remoteStyle) offenders.push(path.relative(ROOT, file));
    }

    assert.deepEqual(offenders, []);
  });
});

describe('build offline', () => {
  const distEntry = path.join(ROOT, 'dist/server/entry.mjs');

  test('el bundle del cliente no queda con URLs externas', async (t) => {
    try {
      await stat(distEntry);
    } catch {
      t.skip('sin dist/: correr npm run build antes de este test');
      return;
    }

    const clientDir = path.join(ROOT, 'dist/client');
    const assets: string[] = [];
    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (/\.(js|css)$/.test(entry.name)) assets.push(full);
      }
    }
    await walk(clientDir);

    assert.ok(assets.length > 0, 'esperaba assets en dist/client');

    // Una URL suelta puede ser el destino de un link (el repo del proyecto, por
    // ejemplo) y eso no pide nada a la red. Lo que importa son las formas que
    // sí disparan una request al cargar la pagina.
    const loaders = [
      /src\s*=\s*["'`]https?:\/\//i,
      /<link[^>]+href\s*=\s*["'`]https?:\/\//i,
      /@import\s+(url\()?["']https?:\/\//i,
      /\bfetch\s*\(\s*["'`]https?:\/\//i,
      /\bimport\s*\(\s*["'`]https?:\/\//i,
      /url\(\s*["']?https?:\/\//i,
    ];

    for (const asset of assets) {
      const content = await readFile(asset, 'utf8');
      // El catalogo opt-in de fuentes de theme-admin-client es la excepcion:
      // son URLs de datos que el admin escribe en la config, no cargas.
      const scrubbed = content.replaceAll('https://fonts.googleapis.com', '');

      for (const loader of loaders) {
        assert.doesNotMatch(
          scrubbed,
          loader,
          `${path.relative(ROOT, asset)} carga un recurso externo (${loader})`,
        );
      }
    }
  });
});

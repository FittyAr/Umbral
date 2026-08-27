import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, access, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { isFeatureEnabled } from '../src/lib/features.ts';

const TEST_REPO = 'https://github.com/example/test-icons';
const TEST_BRANCH = 'main';

function buildFixtureZip(): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    'test-icons-main/icons/alpha.svg',
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>', 'utf8'),
  );
  zip.addFile(
    'test-icons-main/icons/beta.svg',
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>', 'utf8'),
  );
  return zip.toBuffer();
}

describe('icon packs', () => {
  let tempDataDir: string;
  let originalFetch: typeof fetch;
  let iconPacks: typeof import('../src/lib/icon-packs.ts');

  before(async () => {
    tempDataDir = await mkdtemp(join(tmpdir(), 'umbral-icon-packs-'));
    process.env.DATA_DIR = tempDataDir;
    originalFetch = globalThis.fetch;
    iconPacks = await import('../src/lib/icon-packs.ts');
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    delete process.env.DATA_DIR;
    await rm(tempDataDir, { recursive: true, force: true });
  });

  test('resolveZipArchiveUrl uses GitHub codeload', () => {
    const url = iconPacks.resolveZipArchiveUrl(TEST_REPO, TEST_BRANCH);
    assert.equal(url, 'https://codeload.github.com/example/test-icons/zip/refs/heads/main');
  });

  test('isFeatureEnabled gates iconPacks (API returns 403 when off)', () => {
    assert.equal(isFeatureEnabled({ features: { iconPacks: { enabled: false } } }, 'iconPacks'), false);
    assert.equal(isFeatureEnabled({ features: { iconPacks: { enabled: true } } }, 'iconPacks'), true);
    assert.equal(isFeatureEnabled({ features: {} }, 'iconPacks'), false);
  });

  test('extractSvgsFromZip throws on HTTP 404 with status detail', async () => {
    globalThis.fetch = mock.fn(async () =>
      new Response('not found', { status: 404, statusText: 'Not Found' }),
    ) as unknown as typeof fetch;

    await assert.rejects(
      () => iconPacks.extractSvgsFromZip(TEST_REPO, TEST_BRANCH, 'icons'),
      /404 Not Found/,
    );
  });

  test('installIconPack writes SVGs and registry from ZIP fixture', async () => {
    const zipBody = buildFixtureZip();
    globalThis.fetch = mock.fn(async () =>
      new Response(zipBody, { status: 200, statusText: 'OK' }),
    ) as unknown as typeof fetch;

    const result = await iconPacks.installIconPack({
      repoUrl: TEST_REPO,
      branch: TEST_BRANCH,
      subpath: 'icons',
      prefix: 'fixture',
    });

    assert.equal(result.success, true);
    assert.ok(result.iconsInstalled >= 2);

    const packDir = join(tempDataDir, 'icon-packs', result.packId);
    await access(join(packDir, 'fixture-alpha.svg'));
    await access(join(packDir, 'fixture-beta.svg'));

    const registryRaw = await readFile(join(tempDataDir, 'icon-packs', '.installed-packs.json'), 'utf8');
    const registry = JSON.parse(registryRaw) as Record<string, { iconsCount: number }>;
    assert.ok(registry[result.packId]);
    assert.equal(registry[result.packId].iconsCount, result.iconsInstalled);
  });

  test('reinstall removes stale files from previous install', async () => {
    const packId = 'lucide';
    const packDir = join(tempDataDir, 'icon-packs', packId);
    await mkdir(packDir, { recursive: true });
    await writeFile(join(packDir, 'stale-icon.svg'), '<svg></svg>', 'utf8');

    const zipBody = buildFixtureZip();
    globalThis.fetch = mock.fn(async () =>
      new Response(zipBody, { status: 200, statusText: 'OK' }),
    ) as unknown as typeof fetch;

    await iconPacks.installIconPack({ packId: 'lucide' });

    const files = await import('node:fs/promises').then((fs) => fs.readdir(packDir));
    assert.equal(files.includes('stale-icon.svg'), false);
    assert.ok(files.some((f) => f.endsWith('.svg')));
  });

  test('uninstall removes pack directory and registry entry', async () => {
    const zipBody = buildFixtureZip();
    globalThis.fetch = mock.fn(async () =>
      new Response(zipBody, { status: 200, statusText: 'OK' }),
    ) as unknown as typeof fetch;

    const installed = await iconPacks.installIconPack({
      repoUrl: TEST_REPO,
      branch: TEST_BRANCH,
      subpath: 'icons',
    });

    const uninstalled = await iconPacks.uninstallIconPack(installed.packId);
    assert.equal(uninstalled.success, true);

    const packDir = join(tempDataDir, 'icon-packs', installed.packId);
    await assert.rejects(() => access(packDir));

    const registryRaw = await readFile(join(tempDataDir, 'icon-packs', '.installed-packs.json'), 'utf8');
    const registry = JSON.parse(registryRaw) as Record<string, unknown>;
    assert.equal(registry[installed.packId], undefined);
  });
});

describe('admin dashboard boolean attribute bindings', () => {
  // Cuando una expresion de x-bind contiene un punto y evalua a `undefined`,
  // Alpine la convierte en '' y ese valor activa los atributos booleanos. Un
  // `:disabled` con acceso indexado (ej: busy[item.id]) deja el boton
  // deshabilitado para siempre, asi que los estados por item tienen que pasar
  // por un helper que devuelva un booleano real.
  test('no :disabled binding relies on a raw indexed lookup', async () => {
    const markup = await readFile(new URL('../src/pages/admin/dashboard.astro', import.meta.url), 'utf8');
    const expressions = [...markup.matchAll(/:disabled="([^"]*)"/g)].map((m) => m[1]);

    assert.ok(expressions.length > 0, 'expected :disabled bindings in the dashboard');

    const offenders = expressions.filter((expr) => /[\w)\]]\s*\[/.test(expr));
    assert.deepEqual(offenders, []);
  });
});

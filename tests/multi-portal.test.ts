import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// DATA_DIR se resuelve al importar los módulos de config: se setea antes de
// los imports dinámicos.
describe('multi-portal', () => {
  let dataDir: string;
  let prevDataDir: string | undefined;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'umbral-mp-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = dataDir;
    const { saveConfig } = await import('~/lib/config');
    await saveConfig({
      branding: { companyName: 'Raíz' },
      features: { multiPortal: { enabled: true } },
      portals: {
        defaultPortal: 'default',
        items: [
          { id: 'it', name: 'IT', host: 'it.example.test', pathPrefix: '/' },
          { id: 'mk', name: 'Marketing', host: '', pathPrefix: '/mk' },
        ],
      },
    } as never);
  });

  afterAll(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('resuelve el portal por host, prefijo y selección explícita', async () => {
    const { getConfig } = await import('~/lib/config');
    const { resolveRequestPortal } = await import('~/lib/multi-portal');
    const cfg = await getConfig();
    const r = (u: string, headers: Record<string, string> = {}) =>
      resolveRequestPortal(new Request(u, { headers }), new URL(u), cfg);

    expect(r('http://it.example.test/').id).toBe('it');
    expect(r('http://otro.test/').id).toBe('default');
    // Se usa el header Host (Astro no siempre lo refleja en la URL), con o
    // sin puerto.
    expect(r('http://127.0.0.1/', { host: 'it.example.test:8443' }).id).toBe('it');
    const mk = r('http://otro.test/mk/dev');
    expect(mk).toMatchObject({ id: 'mk', basePath: '/mk', rewriteTo: '/dev' });
    // La API y el panel no se reescriben ni matchean por prefijo.
    expect(r('http://otro.test/api/config').id).toBe('default');
    expect(r('http://otro.test/api/status', { 'x-umbral-portal': 'mk' }).id).toBe('mk');
    expect(r('http://otro.test/admin/dashboard?portal=it').id).toBe('it');
    // Un id que no está configurado se ignora.
    expect(r('http://otro.test/api/config', { 'x-umbral-portal': '../../etc' }).id).toBe('default');
  });

  it('cada portal guarda su portada; lo global va al raíz', async () => {
    const { saveConfig, getConfig, runWithPortal } = await import('~/lib/config');
    await runWithPortal('it', () =>
      saveConfig({ branding: { companyName: 'Portal IT' }, security: { auth: { rateLimitMax: 7 } } } as never),
    );

    const root = await getConfig();
    expect(root.branding.companyName).toBe('Raíz');
    expect(root.security.auth.rateLimitMax).toBe(7);

    const itCfg = await runWithPortal('it', getConfig);
    expect(itCfg.branding.companyName).toBe('Portal IT');
    expect(itCfg.auth?.passwordHash).toBe(root.auth?.passwordHash);
    expect(itCfg.security.auth.rateLimitMax).toBe(7);

    const raw = JSON.parse(await fs.readFile(path.join(dataDir, 'portals', 'it', 'config.json'), 'utf8'));
    expect(Object.keys(raw).sort()).toEqual(
      ['_meta', 'branding', 'cards', 'categories', 'layout', 'maintenanceWindows', 'theme'].sort(),
    );
    expect(raw.auth).toBeUndefined();
  });

  it('un portal sin archivo arranca con la portada por defecto', async () => {
    const { getConfig, runWithPortal } = await import('~/lib/config');
    const mk = await runWithPortal('mk', getConfig);
    expect(mk.branding.companyName).toBe('Mi Empresa');
    expect(mk.features.multiPortal.enabled).toBe(true);
  });

  it('requests concurrentes de portales distintos no se mezclan', async () => {
    const { getConfig, runWithPortal } = await import('~/lib/config');
    const names = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        runWithPortal(i % 2 ? 'it' : 'default', async () => {
          await new Promise((r) => setTimeout(r, Math.random() * 10));
          return (await getConfig()).branding.companyName;
        }),
      ),
    );
    names.forEach((n, i) => expect(n).toBe(i % 2 ? 'Portal IT' : 'Raíz'));
  });

  it('el reset de un portal no toca la configuración global', async () => {
    const { resetConfig, getConfig, runWithPortal } = await import('~/lib/config');
    await runWithPortal('it', resetConfig);
    expect((await runWithPortal('it', getConfig)).branding.companyName).toBe('Mi Empresa');
    const root = await getConfig();
    expect(root.branding.companyName).toBe('Raíz');
    expect(root.portals?.items).toHaveLength(2);
  });
});

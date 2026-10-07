import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// DATA_DIR se resuelve al importar config/paths.ts, así que se setea antes
// del import dinámico. Cubre el primer arranque con un volumen vacío, que
// fallaba con ENOENT porque nadie creaba data/portals/default/.
describe('seed del config en un DATA_DIR vacío', () => {
  let dataDir: string;
  let prevDataDir: string | undefined;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'umbral-seed-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = dataDir;
  });

  afterAll(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('crea config.json válido en data/portals/default', async () => {
    const { getConfig } = await import('~/lib/config');
    const cfg = await getConfig();
    expect(cfg.auth?.passwordHash).toBeTruthy();
    const raw = await fs.readFile(path.join(dataDir, 'portals', 'default', 'config.json'), 'utf8');
    expect(JSON.parse(raw).version).toBe(1);
  });

  it('las escrituras concurrentes no se pisan el archivo temporal', async () => {
    const { writeJsonAtomic } = await import('~/lib/config/paths');
    const target = path.join(dataDir, 'concurrent.json');
    await Promise.all(Array.from({ length: 20 }, (_, i) => writeJsonAtomic(target, { i })));
    const parsed = JSON.parse(await fs.readFile(target, 'utf8'));
    expect(typeof parsed.i).toBe('number');
    const leftovers = (await fs.readdir(dataDir)).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });
});

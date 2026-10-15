import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { computeDataDir, standardDataDir, type DataDirInputs } from '../src/lib/config/data-dir.ts';

function inputs(over: Partial<DataDirInputs> & { dirs?: Record<string, string[]> } = {}): DataDirInputs {
  const dirs = over.dirs ?? {};
  return {
    env: {},
    platform: 'linux',
    cwd: '/srv/umbral',
    homedir: '/home/ana',
    exists: (p) => p in dirs,
    list: (p) => dirs[p] ?? [],
    ...over,
  };
}

describe('standardDataDir', () => {
  test('Windows usa %APPDATA%\\FittyAr\\Umbral', () => {
    const dir = standardDataDir({
      platform: 'win32',
      homedir: 'C:\\Users\\ana',
      env: { APPDATA: 'C:\\Users\\ana\\AppData\\Roaming' },
    });
    assert.equal(dir, 'C:\\Users\\ana\\AppData\\Roaming\\FittyAr\\Umbral');
  });

  test('Windows sin APPDATA cae a <home>\\AppData\\Roaming', () => {
    const dir = standardDataDir({ platform: 'win32', homedir: 'C:\\Users\\ana', env: {} });
    assert.equal(dir, 'C:\\Users\\ana\\AppData\\Roaming\\FittyAr\\Umbral');
  });

  test('macOS usa ~/Library/Application Support/FittyAr/Umbral', () => {
    const dir = standardDataDir({ platform: 'darwin', homedir: '/Users/ana', env: {} });
    assert.equal(dir, '/Users/ana/Library/Application Support/FittyAr/Umbral');
  });

  test('Linux usa ~/.local/share/FittyAr/Umbral por defecto', () => {
    const dir = standardDataDir({ platform: 'linux', homedir: '/home/ana', env: {} });
    assert.equal(dir, '/home/ana/.local/share/FittyAr/Umbral');
  });

  test('Linux respeta XDG_DATA_HOME absoluto', () => {
    const dir = standardDataDir({ platform: 'linux', homedir: '/home/ana', env: { XDG_DATA_HOME: '/data/xdg' } });
    assert.equal(dir, '/data/xdg/FittyAr/Umbral');
  });

  test('Linux ignora XDG_DATA_HOME relativo (spec XDG)', () => {
    const dir = standardDataDir({ platform: 'linux', homedir: '/home/ana', env: { XDG_DATA_HOME: 'rel/xdg' } });
    assert.equal(dir, '/home/ana/.local/share/FittyAr/Umbral');
  });
});

describe('computeDataDir', () => {
  const legacy = path.join('/srv/umbral', 'data');
  const standard = '/home/ana/.local/share/FittyAr/Umbral';

  test('DATA_DIR definido gana siempre', () => {
    const res = computeDataDir(inputs({ env: { DATA_DIR: '/app/data' }, dirs: { [legacy]: ['config.json'] } }));
    assert.deepEqual([res.dir, res.source], ['/app/data', 'env']);
  });

  test('instalación nueva usa la ruta estándar', () => {
    const res = computeDataDir(inputs());
    assert.deepEqual([res.dir, res.source], [standard, 'standard']);
  });

  test('./data con contenido y sin ruta estándar: sigue usando ./data', () => {
    const res = computeDataDir(inputs({ dirs: { [legacy]: ['portals', 'uploads'] } }));
    assert.deepEqual([res.dir, res.source], [legacy, 'legacy']);
    assert.equal(res.standardDir, standard);
  });

  test('./data con sólo .gitkeep no cuenta como instalación previa', () => {
    const res = computeDataDir(inputs({ dirs: { [legacy]: ['.gitkeep'] } }));
    assert.equal(res.source, 'standard');
  });

  test('si la ruta estándar ya existe (migrado), se usa aunque quede ./data', () => {
    const res = computeDataDir(inputs({ dirs: { [legacy]: ['config.json'], [standard]: ['config.json'] } }));
    assert.deepEqual([res.dir, res.source], [standard, 'standard']);
  });
});

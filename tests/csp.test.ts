import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { promises as fs, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_CSP, LEGACY_DEFAULT_CSPS } from '~/lib/schema/security';
import { defaultConfig } from '~/lib/config/defaults';

/** Directiva `name` de una CSP, como lista de fuentes. */
function directive(csp: string, name: string): string[] {
  const found = csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === name);
  return found ? found.slice(1) : [];
}

describe('CSP por defecto', () => {
  it('script-src no permite inline ni eval', () => {
    const scriptSrc = directive(DEFAULT_CSP, 'script-src');
    expect(scriptSrc).toEqual(["'self'"]);
  });

  it('el seed de un config nuevo usa la CSP por defecto', () => {
    expect(defaultConfig().security.headers.csp).toBe(DEFAULT_CSP);
  });

  it('los defaults viejos son los que tenían unsafe-inline y unsafe-eval', () => {
    for (const legacy of LEGACY_DEFAULT_CSPS) {
      expect(directive(legacy, 'script-src')).toContain("'unsafe-eval'");
    }
  });
});

describe('migración de la CSP al cargar el config', () => {
  let dataDir: string;
  let prevDataDir: string | undefined;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'umbral-csp-'));
    prevDataDir = process.env.DATA_DIR;
    // DATA_DIR se resuelve al importar config/paths.ts: se setea antes del
    // import dinámico de load.ts.
    process.env.DATA_DIR = dataDir;
    await fs.mkdir(path.join(dataDir, 'portals', 'default'), { recursive: true });
  });

  afterAll(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  async function loadWithCsp(csp: string | null) {
    const cfgPath = path.join(dataDir, 'portals', 'default', 'config.json');
    const cfg = defaultConfig();
    cfg.security.headers.csp = csp;
    await fs.writeFile(cfgPath, JSON.stringify(cfg));
    const { loadFresh } = await import('~/lib/config/load');
    const loaded = await loadFresh();
    const persisted = JSON.parse(await fs.readFile(cfgPath, 'utf8'));
    return { loaded: loaded.security.headers.csp, persisted: persisted.security.headers.csp };
  }

  it('reemplaza cada default viejo por el nuevo y lo persiste', async () => {
    for (const legacy of LEGACY_DEFAULT_CSPS) {
      const { loaded, persisted } = await loadWithCsp(legacy);
      expect(loaded).toBe(DEFAULT_CSP);
      expect(persisted).toBe(DEFAULT_CSP);
    }
  });

  it('no toca una CSP personalizada, aunque tenga unsafe-eval', async () => {
    const custom = LEGACY_DEFAULT_CSPS[0].replace("connect-src 'self'", "connect-src 'self' https://api.example.com");
    const { loaded, persisted } = await loadWithCsp(custom);
    expect(loaded).toBe(custom);
    expect(persisted).toBe(custom);
  });

  it('no toca una CSP desactivada (null)', async () => {
    const { loaded } = await loadWithCsp(null);
    expect(loaded).toBeNull();
  });
});

describe('sin JavaScript inline en el markup', () => {
  const srcDir = path.resolve('src');
  const astroFiles: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.astro')) astroFiles.push(full);
    }
  };
  walk(srcDir);

  it('ningún <script> inline ejecutable ni define:vars', () => {
    const offenders: string[] = [];
    for (const file of astroFiles) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<script\b([^>]*)>/g)) {
        const attrs = m[1];
        if (/define:vars/.test(attrs)) offenders.push(`${file}: define:vars`);
        // is:inline sólo para scripts externos (src=) o bloques de datos JSON.
        if (/is:inline/.test(attrs) && !/\bsrc=/.test(attrs) && !/type="application\/json"/.test(attrs)) {
          offenders.push(`${file}: <script${attrs}>`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('nadie usa x-html (el build CSP de Alpine lo prohíbe)', () => {
    const offenders = astroFiles.filter((f) => /\sx-html=/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('el panel usa el build CSP de Alpine', () => {
    const dashboard = readFileSync(path.join(srcDir, 'pages/admin/dashboard.astro'), 'utf8');
    expect(dashboard).toContain("from '@alpinejs/csp'");
    expect(dashboard).not.toMatch(/from 'alpinejs'/);
  });
});

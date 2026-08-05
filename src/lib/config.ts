import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ConfigSchema, type Config, type ConfigUpdate } from './schema';
import { hashPassword, generateToken } from './auth';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.log');

/** Defaults used to seed a brand-new config.json. */
function defaultConfig(): Config {
  return {
    version: 1,
    branding: {
      companyName: 'Mi Empresa',
      logo: null,
      favicon: null,
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000',
      },
      cardStyle: 'glass',
      accentColor: '#60a5fa',
      textColor: '#f1f5f9',
      fontFamily: 'Inter',
      fontUrl:
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      colorMode: 'auto',
    },
    layout: {
      columnsDesktop: 4,
      columnsTablet: 3,
      columnsMobile: 2,
      cardSize: 'medium',
      showDescriptions: true,
    },
    categories: [
      { id: 'com', name: 'Comunicación', icon: 'message-circle' },
      { id: 'prod', name: 'Productividad', icon: 'briefcase' },
      { id: 'dev', name: 'Desarrollo', icon: 'code' },
    ],
    cards: [],
    _meta: { createdAt: null, updatedAt: null },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// In-memory cache (one process, single instance)
// ──────────────────────────────────────────────────────────────────────────
let cache: { config: Config; loadedAt: number } | null = null;
const CACHE_TTL_MS = 5_000; // read-through TTL to balance freshness and perf

function invalidate() {
  cache = null;
}

// ──────────────────────────────────────────────────────────────────────────
// Filesystem helpers
// ──────────────────────────────────────────────────────────────────────────
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function seedIfMissing(initialPassword?: string): Promise<Config> {
  await ensureDirs();
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    const cfg = defaultConfig();
    const now = new Date().toISOString();
    cfg._meta = { createdAt: now, updatedAt: now };

    // First-run password setup
    const password = initialPassword || process.env.INITIAL_PASSWORD;
    cfg.auth = {
      passwordHash: await hashPassword(password || 'admin'),
      csrfToken: generateToken(32),
    };

    if (!password) {
      console.warn(
        '[homepage] No INITIAL_PASSWORD set. Default password is "admin" — change it from /admin ASAP.',
      );
    } else {
      console.log('[homepage] Initial password set from INITIAL_PASSWORD env var.');
    }

    await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    return cfg;
  }
  // File exists; load and validate.
  return loadFresh();
}

async function loadFresh(): Promise<Config> {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `config.json está corrupto (JSON inválido). Reparalo o restaurá el volumen. Detalle: ${(err as Error).message}`,
    );
  }
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `config.json no cumple el schema: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  return result.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────
export async function getConfig(): Promise<Config> {
  // 1) fresh-load if no cache
  if (!cache) {
    const cfg = await seedIfMissing();
    cache = { config: cfg, loadedAt: Date.now() };
    return cfg;
  }
  // 2) read-through after TTL
  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    try {
      const fresh = await loadFresh();
      cache = { config: fresh, loadedAt: Date.now() };
      return fresh;
    } catch {
      // fallback to stale cache on read error
      return cache.config;
    }
  }
  return cache.config;
}

export async function saveConfig(update: ConfigUpdate): Promise<Config> {
  const current = await getConfig();
  const merged = {
    ...current,
    ...update,
    branding: { ...current.branding, ...(update.branding ?? {}) },
    theme: {
      ...current.theme,
      ...(update.theme ?? {}),
      background: { ...current.theme.background, ...(update.theme?.background ?? {}) },
    },
    layout: { ...current.layout, ...(update.layout ?? {}) },
    categories: update.categories ?? current.categories,
    cards: update.cards ?? current.cards,
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };
  // Re-validate the merged result.
  const result = ConfigSchema.parse(merged);

  // Atomic write: write to .tmp then rename.
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
  invalidate();
  return result;
}

export async function resetConfig(): Promise<Config> {
  await ensureDirs();
  const cfg = defaultConfig();
  const now = new Date().toISOString();
  cfg._meta = { createdAt: now, updatedAt: now };
  // Preserve current auth
  const current = await getConfig().catch(() => null);
  if (current?.auth) cfg.auth = current.auth;
  else {
    const password = process.env.INITIAL_PASSWORD || 'admin';
    cfg.auth = {
      passwordHash: await hashPassword(password),
      csrfToken: generateToken(32),
    };
  }
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  invalidate();
  return cfg;
}

/** Replace the whole config (used by /api/import). Validates strictly. */
export async function importConfig(newConfig: Config): Promise<Config> {
  const result = ConfigSchema.parse(newConfig);
  await ensureDirs();
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
  invalidate();
  return result;
}

/** Replace auth (password hash + rotate CSRF). */
export async function updateAuth(newPasswordHash: string, newCsrf: string): Promise<Config> {
  const current = await getConfig();
  const merged = {
    ...current,
    auth: { passwordHash: newPasswordHash, csrfToken: newCsrf },
    _meta: { ...current._meta, updatedAt: new Date().toISOString() },
  };
  const result = ConfigSchema.parse(merged);
  const tmp = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf8');
  await fs.rename(tmp, CONFIG_PATH);
  invalidate();
  return result;
}

/** Audit log (append-only). Best-effort, no I/O failure propagation. */
export async function audit(action: string, detail?: string) {
  try {
    await ensureDirs();
    const line = `${new Date().toISOString()}\t${action}\t${detail ?? ''}\n`;
    await fs.appendFile(AUDIT_LOG_PATH, line, 'utf8');
  } catch (err) {
    console.error('[homepage] audit log write failed:', err);
  }
}

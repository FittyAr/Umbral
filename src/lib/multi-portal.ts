/**
 * Multi-portal routing (opt-in: features.multiPortal).
 *
 * Resuelve qué portal matchea un request (Host header + path prefix)
 * y devuelve el id del portal. Las funciones de config.ts leen
 * data/portals/<id>/config.json en vez de data/config.json cuando
 * multiPortal está activo.
 *
 * El portal "default" es especial: matchea cualquier request que no
 * matchea otro portal, y es donde se migra el config legacy al activar
 * la feature (data/ → data/portals/default/).
 *
 * Performance: O(n) sobre portals. Para deployments típicos (decenas
 * de portales) es OK. Si crece a miles, podemos indexar por host.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Config, Portal } from './schema';
import { getConfig } from './config';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/** Path al config.json de un portal. Si id='default' y multiPortal
 *  está apagado, devuelve data/config.json (legacy). */
export function portalConfigPath(id: string): string {
  return path.join(DATA_DIR, 'portals', id, 'config.json');
}

/** Path al uploads dir de un portal. */
export function portalUploadsPath(id: string): string {
  return path.join(DATA_DIR, 'portals', id, 'uploads');
}

/** Path al audit log de un portal. */
export function portalAuditPath(id: string): string {
  return path.join(DATA_DIR, 'portals', id, 'audit.log');
}

/** Resuelve qué portal matchea el request. Si multiPortal está apagado,
 *  devuelve "default" (legacy). Si está activo, matchea por Host header
 *  o path prefix según los portals configurados.
 *
 *  Si ningún portal matchea, devuelve el defaultPortal. */
export function resolvePortalId(request: Request, cfg: Config): string {
  if (!cfg.portals || !cfg.portals.items || cfg.portals.items.length === 0) {
    return 'default';
  }
  const url = new URL(request.url);
  const host = url.host.toLowerCase();
  const pathname = url.pathname;
  const portals = cfg.portals.items;
  // 1) Match exacto por host + path prefix
  for (const p of portals) {
    if (p.host && matchesHost(p.host, host) && matchesPath(p.pathPrefix, pathname)) {
      return p.id;
    }
  }
  // 2) Match por path prefix solamente (host vacío = matchea cualquier host)
  for (const p of portals) {
    if (!p.host && p.pathPrefix !== '*' && matchesPath(p.pathPrefix, pathname)) {
      return p.id;
    }
  }
  // 3) Default: si hay un portal con pathPrefix='*' o '', usarlo
  const fallback = portals.find((p) => p.pathPrefix === '*' || p.pathPrefix === '/');
  if (fallback) return fallback.id;
  // 4) Fallback final: defaultPortal configurado
  return cfg.portals.defaultPortal || 'default';
}

function matchesHost(pattern: string, host: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('*.')) {
    // *.example.com → matchea foo.example.com pero NO example.com
    const suffix = pattern.slice(1); // ".example.com"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === pattern.toLowerCase();
}

function matchesPath(prefix: string, pathname: string): boolean {
  if (prefix === '*' || prefix === '/' || prefix === '') return true;
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** Auto-migración: data/ → data/portals/default/. Se ejecuta una vez,
 *  cuando se prende la feature y data/portals/default/ no existe.
 *  Es idempotente. */
export async function migrateLegacyToMultiPortal(): Promise<{ migrated: boolean; reason?: string }> {
  const defaultPath = portalConfigPath('default');
  // Si ya existe el portal default migrado, no hacer nada
  try {
    await fs.access(defaultPath);
    return { migrated: false, reason: 'default portal ya existe' };
  } catch {
    // No existe, sigamos
  }
  // Verificar que el legacy data/ existe
  const legacyConfig = path.join(DATA_DIR, 'config.json');
  let legacyStat;
  try {
    legacyStat = await fs.stat(legacyConfig);
  } catch {
    // No hay config legacy → crear portal default vacío
    await fs.mkdir(path.join(DATA_DIR, 'portals', 'default'), { recursive: true });
    await fs.writeFile(defaultPath, JSON.stringify({ version: 1, _meta: { createdAt: new Date().toISOString(), updatedAt: null, migratedFrom: 'fresh' } }, null, 2));
    return { migrated: true, reason: 'fresh install, no legacy data' };
  }
  // Mover data/ a data/portals/default/
  // Renombramos archivos uno por uno para preservar atomicidad.
  await fs.mkdir(path.join(DATA_DIR, 'portals', 'default'), { recursive: true });
  const filesToMove = ['config.json'];
  for (const f of filesToMove) {
    try {
      await fs.rename(path.join(DATA_DIR, f), path.join(DATA_DIR, 'portals', 'default', f));
    } catch (e) {
      // Si falla, no es crítico (puede no existir)
    }
  }
  // Mover uploads/ si existe
  try {
    const uploadsStat = await fs.stat(path.join(DATA_DIR, 'uploads'));
    if (uploadsStat.isDirectory()) {
      await fs.rename(path.join(DATA_DIR, 'uploads'), path.join(DATA_DIR, 'portals', 'default', 'uploads'));
    }
  } catch {
    // No hay uploads/, no importa
  }
  // Mover audit.log si existe
  try {
    await fs.rename(path.join(DATA_DIR, 'audit.log'), path.join(DATA_DIR, 'portals', 'default', 'audit.log'));
  } catch {
    // No hay audit.log
  }
  return { migrated: true, reason: `migrated ${filesToMove.length}+ files from data/ to data/portals/default/` };
}

/** Helper de debugging: lista los portales en disco. */
export async function listPortalsOnDisk(): Promise<string[]> {
  try {
    const entries = await fs.readdir(path.join(DATA_DIR, 'portals'), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
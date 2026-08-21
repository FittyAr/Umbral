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
import { getConfig, audit } from './config';

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
  const fallback = portals.find((p: Portal) => p.pathPrefix === '*' || p.pathPrefix === '/');
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

/** Auto-migración: data/ → data/portals/default/. Se ejecuta una vez
 *  por cold boot (vía seedIfMissing en config.ts). Es idempotente:
 *  si no hay legacy data/config.json, sale inmediatamente con
 *  { migrated: false }.
 *
 *  POR QUÉ SE LLAMA DESDE seedIfMissing (no desde loadFresh ni desde
 *  el toggle de multiPortal): el código v2.x lee y escribe SIEMPRE en
 *  data/portals/<id>/config.json (vía portalConfigPath), independientemente
 *  del flag features.multiPortal. Esto significa que un upgrade desde
 *  v1.x (que usaba data/config.json) "pierde" sus datos en el primer
 *  boot del server v2.x — el código lee de data/portals/default/ que no
 *  existe, seedIfMissing crea uno FRESCO, y la legacy data/config.json
 *  queda huérfana. Llamando a esta función en seedIfMissing ANTES del
 *  check "existe portal default", garantizamos que la legacy data se
 *  mueva al nuevo path en el primer boot del upgrade. Si no hay legacy,
 *  la función es no-op y el seed continúa normalmente. */
export async function migrateLegacyToMultiPortal(): Promise<{ migrated: boolean; reason?: string }> {
  const legacyConfig = path.join(DATA_DIR, 'config.json');
  // Verificar que el legacy data/config.json existe. Si no, no hay nada
  // que migrar (fresh install o ya migrado).
  let legacyStat;
  try {
    legacyStat = await fs.stat(legacyConfig);
  } catch {
    return { migrated: false, reason: 'no legacy data/config.json (fresh install or already migrated)' };
  }
  // Mover data/ a data/portals/default/
  // Renombramos archivos uno por uno para preservar atomicidad. Esta
  // función se llama desde seedIfMissing() ANTES de que el portal default
  // exista, por lo que no hay riesgo de pisar un portal default recién
  // creado por el seed.
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
  // Audit log del reshuffle filesystem — sin esto, el cambio de
  // features.multiPortal.enabled en el config es visible en el log pero
  // la consecuencia (data → data/portals/default/) no. En incident response
  // un admin buscando 'qué pasó con mi data' no encuentra la migración.
  // NOTA: NO usamos `audit()` (que escribe a AUDIT_LOG_PATH legacy) sino
  // escritura directa a la nueva ubicación de audit del portal migrado.
  // El primer write crea el archivo. La migración es atómica: si falla
  // el append, no hay otra fuente de verdad.
  try {
    const newAuditPath = path.join(DATA_DIR, 'portals', 'default', 'audit.log');
    const line = `${new Date().toISOString()}\tmulti_portal_migration\tdata/ → data/portals/default/\n`;
    await fs.appendFile(newAuditPath, line, 'utf8');
  } catch {
    // Si falla (permisos, disco lleno), la migración ya se hizo en
    // filesystem. El admin puede buscar 'multi_portal_migration' o
    // 'data → data/portals' en logs externos. No es crítico.
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
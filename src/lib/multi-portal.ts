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

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/** Path al config.json de un portal. Si id='default' y multiPortal
 *  está apagado, devuelve data/config.json (legacy). */
export function portalConfigPath(id: string): string {
  return path.join(DATA_DIR, 'portals', id, 'config.json');
}

// No hay `portalUploadsPath` ni `portalAuditPath`: los uploads y el audit log
// son compartidos, en `data/`. Existían sin un solo caller y lo único que
// hacían era invitar a mover archivos a un directorio que nadie lee.

export interface ResolvedPortal {
  /** Id del portal (carpeta en data/portals/). */
  id: string;
  /** Prefijo de path que matcheó (ej. `/it`), o '' si el portal se resolvió
   *  por host, por selección explícita o por default. Las páginas públicas
   *  lo anteponen a sus links. */
  basePath: string;
  /** Path interno al que reescribir el request (sin el prefijo), si aplica. */
  rewriteTo?: string;
}

/** Header (API) y query param (páginas, `<img>` de QR) para elegir portal. */
export const PORTAL_HEADER = 'x-umbral-portal';
export const PORTAL_PARAM = 'portal';

// Paths que nunca se reescriben por prefijo: son compartidos por todos los
// portales (API, panel, assets del build, íconos).
const SHARED_PREFIXES = ['/api/', '/admin', '/_astro/', '/_image', '/icons/', '/favicon', '/docs', '/manifest.webmanifest'];

/**
 * Resuelve el portal de un request. Orden:
 * 1. Selección explícita (`x-umbral-portal` o `?portal=`) de un portal
 *    configurado: la usan la API del panel, los fetch de la portada de un
 *    portal servido por prefijo y las imágenes de QR.
 * 2. Host (+ prefijo de path) de los portales configurados.
 * 3. Sólo prefijo de path (portales sin host).
 * 4. `portals.defaultPortal`, o el raíz.
 * Con la feature apagada siempre es el raíz.
 */
export function resolveRequestPortal(request: Request, url: URL, cfg: Config): ResolvedPortal {
  const root: ResolvedPortal = { id: 'default', basePath: '' };
  if (cfg.features?.multiPortal?.enabled !== true) return root;
  const portals = cfg.portals?.items ?? [];
  const known = new Set(['default', ...portals.map((p) => p.id)]);

  const explicit = (request.headers.get(PORTAL_HEADER) || url.searchParams.get(PORTAL_PARAM) || '').trim();
  if (explicit && known.has(explicit)) return { id: explicit, basePath: portalBasePath(portals, explicit) };

  // El header Host (y no url.host): Astro sólo refleja en `url` los dominios
  // declarados en security.allowedDomains. Elegir portal por Host no da
  // permisos: la auth es global.
  const host = (request.headers.get('host') || url.host).toLowerCase();
  const pathname = url.pathname;
  const shared = SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
  const withPrefix = (p: Portal): ResolvedPortal => {
    const prefix = normalizePrefix(p.pathPrefix);
    if (!prefix) return { id: p.id, basePath: '' };
    const rest = pathname.slice(prefix.length) || '/';
    return { id: p.id, basePath: prefix, rewriteTo: shared ? undefined : rest };
  };

  for (const p of portals) {
    if (p.host && matchesHost(p.host, host) && (shared || matchesPath(p.pathPrefix, pathname))) {
      return shared ? { id: p.id, basePath: '' } : withPrefix(p);
    }
  }
  if (!shared) {
    for (const p of portals) {
      if (!p.host && normalizePrefix(p.pathPrefix) && matchesPath(p.pathPrefix, pathname)) return withPrefix(p);
    }
  }
  const fallback = cfg.portals?.defaultPortal;
  return fallback && known.has(fallback) ? { id: fallback, basePath: '' } : root;
}

/** Compat: sólo el id. */
export function resolvePortalId(request: Request, cfg: Config): string {
  return resolveRequestPortal(request, new URL(request.url), cfg).id;
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix || prefix === '*' || prefix === '/') return '';
  return prefix.replace(/\/+$/, '');
}

function matchesHost(pattern: string, host: string): boolean {
  if (pattern === '*') return true;
  // El patrón puede venir con o sin puerto: `it.example.com` matchea
  // `it.example.com:8443`.
  const p = pattern.toLowerCase();
  const hostname = host.replace(/:\d+$/, '');
  if (!p.includes(':') && !p.startsWith('*.')) return hostname === p;
  if (pattern.startsWith('*.')) {
    // *.example.com → matchea foo.example.com pero NO example.com
    const suffix = pattern.slice(1); // ".example.com"
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return host === p;
}

function matchesPath(prefix: string, pathname: string): boolean {
  const p = normalizePrefix(prefix);
  if (!p) return true;
  return pathname === p || pathname.startsWith(p + '/');
}

function portalBasePath(portals: Portal[], id: string): string {
  return normalizePrefix(portals.find((p) => p.id === id)?.pathPrefix);
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
  // La reparación va antes del early return: el caso que hay que arreglar es
  // justamente el de una instalación ya migrada por la versión anterior de
  // esta función, que no tiene legacy config.json.
  await repairPortalDataSplit();
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
  // Los uploads y el audit log NO se mueven, a propósito: todo el código que
  // los lee y escribe (lib/upload.ts, lib/assets.ts, lib/audit.ts) usa
  // `data/uploads` y `data/audit.log`. Moverlos dejaba los archivos en un
  // directorio que nadie lee, así que después de un upgrade desde v1 todos
  // los logos e íconos subidos devolvían 404 mientras las subidas nuevas
  // recreaban el directorio viejo.
  await repairPortalDataSplit();
  // Audit log del reshuffle filesystem — sin esto, el cambio de
  // features.multiPortal.enabled en el config es visible en el log pero
  // la consecuencia (data → data/portals/default/) no. En incident response
  // un admin buscando 'qué pasó con mi data' no encuentra la migración.
  // NOTA: no usamos `audit()` para no importar config.ts desde acá (esto
  // corre dentro de su propio seed). Escribimos directo al log, que es el
  // mismo `data/audit.log` que lee el visor.
  try {
    const auditPath = path.join(DATA_DIR, 'audit.log');
    const line = `${new Date().toISOString()}\tmulti_portal_migration\tconfig → data/portals/default/config.json\n`;
    await fs.appendFile(auditPath, line, 'utf8');
  } catch {
    // Si falla (permisos, disco lleno), la migración ya se hizo en
    // filesystem. El admin puede buscar 'multi_portal_migration' o
    // 'data → data/portals' en logs externos. No es crítico.
  }
  return { migrated: true, reason: `migrated ${filesToMove.length}+ files from data/ to data/portals/default/` };
}

/**
 * Devuelve los uploads y el audit log al lugar donde el código los busca.
 *
 * Una versión anterior de la migración los movía a `data/portals/default/`,
 * donde ningún lector mira. Esto repara esas instalaciones: es idempotente y
 * no hace nada cuando no hay nada que reparar, así que puede correr en cada
 * boot sin costo.
 */
export async function repairPortalDataSplit(): Promise<void> {
  const portalDir = path.join(DATA_DIR, 'portals', 'default');

  // Uploads: mover archivo por archivo, sin pisar los que ya están en el
  // destino (esos son más nuevos: los escribió el código actual).
  const portalUploads = path.join(portalDir, 'uploads');
  const legacyUploads = path.join(DATA_DIR, 'uploads');
  try {
    const entries = await fs.readdir(portalUploads, { withFileTypes: true });
    await fs.mkdir(legacyUploads, { recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const dest = path.join(legacyUploads, entry.name);
      try {
        await fs.stat(dest);
        continue; // ya existe en el destino: dejamos el de allá
      } catch { /* no está, lo movemos */ }
      await fs.rename(path.join(portalUploads, entry.name), dest).catch(() => {});
    }
    await fs.rmdir(portalUploads).catch(() => {}); // sólo si quedó vacío
  } catch { /* no hay uploads del portal: nada que reparar */ }

  // Audit log: concatenamos y ordenamos. Las líneas arrancan con el
  // timestamp ISO, así que el orden lexicográfico es el cronológico y el
  // visor (que lee de atrás para adelante) no ve entradas fuera de lugar.
  const portalAudit = path.join(portalDir, 'audit.log');
  const legacyAudit = path.join(DATA_DIR, 'audit.log');
  try {
    const moved = await fs.readFile(portalAudit, 'utf8');
    let existing = '';
    try {
      existing = await fs.readFile(legacyAudit, 'utf8');
    } catch { /* no hay log previo */ }
    const lines = (moved + existing).split('\n').filter((l) => l.trim() !== '');
    lines.sort();
    await fs.writeFile(legacyAudit, lines.join('\n') + '\n', 'utf8');
    await fs.unlink(portalAudit).catch(() => {});
  } catch { /* no hay audit log del portal: nada que reparar */ }
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
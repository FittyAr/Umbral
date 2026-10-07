/**
 * Paths de datos y portal activo.
 *
 * `DATA_DIR` se resolvía en siete módulos distintos; acá vive una sola vez y
 * el resto lo importa. Los tres paths exportados son los del portal
 * "default", que es el comportamiento histórico (single-portal); el config
 * de cada portal vive en `data/portals/<id>/config.json`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.log');

// ──────────────────────────────────────────────────────────────────────────
// Portal activo (multi-portal)
// ──────────────────────────────────────────────────────────────────────────
// El portal se resuelve por request en el middleware y viaja en un
// AsyncLocalStorage: antes era una variable del proceso, así que con dos
// requests concurrentes de portales distintos uno leía el config del otro.
// Fuera de un request (tests, scripts) el portal es el raíz.

/** Portal raíz: guarda la configuración global (auth, seguridad, features,
 *  lista de portales…) y es el que se sirve cuando multiPortal está apagado. */
export const ROOT_PORTAL = 'default';

const portalStore = new AsyncLocalStorage<string>();

/** Ejecuta `fn` con `portalId` como portal activo (también en lo que `fn`
 *  dispare de forma asíncrona). */
export function runWithPortal<T>(portalId: string, fn: () => T): T {
  return portalStore.run(portalId, fn);
}

export function getActivePortalId(): string {
  return portalStore.getStore() ?? ROOT_PORTAL;
}

export async function ensureDirs() {
  // Los uploads viven en `data/uploads`, que es de donde los leen
  // lib/upload.ts, lib/assets.ts y /api/assets. Esto creaba además
  // `data/portals/<id>/uploads`, un directorio que ningún lector mira: el
  // config es lo único que está por portal (ver lib/multi-portal.ts).
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  // El directorio del portal activo tiene que existir antes del seed: sin él
  // el primer `writeFile` de config.json falla con ENOENT en una instalación
  // limpia.
  await fs.mkdir(path.join(DATA_DIR, 'portals', getActivePortalId()), { recursive: true });
}

/**
 * Escritura atómica: primero el `.tmp`, después el rename. El patrón estaba
 * copiado siete veces dentro de config.ts, una de ellas sin `.tmp`.
 */
const writeQueues = new Map<string, Promise<void>>();

export function writeJsonAtomic(target: string, data: unknown): Promise<void> {
  // Escrituras al mismo archivo en serie dentro del proceso: en Windows dos
  // rename concurrentes sobre el mismo destino fallan con EPERM.
  const prev = writeQueues.get(target) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => writeJsonAtomicNow(target, data));
  const tracked = next.finally(() => {
    if (writeQueues.get(target) === tracked) writeQueues.delete(target);
  });
  writeQueues.set(target, tracked);
  return next;
}

async function writeJsonAtomicNow(target: string, data: unknown): Promise<void> {
  // Nombre de tmp único por escritura: con un `.tmp` fijo dos escrituras
  // concurrentes mezclaban contenido y el segundo rename fallaba con ENOENT.
  const tmp = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  const fh = await fs.open(tmp, 'w');
  try {
    await fh.writeFile(JSON.stringify(data, null, 2), 'utf8');
    // fsync antes del rename: sin esto un corte de luz puede dejar el
    // config vacío aunque el rename ya se haya hecho.
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

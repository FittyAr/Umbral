/**
 * Paths de datos y portal activo.
 *
 * `DATA_DIR` se resolvía en siete módulos distintos; acá vive una sola vez y
 * el resto lo importa. Los tres paths exportados son los del portal
 * "default", que es el comportamiento histórico (single-portal): el código
 * que necesita el portal activo usa `portalConfigPath(getActivePortalId())`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

export const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.log');

// (Ola 4.1) Portal activo para este proceso. Default: 'default' (legacy
// single-portal). Multi-portal mode: el middleware setea el portal id
// per-request vía setActivePortalId() antes de que el handler llame a
// getConfig(). En una sola instancia del server, se sirve un portal
// a la vez — para multi-portal real con dispatch en runtime, el proxy
// externo (nginx/Caddy/Traefik) rutea por host/pathPrefix a distintas
// instancias, o se usa una sola instancia con cache per-portal in-memory
// (v2 de esta feature, requiere refactor del cache a Map<portalId, Cache>).
let activePortalId = 'default';
export function setActivePortalId(id: string) { activePortalId = id; }
export function getActivePortalId() { return activePortalId; }

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
  await fs.mkdir(path.join(DATA_DIR, 'portals', activePortalId), { recursive: true });
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

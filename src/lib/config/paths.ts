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
  await fs.mkdir(path.join(DATA_DIR, 'portals'), { recursive: true });
}

/**
 * Escritura atómica: primero el `.tmp`, después el rename. El patrón estaba
 * copiado siete veces dentro de config.ts, una de ellas sin `.tmp`.
 */
export async function writeJsonAtomic(target: string, data: unknown): Promise<void> {
  const tmp = target + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, target);
}

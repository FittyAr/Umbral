import type { APIRoute } from 'astro';
import { json } from '~/lib/http';
import { getConfig } from '~/lib/config';

export const prerender = false;

/**
 * Healthcheck del container. Además de "el proceso responde", verifica que el
 * config se pueda leer: con el volumen sin permisos o un config.json roto el
 * server seguía devolviendo `ok` y Docker nunca lo marcaba unhealthy.
 */
export const GET: APIRoute = async () => {
  try {
    await getConfig();
  } catch {
    return json({ status: 'error', reason: 'config' }, { status: 503 });
  }
  return json({ status: 'ok', uptime: process.uptime(), ts: Date.now() });
};

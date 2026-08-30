import type { APIRoute } from 'astro';
import { PREDEFINED_ICON_PACKS } from '~/lib/icon-packs';

/**
 * GET /api/icon-pack-catalog.json — los packs de íconos que Umbral conoce.
 *
 * Es el catálogo de "qué se puede instalar", no el estado de lo instalado:
 * eso lo devuelve `GET /api/icon-packs`, que sí depende de la config. Sólo lo
 * usa el tab Íconos Git, así que se carga al abrirlo.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ packs: PREDEFINED_ICON_PACKS }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });

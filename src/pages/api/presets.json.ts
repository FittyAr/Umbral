import type { APIRoute } from 'astro';
import { APP_PRESETS } from '~/lib/presets';

/**
 * GET /api/presets.json — el catálogo de plantillas de apps.
 *
 * 225 presets, 55 KB, que sólo hacen falta cuando el admin abre "Agregar
 * desde plantilla". Antes viajaban inline en cada carga del dashboard.
 *
 * Prerenderizado: el contenido es estático por build, no depende del
 * request ni de la config, y así también existe en el build del demo.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ presets: APP_PRESETS }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });

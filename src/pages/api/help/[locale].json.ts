import type { APIRoute } from 'astro';
import { getRenderedHelpCatalog } from '~/lib/help-catalog';
import { LOCALES, type Locale } from '~/i18n';

/**
 * GET /api/help/<locale>.json — catálogo de ayuda del admin, renderizado.
 *
 * Antes viajaba inline en el HTML del dashboard: 88 KB por carga, más los
 * 190-490 ms de CPU que costaba renderizar las 162 entradas de markdown en
 * cada GET. Ahora el cliente lo pide la primera vez que el usuario abre un
 * `?` y lo cachea, tanto en memoria como en el navegador.
 *
 * Es una ruta prerenderizada porque el contenido es estático por build (no
 * lee config ni depende del request), así que se genera una vez y también
 * existe en el build estático del demo. No hay nada sensible acá: son los
 * mismos textos de documentación que están en el repo.
 */
export const prerender = true;

export function getStaticPaths() {
  return LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = ({ params }) => {
  const locale = (LOCALES.includes(params.locale as Locale) ? params.locale : 'es') as Locale;
  return new Response(JSON.stringify({ locale, texts: getRenderedHelpCatalog(locale) }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};

/**
 * Resolución de URLs de API en el cliente.
 *
 * Umbral se puede servir bajo un subpath (`BASE_URL`), y el patrón
 * `base.endsWith('/') ? base + 'api/x' : base + '/api/x'` estaba escrito
 * cuatro veces. Una de las copias no estaba: `[category].astro` pegaba a
 * `/api/config` con path absoluto, así que el botón de recargar quedaba roto
 * en cualquier deploy con subpath.
 */
declare global {
  interface Window {
    __BASE_URL__?: string;
  }
}

/** Devuelve la URL absoluta de un path de API respetando el base del deploy. */
export function apiUrl(path: string): string {
  const base = window.__BASE_URL__ || '/';
  const clean = path.replace(/^\//, '');
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

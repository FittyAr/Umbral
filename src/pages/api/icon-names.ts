import type { APIRoute } from 'astro';
import { json } from '~/lib/http';
import { getAvailableIconNames } from '~/lib/icon-pack-names.ts';

export const prerender = false;

/**
 * GET /api/icon-names — los nombres de íconos instalados.
 *
 * El dashboard los usa para el picker y para saber si el ícono de una card
 * existe antes de pedir el SVG. Antes viajaban inline en el HTML (229 KB con
 * los packs por default, y escalando con cada pack instalado); ahora el
 * cliente los pide una vez y los guarda.
 *
 * A diferencia de `GET /api/icon-packs`, este endpoint no está gateado por
 * `features.iconPacks`: el picker tiene que funcionar con los íconos que ya
 * están instalados aunque la feature de instalación esté apagada.
 *
 * Auth: sesión admin (el middleware la exige para /api/* no público).
 */
export const GET: APIRoute = async () => {
  const availableIcons = await getAvailableIconNames();
  return json({ availableIcons }, { headers: { 'cache-control': 'private, no-cache' } });
};

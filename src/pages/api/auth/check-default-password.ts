/**
 * GET /api/auth/check-default-password
 *
 * Devuelve { isDefault: boolean } según si el password actual del admin
 *  matchea uno de los default inseguros comunes. El admin UI lo usa
 *  para mostrar un banner rojo "Cambiá tu password" si isDefault=true.
 *
 *  Coste: ~2s con 10 candidates (bcrypt cost 12). No es hot-path: solo
 *  se llama en /admin y solo cuando el panel se carga (no en cada render
 *  ni en cada interaccion). Si el admin ya cambió la password, devuelve
 *  isDefault=false (rápido, no itera candidates).
 */
import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { isDefaultPasswordHash } from '~/lib/auth';
import { json, error } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // No requiere auth: es solo informativo, el admin debe verlo
  // incluso si su sesión expiró (porque justamente le decimos que
  // cambie el password). Pero el body de respuesta es "isDefault",
  // no expone info sensible.
  void request;
  const cfg = await getConfig();
  const hash = cfg.auth?.passwordHash;
  if (!hash) {
    return error('Auth no inicializado', 500);
  }
  const isDefault = await isDefaultPasswordHash(hash);
  return json({ isDefault });
};
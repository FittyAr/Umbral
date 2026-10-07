import type { APIRoute } from 'astro';
import { clearSessionCookie, revokeSession } from '~/lib/auth';
import { audit, getConfig } from '~/lib/config';
import { json } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  // Revocar la sesión en el server: antes el logout sólo borraba la cookie,
  // y una copia de la cookie seguía valiendo hasta el siguiente cambio de
  // password.
  const session = locals.auth?.session;
  if (session) {
    const cfg = await getConfig();
    revokeSession(session, cfg.security.session.ttlHours);
  }
  await audit('logout', locals.auth?.actor ? `actor=${locals.auth.actor}` : undefined);
  return json({ ok: true }, { headers: { 'set-cookie': await clearSessionCookie() } });
};

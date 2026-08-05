import type { APIRoute } from 'astro';
import { getConfig, audit } from '~/lib/config';
import { verifyPassword, createSessionToken, buildSessionCookie, checkRateLimit } from '~/lib/auth';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const ip = locals.clientIp || clientAddress || 'unknown';
  // Loose limit: 30/min/IP. Page is for consultation, but a tiny guardrail is cheap.
  const rl = checkRateLimit(`login:${ip}`, 30, 60);
  if (!rl.ok) {
    return error(`Demasiados intentos. Probá en ${rl.resetInSec}s.`, 429);
  }

  let body: { password?: string };
  try {
    body = await readJson<{ password?: string }>(request);
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body.password || typeof body.password !== 'string') {
    return error('Falta el password', 400);
  }
  if (body.password.length > 200) {
    return error('Password demasiado largo', 400);
  }

  const cfg = await getConfig();
  if (!cfg.auth) {
    return error('Auth no inicializado. Revisá la configuración.', 500);
  }
  const ok = await verifyPassword(body.password, cfg.auth.passwordHash);
  if (!ok) {
    await audit('login_fail', `ip=${ip}`);
    return error('Password incorrecto', 401);
  }

  const token = createSessionToken();
  await audit('login_ok', `ip=${ip}`);
  return json(
    { ok: true, csrfToken: cfg.auth.csrfToken },
    { headers: { 'set-cookie': buildSessionCookie(token) } },
  );
};

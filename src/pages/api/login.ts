import type { APIRoute } from 'astro';
import { getConfig, updateAuth, audit } from '~/lib/config';
import { verifyPassword, createSessionToken, buildSessionCookie, checkRateLimit, generateToken } from '~/lib/auth';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const cfg = await getConfig();
  const ip = locals.clientIp || clientAddress || 'unknown';

  // Rate limit (configurable: defaults to 30 attempts / 60s per IP).
  const rl = checkRateLimit(
    `login:${ip}`,
    cfg.security.auth.rateLimitMax,
    cfg.security.auth.rateLimitWindowSec,
  );
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

  if (!cfg.auth) {
    return error('Auth no inicializado. Revisá la configuración.', 500);
  }
  const ok = await verifyPassword(body.password, cfg.auth.passwordHash);
  if (!ok) {
    await audit('login_fail', `ip=${ip}`);
    return error('Password incorrecto', 401);
  }

  const token = createSessionToken();
  let csrfToken = cfg.auth.csrfToken;

  // Optionally rotate CSRF token on successful login (config-driven).
  if (cfg.security.session.rotateCsrfOnLogin) {
    csrfToken = generateToken(32);
    await updateAuth(cfg.auth.passwordHash, csrfToken);
  }

  await audit('login_ok', `ip=${ip}`);
  return json(
    { ok: true, csrfToken },
    { headers: { 'set-cookie': await buildSessionCookie(token) } },
  );
};

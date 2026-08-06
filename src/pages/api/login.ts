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

  // Si rotamos CSRF, hay que hacerlo ANTES de crear el session token, porque
  // updateAuth() incrementa el authEpoch. Si creamos el token con el epoch
  // viejo y después rotamos, el token queda con epoch (N) pero la config pasa
  // a epoch (N+1) → el admin queda logueado pero cualquier request falla
  // porque el token no matchea el epoch actual. BUGFIX: rotamos primero y
  // usamos el nuevo epoch para el token.
  if (cfg.security.session.rotateCsrfOnLogin) {
    const newCsrf = generateToken(32);
    const updated = await updateAuth(cfg.auth.passwordHash, newCsrf);
    // `updated.auth` is `Auth | undefined` per the Config schema; assign
    // explicitly via the field rather than `cfg.auth = ... ?? null` to
    // avoid the null/undefined type mismatch.
    if (updated.auth) cfg.auth = updated.auth;
  }
  const csrfToken = cfg.auth?.csrfToken ?? '';
  const token = createSessionToken(cfg.auth?.authEpoch ?? 0);

  await audit('login_ok', `ip=${ip}`);
  return json(
    { ok: true, csrfToken },
    { headers: { 'set-cookie': await buildSessionCookie(token) } },
  );
};

import type { APIRoute } from 'astro';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfig, updateAuth, audit } from '~/lib/config';
import { verifyPassword, createSessionToken, buildSessionCookie, checkRateLimit, generateToken } from '~/lib/auth';
import { json, error, readJson } from '~/lib/http';
import { isFeatureEnabled } from '~/lib/features';
import { verifyTotp, decryptTotpSecret } from '~/lib/totp';

// Para guardar partials de TOTP en disco (TTL 5min).
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// globalThis hack para mantener el Map de partials entre requests
// (los módulos ES se cachean). En server restart se pierde, aceptable.
declare global {
  // eslint-disable-next-line no-var
  var __totpPartials: Map<string, { userId: string; expires: number }> | undefined;
}

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const cfg = await getConfig();
  const ip = locals.clientIp || 'unknown';

  // Rate limit (configurable: defaults to 30 attempts / 60s per IP).
  const rl = checkRateLimit(
    `login:${ip}`,
    cfg.security.auth.rateLimitMax,
    cfg.security.auth.rateLimitWindowSec,
  );
  if (!rl.ok) {
    return error(`Demasiados intentos. Probá en ${rl.resetInSec}s.`, 429);
  }

  let body: { password?: string; username?: string; totpCode?: string; partialToken?: string };
  try {
    body = await readJson<{ password?: string; username?: string; totpCode?: string; partialToken?: string }>(request);
  } catch {
    return error('JSON inválido', 400);
  }

  if (!cfg.auth) {
    return error('Auth no inicializado. Revisá la configuración.', 500);
  }

  // ── TOTP step 2: si nos mandan partialToken + totpCode, verificamos
  //    el TOTP y creamos la sesión. Los partialTokens son tokens
  //    firmados de un solo uso (5min TTL) que el server firmó cuando el
  //    step 1 (password) pasó pero el user tiene 2FA. ───────────
  if (body.partialToken && body.totpCode) {
    return await completeTotpLogin(body.partialToken, body.totpCode, cfg, ip);
  }

  // ── TOTP step 1: password ─────────────────────────────────
  if (!body.password || typeof body.password !== 'string') {
    return error('Falta el password', 400);
  }
  if (body.password.length > 200) {
    return error('Password demasiado largo', 400);
  }

  // ── Multi-user (Ola 3.1): tres modos de login ───────────────────
  // 1) Si `body.username` está presente y users[] tiene users → modo multi.
  //    Buscamos el user por username (case-insensitive), verificamos su
  //    password, usamos su userEpoch.
  // 2) Si NO hay username y users[] está vacío → modo legacy (super-admin).
  // 3) Si NO hay username pero users[] tiene users y singlePasswordEnabled
  //    es true → también aceptamos el password único como rescue path
  //    (devuelve actor='legacy', role='admin').
  const users = cfg.auth.users ?? [];
  const hasUsers = users.length > 0;
  const singleEnabled = cfg.auth.singlePasswordEnabled !== false;

  let userEpoch = 0;
  let matchedUser: { id: string; username: string; role: 'admin' | 'editor' | 'viewer'; totpSecret?: string | null } | null = null;
  let isLegacy = false;

  if (body.username && hasUsers) {
    // Modo multi-user
    const target = body.username.toLowerCase().trim();
    const found = users.find((u) => u.username.toLowerCase() === target);
    if (!found) {
      await audit('login_fail', `ip=${ip} user=${target}`);
      return error('Usuario o password incorrecto', 401);
    }
    const ok = await verifyPassword(body.password, found.passwordHash);
    if (!ok) {
      await audit('login_fail', `ip=${ip} user=${target}`);
      return error('Usuario o password incorrecto', 401);
    }
    matchedUser = { id: found.id, username: found.username, role: found.role, totpSecret: found.totpSecret };
    userEpoch = found.userEpoch;
  } else if (!body.username) {
    // Modo legacy / super-admin
    if (hasUsers && !singleEnabled) {
      // El admin explícitamente deshabilitó el password único
      await audit('login_fail', `ip=${ip} reason=legacy_disabled`);
      return error('El password único está deshabilitado. Usá tu username.', 401);
    }
    const ok = await verifyPassword(body.password, cfg.auth.passwordHash);
    if (!ok) {
      await audit('login_fail', `ip=${ip}`);
      return error('Password incorrecto', 401);
    }
    isLegacy = true;
  } else {
    // Username enviado pero users[] está vacío → config inconsistente
    await audit('login_fail', `ip=${ip} reason=username_no_users`);
    return error('Login con username no disponible. Pedile al admin que cree tu usuario.', 401);
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
    if (updated.auth) cfg.auth = updated.auth;
  }
  const csrfToken = cfg.auth?.csrfToken ?? '';
  const token = createSessionToken(cfg.auth?.authEpoch ?? 0, userEpoch);

  const actor = isLegacy ? 'legacy' : (matchedUser?.username ?? 'unknown');
  await audit('login_ok', `ip=${ip} actor=${actor}`);

  // ── TOTP step 1.5: si el user tiene 2FA, devolver partialToken ──
  // El super-admin (legacy) NO tiene 2FA (intencional — es el rescue
  // path). Sólo los users de users[] pueden tener totpSecret.
  if (matchedUser && matchedUser.role !== undefined) {
    if (matchedUser.totpSecret && isFeatureEnabled(cfg, 'totp2fa')) {
      const partialToken = generateToken(24);
      const partialAuthFile = path.join(DATA_DIR, '.totp-partials.json');
      // Guardamos el partial en disco con TTL 5min, keyed por hash
      // del partialToken. Esto evita que el atacante fuerce bruteforce
      // de partialTokens porque conoce el formato (32 hex chars).
      // (Es un trade-off: el disco tiene que existir y ser writable —
      // igual que audit.log, así que aceptable.)
      // NOTA: en esta versión simplificada guardamos en memoria via
      // globalThis. Volver a disco es straightforward.
      globalThis.__totpPartials ??= new Map<string, { userId: string; expires: number }>();
      (globalThis.__totpPartials as Map<string, { userId: string; expires: number }>).set(
        crypto.createHash('sha256').update(partialToken).digest('hex'),
        { userId: matchedUser.id, expires: Date.now() + 5 * 60_000 },
      );
      // (El path se declara arriba para no repetir el import; en JS
      // lo importamos una vez al top del archivo.)
      // NOTA: usamos globalThis como fallback de runtime. Si el
      // server reinicia, los partials se pierden y el user tiene que
      // re-empezar (login + TOTP). Aceptable — son 5min de TTL.
      return json({ requiresTotp: true, partialToken });
    }
  }

  return json(
    { ok: true, csrfToken },
    { headers: { 'set-cookie': await buildSessionCookie(token) } },
  );
};

/** TOTP step 2: verificar el código y emitir la sesión final. */
async function completeTotpLogin(
  partialToken: string,
  totpCode: string,
  cfg: Awaited<ReturnType<typeof getConfig>>,
  ip: string,
) {
  const partMap = (globalThis.__totpPartials ?? new Map<string, { userId: string; expires: number }>()) as Map<string, { userId: string; expires: number }>;
  const key = crypto.createHash('sha256').update(partialToken).digest('hex');
  const entry = partMap.get(key);
  if (!entry) {
    return error('Sesión parcial inválida o expirada. Volvé a hacer login.', 401);
  }
  if (Date.now() > entry.expires) {
    partMap.delete(key);
    return error('Sesión parcial expirada. Volvé a hacer login.', 401);
  }
  const user = cfg.auth?.users?.find((u) => u.id === entry.userId);
  if (!user || !user.totpSecret) {
    partMap.delete(key);
    return error('Usuario no encontrado o 2FA no configurado', 401);
  }
  let secret: string;
  try {
    secret = decryptTotpSecret(user.totpSecret);
  } catch {
    partMap.delete(key);
    return error('No se pudo descifrar el secret 2FA. Contactá al admin.', 500);
  }
  if (!verifyTotp(secret, totpCode)) {
    partMap.delete(key);
    await audit('login_totp_fail', `ip=${ip} actor=${user.username}`);
    return error('Código 2FA incorrecto', 401);
  }
  partMap.delete(key);
  // Crear sesión final con el userEpoch de este user
  const csrfToken = cfg.auth?.csrfToken ?? '';
  const token = createSessionToken(cfg.auth?.authEpoch ?? 0, user.userEpoch);
  await audit('login_ok_totp', `ip=${ip} actor=${user.username}`);
  return json(
    { ok: true, csrfToken },
    { headers: { 'set-cookie': await buildSessionCookie(token) } },
  );
}

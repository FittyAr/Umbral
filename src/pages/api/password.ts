import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getConfig, updateAuth, audit } from '~/lib/config';
import {
  hashPassword,
  generateToken,
  createSessionToken,
  buildSessionCookie,
  csrfForToken,
  LEGACY_SUBJECT,
} from '~/lib/auth';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  const minLen = cfg.security.auth.minPasswordLength;

  // minLen=0 → sin mínimo (respeta la doc del schema). 1+ → al menos N chars.
  // Mantenemos 1 char como piso absoluto — un password vacío siempre fue inválido.
  const effectiveMin = minLen === 0 ? 1 : minLen;

  const BodySchema = z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z
      .string()
      .min(effectiveMin, minLen === 0 ? 'Password no puede estar vacío' : `Mínimo ${minLen} caracteres`)
      .max(200),
  });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await readJson(request));
  } catch (err) {
    return error((err as Error).message, 400);
  }

  if (!cfg.auth) return error('Auth no inicializado', 500);

  // bcryptjs como default import (interop). El `await import('bcryptjs')`
  // previo retornaba el namespace CJS sin default export visible, así que
  // `bcrypt.compare` daba undefined. Con import estático funciona.
  const ok = await bcrypt.compare(body.currentPassword, cfg.auth.passwordHash);
  if (!ok) return error('Password actual incorrecto', 401);

  const newHash = await hashPassword(body.newPassword);
  const newCsrf = generateToken(32);
  const updated = await updateAuth(newHash, newCsrf);
  await audit('password_change');
  // updateAuth sube el authEpoch y cierra TODAS las sesiones, incluida la
  // de quien cambió la password: se le emite una nueva. Es el password del
  // super-admin, así que la sesión nueva es legacy.
  const token = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: updated.auth?.authEpoch ?? 0 });
  return json(
    { ok: true, csrfToken: csrfForToken(token, updated.auth?.csrfToken ?? '') },
    { headers: { 'set-cookie': await buildSessionCookie(token) } },
  );
};

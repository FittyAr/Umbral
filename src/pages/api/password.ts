import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getConfig, updateAuth, audit } from '~/lib/config';
import { hashPassword, generateToken } from '~/lib/auth';
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

  const bcrypt = await import('bcryptjs');
  const ok = await bcrypt.compare(body.currentPassword, cfg.auth.passwordHash);
  if (!ok) return error('Password actual incorrecto', 401);

  const newHash = await hashPassword(body.newPassword);
  const newCsrf = generateToken(32);
  await updateAuth(newHash, newCsrf);
  await audit('password_change');
  return json({ ok: true, csrfToken: newCsrf });
};

import type { APIRoute } from 'astro';
import { hashPassword } from '~/lib/auth';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth?.isAuthenticated || !auth?.isAdmin) {
    return error('No autorizado', 401);
  }

  const body = await readJson<{ password?: string }>(request);
  const password = body.password;
  if (!password || typeof password !== 'string' || password.length === 0) {
    return error('Password inválido', 400);
  }

  const hash = await hashPassword(password);
  return json({ ok: true, hash });
};

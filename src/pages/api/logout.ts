import type { APIRoute } from 'astro';
import { clearSessionCookie } from '~/lib/auth';
import { audit } from '~/lib/config';
import { json } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async () => {
  await audit('logout');
  return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } });
};

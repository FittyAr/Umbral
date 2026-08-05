import type { APIRoute } from 'astro';
import { json } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  return json({ status: 'ok', uptime: process.uptime(), ts: Date.now() });
};

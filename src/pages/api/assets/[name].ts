import type { APIRoute } from 'astro';
import { readAsset } from '~/lib/upload';
import { applySecurityHeaders } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) return new Response('Not found', { status: 404 });
  const result = await readAsset(name);
  if (!result) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', result.mime);
  headers.set('cache-control', 'public, max-age=3600');
  applySecurityHeaders(headers);
  // Allow inline SVG only for trusted (own) origin
  headers.set('x-content-type-options', 'nosniff');
  return new Response(result.buffer, { headers });
};

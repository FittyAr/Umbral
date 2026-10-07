import type { APIRoute } from 'astro';
import { readAsset } from '~/lib/upload';
import { applySecurityHeaders } from '~/lib/http';
import { SVG_RESPONSE_CSP } from '~/lib/svg-sanitize';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) return new Response('Not found', { status: 404 });
  const result = await readAsset(name);
  if (!result) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', result.mime);
  headers.set('cache-control', 'public, max-age=3600');
  // Los SVG subidos se sanitizan, pero abiertos como documento además van
  // aislados (sin scripts, sin acceso al origen).
  if (result.mime === 'image/svg+xml') headers.set('content-security-policy', SVG_RESPONSE_CSP);
  applySecurityHeaders(headers);
  headers.set('x-content-type-options', 'nosniff');
  // Cast Buffer → BodyInit. Node's Buffer extends Uint8Array which is a
  // valid BodyInit; the type mismatch is from lib.dom's narrower BodyInit
  // union that predates the Node Buffer type.
  return new Response(result.buffer as unknown as BodyInit, { headers });
};

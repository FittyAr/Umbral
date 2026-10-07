import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { applySecurityHeaders } from '~/lib/http';
import { SVG_RESPONSE_CSP } from '~/lib/svg-sanitize';

export const prerender = false;

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ICON_PACKS_DIR = path.join(DATA_DIR, 'icon-packs');

export const GET: APIRoute = async ({ params }) => {
  const reqPath = params.path;
  if (!reqPath) {
    return new Response('Not found', { status: 404 });
  }

  // Prevenir Directory Traversal
  const normalized = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    return new Response('Forbidden', { status: 403 });
  }

  const svgFileName = normalized.endsWith('.svg') ? normalized : `${normalized}.svg`;
  const filePath = path.join(ICON_PACKS_DIR, svgFileName);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const headers = new Headers();
    headers.set('content-type', 'image/svg+xml; charset=utf-8');
    // Un día, no "immutable": reinstalar un pack cambia el contenido con el
    // mismo nombre.
    headers.set('cache-control', 'public, max-age=86400');
    headers.set('x-content-type-options', 'nosniff');
    // Abierto como documento, el SVG queda aislado: sin scripts y sin acceso
    // al origen (cubre también packs instalados antes de sanitizar).
    headers.set('content-security-policy', SVG_RESPONSE_CSP);
    applySecurityHeaders(headers);

    return new Response(content, { headers });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return new Response('Icon not found', { status: 404 });
    }
    return new Response('Error loading icon', { status: 500 });
  }
};

import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import QRCode from 'qrcode';

export const prerender = false;

/**
 * GET /api/qr/:cardId.png
 *
 * Devuelve un PNG (o SVG si `?format=svg`) con el QR de la URL de la card.
 * Útil para imprimir posters, agregar a Notion, etc.
 *
 * Query params:
 *   - size=200         → tamaño en px (default 200, min 64, max 1024)
 *   - margin=2         → margen en módulos (default 2, min 0, max 10)
 *   - format=png|svg   → default png
 *
 * Feature gate: requiere `features.qr.enabled === true`. Si la feature
 * está apagada, devuelve 404. Cero overhead cuando está apagada.
 *
 * Si la card no existe → 404.
 * Si la card.kind === 'note' → 404 (las notas no tienen URL que valga la
 * pena codificar; mejor renderizar la URL del "punto de anclaje" si la
 * tiene, pero por ahora 404).
 *
 * NO requiere auth (es público, como el home). La URL del QR es la misma
 * URL pública de la card, no hay info sensible.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const cardId = String(params.cardId || '').replace(/\.png$/i, '');
  if (!cardId) {
    return new Response('Falta el cardId', { status: 400 });
  }

  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'qr')) {
    return new Response('QR codes no habilitados. Activalos en Admin → Avanzado → Features.', { status: 404 });
  }

  let targetUrl = url.searchParams.get('text') || '';
  if (!targetUrl) {
    const card = cfg.cards.find((c) => c.id === cardId);
    if (!card) {
      return new Response('Card no encontrada', { status: 404 });
    }
    if (card.kind === 'note' || !card.url) {
      return new Response('Esta card no tiene URL para codificar', { status: 400 });
    }

    // Resolver URL absoluta. Si la URL es relativa (/docs), pre-pendemos
    // BASE_URL del request (que el admin seteó via env) o el origin del
    // request. Así el QR escaneado desde el celular abre la URL correcta.
    targetUrl = card.url;
    if (targetUrl.startsWith('/')) {
      const base = process.env.BASE_URL || url.origin;
      targetUrl = new URL(targetUrl, base).toString();
    }
  }

  const size = Math.max(64, Math.min(1024, Number(url.searchParams.get('size')) || 200));
  const margin = Math.max(0, Math.min(10, Number(url.searchParams.get('margin')) || 2));
  const format = url.searchParams.get('format') || 'png';

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(targetUrl, { type: 'svg', width: size, margin });
      return new Response(svg, {
        status: 200,
        headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=300' },
      });
    }
    const png = await QRCode.toBuffer(targetUrl, { width: size, margin, type: 'png' });
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' },
    });
  } catch (err) {
    return new Response(`Error generando QR: ${(err as Error).message}`, { status: 500 });
  }
};
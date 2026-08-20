import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { isFeatureEnabled } from '~/lib/features';
import { getConfig } from '~/lib/config';
import { getSamples, getCardSummary, getCardIdsWithSamples, sparklineSvg } from '~/lib/metrics';

export const prerender = false;

/**
 * GET /api/metrics
 *
 * Query params:
 *   - id=cardId  → devuelve las últimas N samples de UNA card
 *   - range=24h   → filtra por rango temporal (default 24h)
 *   - limit=100   → max de samples a devolver (default 100, cap 500)
 *   - summary=1   → devuelve solo summary (avg, p95, max, lastOk)
 *   - svg=1       → devuelve path SVG inline (sparkline) en lugar de JSON
 *
 * Sin id: devuelve la lista de cards que tienen samples + summary global
 * (útil para el dashboard del admin).
 *
 * Feature gate: requiere `features.metrics.enabled === true`. Si la
 * feature está apagada, devuelve 404. Cero overhead cuando está apagada.
 *
 * Auth: requiere sesión admin (heredado del middleware).
 */
export const GET: APIRoute = async ({ url }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'metrics')) {
    return error('Métricas no habilitadas. Activalas en Admin → Avanzado → Features.', 404);
  }

  const id = url.searchParams.get('id');
  const summary = url.searchParams.get('summary') === '1';
  const svgOnly = url.searchParams.get('svg') === '1';
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
  const range = url.searchParams.get('range') || '24h';
  // Convertir range a from (ISO)
  const rangeMs = parseRange(range);
  const from = rangeMs > 0 ? new Date(Date.now() - rangeMs).toISOString() : undefined;

  // Si pide SVG, devolver texto plano (no JSON) — más simple para
  // inyectar con x-html en Alpine.
  if (svgOnly && id) {
    const samples = getSamples(id, { limit, from });
    const svg = sparklineSvg([...samples].reverse(), { width: 80, height: 20, color: '#94a3b8' });
    return new Response(svg, {
      status: 200,
      headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-cache' },
    });
  }

  if (id) {
    if (summary) {
      const s = getCardSummary(id);
      return json(s || { count: 0, avgMs: 0, maxMs: 0, p95Ms: 0, lastOk: null, lastTs: null });
    }
    return json({ cardId: id, samples: getSamples(id, { limit, from }) });
  }

  // Sin id: lista de cards con samples
  const cards = getCardIdsWithSamples().map((cid) => {
    const s = getCardSummary(cid);
    return { cardId: cid, ...(s || {}) };
  });
  return json({ cards });
};

function parseRange(range: string): number {
  const m = /^(\d+)([smhd])$/.exec(range);
  if (!m) return 24 * 60 * 60 * 1000; // default 24h
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}
/**
 * Métricas de latencia (opt-in: features.metrics).
 *
 * Ring buffer en memoria por card. Cada check de /api/status registra
 * una muestra (timestamp + latenciaMs + ok). El ring buffer es bounded
 * — se dropean las muestras más viejas cuando se llega al límite.
 *
 * No persistimos a disco en esta versión (la opción persistToDisk del
 * schema queda como no-op por ahora, preparada para una iteración
 * futura). Justificación: el ring buffer en memoria es suficiente para
 * sparklines en el admin (que es el caso de uso principal). Si el
 * admin quiere historial largo, puede scrapear /api/metrics
 * periódicamente.
 *
 * Performance: O(1) amortizado para record (push + shift si está full).
 * O(n) para getSamples. El ring default es 100 samples por card (~1.5h
 * con check cada 60s), que es suficiente para ver tendencias.
 */

import { isFeatureEnabled } from '~/lib/features';
import { getConfig } from '~/lib/config';
import type { Config } from '~/lib/schema';

export interface MetricSample {
  /** ISO timestamp UTC. */
  ts: string;
  /** Latencia en ms. Si ok=false, queda registrada igual para detectar
   *  "se cayó y se recuperó" como pico de latencia. */
  latencyMs: number;
  /** Resultado del check. false dispara badge ámbar/rojo + (potencialmente)
   *  webhooks. */
  ok: boolean;
}

const DEFAULT_BUFFER = 100;
const sampleBuffers = new Map<string, MetricSample[]>();

/** Limpia el buffer de una card (o todos). Útil al borrar la card o
 *  reiniciar config. */
export function clearMetrics(cardId?: string) {
  if (cardId) sampleBuffers.delete(cardId);
  else sampleBuffers.clear();
}

/** Registra una muestra para una card. Crea el buffer si no existe.
 *  Si el feature está apagado, no registra (defense in depth — evita
 *  acumular basura si alguien lo desactiva a futuro). */
export function recordSample(cardId: string, sample: MetricSample) {
  void (async () => {
    const cfg = await getConfig();
    if (!isFeatureEnabled(cfg, 'metrics')) return;
    const limit = DEFAULT_BUFFER;
    let buf = sampleBuffers.get(cardId);
    if (!buf) {
      buf = [];
      sampleBuffers.set(cardId, buf);
    }
    buf.push(sample);
    if (buf.length > limit) buf.shift();
  })();
}

/** Devuelve las últimas N muestras de una card. Si no hay samples, [].
 *  Opcionalmente filtra por rango temporal (from/to ISO). */
export function getSamples(cardId: string, opts: { limit?: number; from?: string; to?: string } = {}): MetricSample[] {
  const buf = sampleBuffers.get(cardId);
  if (!buf) return [];
  let out = buf;
  if (opts.from) {
    const fromMs = new Date(opts.from).getTime();
    out = out.filter((s) => new Date(s.ts).getTime() >= fromMs);
  }
  if (opts.to) {
    const toMs = new Date(opts.to).getTime();
    out = out.filter((s) => new Date(s.ts).getTime() <= toMs);
  }
  // Reverse para newest-first, igual que audit log.
  out = [...out].reverse();
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

/** Resumen agregado: latency promedio, p95, último valor, max.
 *  Útil para el dashboard del admin. */
export function getCardSummary(cardId: string): {
  count: number;
  avgMs: number;
  maxMs: number;
  p95Ms: number;
  lastOk: boolean | null;
  lastTs: string | null;
} | null {
  const buf = sampleBuffers.get(cardId);
  if (!buf || buf.length === 0) return null;
  const lats = buf.map((s) => s.latencyMs).sort((a, b) => a - b);
  const sum = lats.reduce((a, b) => a + b, 0);
  const p95Idx = Math.floor(lats.length * 0.95);
  return {
    count: buf.length,
    avgMs: Math.round(sum / buf.length),
    maxMs: lats[lats.length - 1],
    p95Ms: lats[p95Idx] ?? lats[lats.length - 1] ?? 0,
    lastOk: buf[buf.length - 1]?.ok ?? null,
    lastTs: buf[buf.length - 1]?.ts ?? null,
  };
}

/** Lista de cards que tienen samples. Útil para iterar en el admin. */
export function getCardIdsWithSamples(): string[] {
  return Array.from(sampleBuffers.keys());
}

/** Genera un path SVG inline de un sparkline. Devuelve string vacío si
 *  no hay samples suficientes (mínimo 2). El path es polilínea simple
 *  normalizada al viewBox. No usamos libs (todo inline). */
export function sparklineSvg(samples: MetricSample[], opts: { width?: number; height?: number; color?: string } = {}): string {
  const width = opts.width ?? 80;
  const height = opts.height ?? 20;
  const color = opts.color ?? 'currentColor';
  if (samples.length < 2) return '';
  // Normalizar latencias al viewBox
  const lats = samples.map((s) => s.latencyMs);
  const min = Math.min(...lats);
  const max = Math.max(...lats, min + 1);
  const stepX = width / (samples.length - 1);
  const points: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    const x = (i * stepX).toFixed(1);
    const y = (height - ((lats[i] - min) / (max - min)) * height).toFixed(1);
    points.push(`${x},${y}`);
  }
  // Marca los puntos failed con un circle rojo al final del path
  const lastFailed = samples.findLast?.((s) => !s.ok) ?? [...samples].reverse().find((s) => !s.ok);
  const failedMarker = lastFailed ? `<circle cx="${(samples.indexOf(lastFailed) * stepX).toFixed(1)}" cy="${(height - ((lastFailed.latencyMs - min) / (max - min)) * height).toFixed(1)}" r="1.8" fill="#f87171" />` : '';
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="vertical-align: middle"><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />${failedMarker}</svg>`;
}
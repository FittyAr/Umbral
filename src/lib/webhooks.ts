/**
 * Webhook engine (opt-in: features.webhooks).
 *
 * Dispara webhooks cuando una card con healthCheck=true cambia de estado:
 * - healthy → failing: dispara `health_fail` (después de N fallas consecutivas)
 * - failing → healthy: dispara `health_recover`
 *
 * Estado en memoria (no persistente). Si el server se reinicia, se pierde
 * el tracking de fallas consecutivas. Esto es aceptable para MVP — el próximo
 * check vuelve a empezar de 0 y el user puede configurar un minFailures
 * adecuado a su cadencia de checks. La doc en el admin advierte esto.
 *
 * Por qué in-memory: si persistiéramos a disco, cada restart tomaría
 * minutos en deployments con muchas cards. Y el estado "stale" (más viejo
 * que el último check) es justamente el caso donde queremos re-disparar
 * la alerta — la falla probablemente sigue.
 *
 * Seguridad:
 * - SSRF: los POST van por `safeFetch` (valida la IP de conexión, sin seguir
 *   redirects). Respeta `allowInternalHosts` (Gotify/ntfy en la LAN); la
 *   metadata de la nube queda bloqueada siempre.
 * - Sin secretos en logs: sólo logueamos el resultado del POST (status
 *   code) y el webhook id, no la URL completa ni el payload.
 */

import { isFeatureEnabled } from '~/lib/features';
import { getConfig } from '~/lib/config';
import { audit } from '~/lib/config';
import { getActiveWindowsForCard } from '~/lib/maintenance';
import type { Config, Webhook, WebhookEvent } from '~/lib/schema';
import { safeFetch } from './safe-fetch.ts';

export interface CheckResult {
  cardId: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  url: string;
  title: string;
}

/** Estado por card: cuántas fallas consecutivas lleva. */
const failureCounters = new Map<string, { count: number; lastFailing: boolean; lastCheckTs: number }>();

/** Última notificación por webhook+card+evento (para el cooldown). */
const lastFired = new Map<string, { ts: number; event: WebhookEvent; cardId: string }>();

/** Webhook+card que ya notificaron la falla y esperan el recover. */
const notifiedFailing = new Set<string>();

/** Limpia estado de una card. Usado al borrar la card o reiniciar config. */
export function clearWebhookState(cardId?: string) {
  if (cardId) {
    failureCounters.delete(cardId);
    for (const key of notifiedFailing) if (key.endsWith(`:${cardId}`)) notifiedFailing.delete(key);
  } else {
    failureCounters.clear();
    lastFired.clear();
    notifiedFailing.clear();
  }
}

/** Payload genérico que enviamos a todos los webhooks. Cada preset
 *  (Slack, Discord, ntfy) lo adapta a su formato esperado, pero
 *  exponemos el JSON crudo para webhooks custom.
 *
 *  Decisión: payload común + header X-Umbral-Event para que el receiver
 *  pueda enrutar sin parsear el body. */
export interface WebhookPayload {
  event: WebhookEvent;
  card: {
    id: string;
    title: string;
    url: string;
  };
  status: {
    ok: boolean;
    code?: number;
    latencyMs?: number;
    error?: string;
  };
  consecutiveFailures: number;
  threshold: number;
  timestamp: string; // ISO
  portal: {
    name: string; // companyName
  };
}

function buildPayload(result: CheckResult, event: WebhookEvent, consecutive: number, threshold: number, portalName: string): WebhookPayload {
  return {
    event,
    card: { id: result.cardId, title: result.title, url: result.url },
    status: {
      ok: result.ok,
      code: result.status,
      latencyMs: result.latencyMs,
      error: result.ok ? undefined : (result.status ? `HTTP ${result.status}` : 'request failed'),
    },
    consecutiveFailures: consecutive,
    threshold,
    timestamp: new Date().toISOString(),
    portal: { name: portalName },
  };
}

/** Adapta el payload al formato del preset. Si el webhook es custom
 *  (presetId === 'custom' o no matchea ninguno), mandamos el JSON crudo
 *  con un header X-Umbral-Event para que el receiver identifique el tipo.
 *
 *  Esta función es PURA — sólo transforma el body. La decisión de
 *  cuál preset usar se hace en otro lado. */
export function adaptPayload(
  preset: string,
  payload: WebhookPayload,
  url?: string,
): { body: string; contentType: string; headers: Record<string, string>; url?: string } {
  const baseHeaders: Record<string, string> = {
    'X-Umbral-Event': payload.event,
    'X-Umbral-Card': payload.card.id,
    'User-Agent': 'Umbral-Webhook/1.0',
  };
  if (preset === 'slack') {
    // Slack incoming webhook format: { text: "..." }
    const statusEmoji = payload.status.ok ? '✅' : '❌';
    const text = payload.event === 'health_fail'
      ? `${statusEmoji} *${payload.card.title}* falló (HTTP ${payload.status.code ?? '?'}, ${payload.consecutiveFailures}/${payload.threshold} checks)`
      : `${statusEmoji} *${payload.card.title}* se recuperó (HTTP ${payload.status.code ?? '?'})`;
    return { body: JSON.stringify({ text }), contentType: 'application/json', headers: baseHeaders };
  }
  if (preset === 'discord') {
    // Discord webhook: { content: "..." }
    const statusEmoji = payload.status.ok ? '✅' : '❌';
    const content = payload.event === 'health_fail'
      ? `${statusEmoji} **${payload.card.title}** falló (HTTP ${payload.status.code ?? '?'})`
      : `${statusEmoji} **${payload.card.title}** se recuperó`;
    return { body: JSON.stringify({ content }), contentType: 'application/json', headers: baseHeaders };
  }
  if (preset === 'mattermost') {
    // Mattermost incoming webhook: { text: "..." } (idéntico a Slack)
    const statusEmoji = payload.status.ok ? '✅' : '❌';
    const text = payload.event === 'health_fail'
      ? `${statusEmoji} **${payload.card.title}** falló (HTTP ${payload.status.code ?? '?'})`
      : `${statusEmoji} **${payload.card.title}** se recuperó`;
    return { body: JSON.stringify({ text }), contentType: 'application/json', headers: baseHeaders };
  }
  if (preset === 'ntfy') {
    // ntfy publica JSON en la raíz del server con el topic en el body: la URL
    // del webhook es la del topic (https://ntfy.sh/mi-topic), así que se
    // separan. El título va en el body y no en un header: los headers no
    // aceptan emojis ni acentos y el envío fallaba.
    const title = payload.event === 'health_fail' ? `❌ ${payload.card.title} falló` : `✅ ${payload.card.title} OK`;
    const body = payload.event === 'health_fail'
      ? `HTTP ${payload.status.code ?? '?'} · ${payload.consecutiveFailures}/${payload.threshold} checks · ${payload.card.url}`
      : `Recuperado · HTTP ${payload.status.code ?? '?'} · ${payload.card.url}`;
    let topic = 'umbral';
    let target = url;
    if (url) {
      try {
        const u = new URL(url);
        const segments = u.pathname.split('/').filter(Boolean);
        if (segments.length > 0) topic = segments.pop()!;
        u.pathname = `/${segments.join('/')}`;
        target = u.toString();
      } catch {
        // URL inválida: la valida el schema; se manda tal cual
      }
    }
    return {
      body: JSON.stringify({ topic, title, message: body, tags: ['umbral', payload.event === 'health_fail' ? 'warning' : 'white_check_mark'], priority: payload.event === 'health_fail' ? 4 : 2 }),
      contentType: 'application/json',
      headers: baseHeaders,
      url: target,
    };
  }
  if (preset === 'gotify') {
    // Gotify: POST JSON con message + title + priority.
    const title = payload.event === 'health_fail' ? `Umbral: ${payload.card.title} falló` : `Umbral: ${payload.card.title} OK`;
    const message = payload.event === 'health_fail'
      ? `HTTP ${payload.status.code ?? '?'} · ${payload.consecutiveFailures}/${payload.threshold} checks consecutivos\nURL: ${payload.card.url}`
      : `Recuperado · HTTP ${payload.status.code ?? '?'}`;
    return {
      body: JSON.stringify({ title, message, priority: payload.event === 'health_fail' ? 8 : 2 }),
      contentType: 'application/json',
      headers: baseHeaders,
    };
  }
  // 'custom' o cualquier otro: JSON crudo, sin transformar.
  return { body: JSON.stringify(payload), contentType: 'application/json', headers: baseHeaders };
}

/** POST al webhook con timeout corto. Devuelve { ok, status, error }. */
async function postWebhook(
  url: string,
  body: string,
  contentType: string,
  extraHeaders: Record<string, string>,
  allowInternal: boolean,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType, ...extraHeaders },
      body,
      allowInternal,
      // No seguir redirects: un 3xx no es una entrega.
      maxRedirects: 0,
      timeoutMs: 8000,
      // La respuesta no se usa: se lee poco y se descarta.
      maxBytes: 64 * 1024,
      truncate: true,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Procesa los resultados de un health check, actualiza contadores y
 *  dispara webhooks si corresponde. Llamado desde /api/status después
 *  de hacer los checks.
 *
 *  Máquina de estados por webhook y card:
 *  - `health_fail` cuando las fallas consecutivas llegan al `minFailures` de
 *    ESE webhook (antes se miraba `wasHealthy`, que desde la segunda falla
 *    era false, así que con el default de 3 la alerta nunca salía).
 *  - `health_recover` sólo si antes se notificó la falla.
 *
 *  Side effects: actualiza failureCounters + lastFired, puede hacer fetch
 *  salientes a los webhooks del admin. */
export async function processHealthResults(results: CheckResult[]): Promise<{ fired: number }> {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'webhooks')) return { fired: 0 };
  const webhooks = (cfg.webhooks?.items ?? []).filter((w) => w.enabled);
  if (webhooks.length === 0) return { fired: 0 };
  const allowInternal = cfg.security.network.allowInternalHosts !== false;

  let fired = 0;
  for (const result of results) {
    // En una ventana de mantenimiento no se manda health_fail (el admin sabe
    // que va a fallar); health_recover sí, para confirmar que volvió.
    const inMaintenance = (await getActiveWindowsForCard(result.cardId)).length > 0;
    const prev = failureCounters.get(result.cardId);
    const newCount = result.ok ? 0 : (prev?.lastFailing ? prev.count + 1 : 1);
    failureCounters.set(result.cardId, { count: newCount, lastFailing: !result.ok, lastCheckTs: Date.now() });

    for (const wh of webhooks) {
      const key = `${wh.id}:${result.cardId}`;
      let event: WebhookEvent | null = null;
      if (!result.ok) {
        if (newCount >= wh.minFailures && !notifiedFailing.has(key)) {
          // Cruzó el umbral de este webhook: se marca aunque no esté
          // suscripto a health_fail, para que el recover tenga sentido.
          notifiedFailing.add(key);
          if (!inMaintenance) event = 'health_fail';
        }
      } else if (notifiedFailing.has(key)) {
        notifiedFailing.delete(key);
        event = 'health_recover';
      }
      if (!event || !wh.events.includes(event)) continue;

      // Cooldown por webhook+card+evento.
      const cooldownKey = `${key}:${event}`;
      const last = lastFired.get(cooldownKey);
      if (last && Date.now() - last.ts < wh.cooldownMin * 60_000) continue;

      const payload = buildPayload(result, event, newCount, wh.minFailures, cfg.branding.companyName);
      const adapted = adaptPayload(wh.preset ?? 'custom', payload, wh.url);
      const sent = await postWebhook(adapted.url ?? wh.url, adapted.body, adapted.contentType, adapted.headers, allowInternal);
      lastFired.set(cooldownKey, { ts: Date.now(), event, cardId: result.cardId });
      if (sent.ok) {
        fired++;
        await audit('webhook_fired', `${wh.id} ${event} card=${result.cardId} status=${sent.status ?? '?'}`);
      } else {
        await audit('webhook_failed', `${wh.id} ${event} card=${result.cardId} error=${sent.error || `HTTP ${sent.status}`}`);
      }
    }
  }
  return { fired };
}

/** Para el endpoint /api/webhooks/test: manda un payload de ejemplo al
 *  webhook (sin pasar por el state machine). */
export async function testWebhook(url: string, preset = 'custom'): Promise<{ ok: boolean; status?: number; error?: string }> {
  const cfg = await getConfig();
  const allowInternal = cfg.security.network.allowInternalHosts !== false;
  const samplePayload: WebhookPayload = {
    event: 'health_fail',
    card: { id: 'test-card-id', title: 'Tarjeta de prueba', url: 'https://example.com' },
    status: { ok: false, code: 503, latencyMs: 1234, error: 'HTTP 503' },
    consecutiveFailures: 3,
    threshold: 3,
    timestamp: new Date().toISOString(),
    portal: { name: 'Umbral' },
  };
  const adapted = adaptPayload(preset, samplePayload, url);
  return postWebhook(adapted.url ?? url, adapted.body, adapted.contentType, adapted.headers, allowInternal);
}
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
 * - SSRF: bloqueamos loopback y private IPs antes de fetch (re-usa
 *   `resolveAndCheckUrl` de src/lib/ssrf).
 * - Sin secretos en logs: sólo logueamos el resultado del POST (status
 *   code) y el webhook id, no la URL completa ni el payload.
 */

import { isFeatureEnabled } from '~/lib/features';
import { getConfig } from '~/lib/config';
import { resolveAndCheckUrl } from '~/lib/ssrf';
import { audit } from '~/lib/config';
import { getActiveWindowsForCard } from '~/lib/maintenance';
import type { Config, Webhook, WebhookEvent } from '~/lib/schema';

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

/** Estado por webhook: cuándo fue la última notificación (para cooldown). */
const lastFired = new Map<string, { ts: number; event: WebhookEvent; cardId: string }>();

/** Limpia estado de una card. Usado al borrar la card o reiniciar config. */
export function clearWebhookState(cardId?: string) {
  if (cardId) {
    failureCounters.delete(cardId);
  } else {
    failureCounters.clear();
    lastFired.clear();
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
export function adaptPayload(preset: string, payload: WebhookPayload): { body: string; contentType: string; headers: Record<string, string> } {
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
    // ntfy: POST raw text o JSON, headers ntfy-* para metadata.
    const title = payload.event === 'health_fail' ? `❌ ${payload.card.title} falló` : `✅ ${payload.card.title} OK`;
    const body = payload.event === 'health_fail'
      ? `HTTP ${payload.status.code ?? '?'} · ${payload.consecutiveFailures}/${payload.threshold} checks · ${payload.card.url}`
      : `Recuperado · HTTP ${payload.status.code ?? '?'} · ${payload.card.url}`;
    return {
      body: JSON.stringify({ topic: 'umbral', title, message: body, tags: ['umbral', payload.event === 'health_fail' ? 'warning' : 'white_check_mark'], priority: payload.event === 'health_fail' ? 4 : 2 }),
      contentType: 'application/json',
      headers: { ...baseHeaders, 'X-Title': title },
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
async function postWebhook(url: string, body: string, contentType: string, extraHeaders: Record<string, string>): Promise<{ ok: boolean; status?: number; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000); // 8s — más que suficiente para webhooks
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType, ...extraHeaders },
      body,
      signal: ctrl.signal,
      // No seguir redirects para evitar bypass de SSRF
      redirect: 'manual',
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/** Procesa los resultados de un health check, actualiza contadores y
 *  dispara webhooks si corresponde. Llamado desde /api/status después
 *  de hacer los checks.
 *
 *  Side effects: actualiza failureCounters + lastFired, puede hacer fetch
 *  salientes a los webhooks del admin. */
export async function processHealthResults(results: CheckResult[]): Promise<{ fired: number }> {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'webhooks')) return { fired: 0 };
  const webhooks = (cfg.webhooks?.items ?? []).filter((w) => w.enabled);
  if (webhooks.length === 0) return { fired: 0 };

  let fired = 0;
  for (const result of results) {
    // Si la card está en una maintenance window activa, NO disparamos
    // webhooks — el admin sabe que va a fallar, no necesita notificaciones.
    // health_recover se sigue disparando para confirmar que volvió a OK.
    const inMaintenance = (await getActiveWindowsForCard(result.cardId)).length > 0;
    const prev = failureCounters.get(result.cardId);
    const wasFailing = prev?.lastFailing ?? false;
    const prevCount = prev?.count ?? 0;
    const newCount = result.ok ? 0 : (wasFailing ? prevCount + 1 : 1);
    failureCounters.set(result.cardId, { count: newCount, lastFailing: !result.ok, lastCheckTs: Date.now() });

    // Determinar si hay cambio de estado
    const wasHealthy = !wasFailing;
    const isHealthy = result.ok;
    let event: WebhookEvent | null = null;
    if (!wasHealthy && isHealthy) event = 'health_recover';
    else if (wasHealthy && !isHealthy && newCount >= (webhooks[0]?.minFailures ?? 3)) {
      // Recién cruzado el threshold. Sólo disparamos la primera vez que
      // cruzamos (no en cada check fallido después). El cooldown evita spam.
      event = 'health_fail';
    } else if (wasHealthy && !isHealthy) {
      // Sigue acumulando, todavía no llegó al threshold. Sin evento.
    }

    if (!event) continue;
    // Suprimir health_fail si la card está en mantenimiento (no spam durante deploys).
    // health_recover siempre se dispara — es la señal de "OK, volvimos".
    if (event === 'health_fail' && inMaintenance) {
      continue;
    }

    // Filtrar webhooks que listen a este evento
    const matching = webhooks.filter((w) => w.events.includes(event!));
    if (matching.length === 0) continue;

    // Threshold del primer webhook (asumimos mismo threshold para todos,
    // simplificación MVP). Si tienen thresholds distintos, podríamos
    // ajustar pero agrega complejidad.
    const threshold = matching[0].minFailures;

    for (const wh of matching) {
      // Cooldown
      const last = lastFired.get(wh.id);
      if (last && (Date.now() - last.ts) < wh.cooldownMin * 60_000) {
        continue; // todavía en cooldown
      }
      // SSRF guard
      const guard = await resolveAndCheckUrl(wh.url);
      if (!guard.ok) {
        // No se puede llegar al webhook (loopback, private IP, etc). Loguear.
        console.warn(`[umbral] webhook ${wh.id} blocked by SSRF guard: ${guard.reason}`);
        continue;
      }
      const payload = buildPayload(result, event, newCount, threshold, cfg.branding.companyName);
      // Para MVP: no guardamos qué preset usó el admin — el server manda
      // formato custom (JSON crudo) y el admin documenta que puede usar
      // un proxy como matterbridge o n8n para adaptar. Más simple que
      // pedirle al admin que seleccione el preset.
      // Si en el futuro queremos presets, agregamos un campo `preset` al
      // schema y lo usamos acá.
      const adapted = adaptPayload('custom', payload);
      const result2 = await postWebhook(wh.url, adapted.body, adapted.contentType, adapted.headers);
      lastFired.set(wh.id, { ts: Date.now(), event, cardId: result.cardId });
      if (result2.ok) {
        fired++;
        await audit('webhook_fired', `${wh.id} ${event} card=${result.cardId} status=${result2.status ?? '?'}`);
      } else {
        await audit('webhook_failed', `${wh.id} ${event} card=${result.cardId} error=${result2.error || `HTTP ${result2.status}`}`);
      }
    }
  }
  return { fired };
}

/** Para el endpoint /api/webhooks/test: manda un payload de ejemplo al
 *  webhook (sin pasar por el state machine). */
export async function testWebhook(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  // SSRF guard
  const guard = await resolveAndCheckUrl(url);
  if (!guard.ok) {
    return { ok: false, error: `URL bloqueada por SSRF guard: ${guard.reason}` };
  }
  const samplePayload: WebhookPayload = {
    event: 'health_fail',
    card: { id: 'test-card-id', title: 'Tarjeta de prueba', url: 'https://example.com' },
    status: { ok: false, code: 503, latencyMs: 1234, error: 'HTTP 503' },
    consecutiveFailures: 3,
    threshold: 3,
    timestamp: new Date().toISOString(),
    portal: { name: 'Umbral' },
  };
  const adapted = adaptPayload('custom', samplePayload);
  return postWebhook(url, adapted.body, adapted.contentType, adapted.headers);
}
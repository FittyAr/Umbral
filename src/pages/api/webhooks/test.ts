import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { isFeatureEnabled } from '~/lib/features';
import { testWebhook } from '~/lib/webhooks';
import { getConfig } from '~/lib/config';

export const prerender = false;

/**
 * POST /api/webhooks/test
 *
 * Body: { url: 'https://...' }
 * Manda un payload de ejemplo al webhook (sin pasar por el state
 * machine). El admin lo usa para verificar que su endpoint (Slack,
 * Discord, ntfy, Mattermost, Gotify, custom) responde bien al formato
 * que Umbral manda.
 *
 * Feature gate: requiere `features.webhooks.enabled === true`.
 * Auth: requiere sesión admin.
 *
 * Security:
 * - SSRF: el helper testWebhook() pasa por resolveAndCheckUrl() que
 *   bloquea loopback y private IPs. Mismo guard que /api/status.
 * - Si el admin quiere apuntar a un servicio interno (ej: Gotify
 *   corriendo en LAN), puede activar `security.network.allowInternalHosts`
 *   en Hardening. Por default está bloqueado.
 */
export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'webhooks')) {
    return error('Webhooks no habilitados. Activalos en Admin → Avanzado → Features.', 404);
  }

  let body: { url?: string } = {};
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return error('Falta el campo "url"', 400);
  }
  if (!/^https?:\/\//i.test(url)) {
    return error('URL debe empezar con http:// o https://', 400);
  }
  if (url.length > 500) {
    return error('URL demasiado larga (max 500 chars)', 400);
  }

  const result = await testWebhook(url);
  if (result.ok) {
    return json({ ok: true, status: result.status });
  }
  return json({ ok: false, status: result.status, error: result.error }, { status: 400 });
};
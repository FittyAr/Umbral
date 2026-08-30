import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Webhooks (opt-in: features.webhooks)
//
// Lista de webhooks a los que Umbral notifica cuando una card con
// healthCheck=true cambia de estado (de healthy → failing o vice versa).
// Opt-in: si features.webhooks.enabled === false, el engine NO se
// ejecuta aunque haya webhooks configurados (defense in depth).
//
// Cada webhook define:
// - id: identificador único (uuid v4)
// - name: label visible en el admin
// - url: endpoint HTTPS al que POSTear el payload
// - events: array de eventos que disparan este webhook (health_fail, health_recover)
// - minFailures: cuántas fallas consecutivas antes de disparar health_fail
// - cooldownMin: minutos entre notificaciones del mismo webhook (anti-spam)
// - enabled: si false, no se ejecuta pero queda en config
// ──────────────────────────────────────────────────────────────────────────
export const WebhookEventSchema = z.enum(['health_fail', 'health_recover']);

export const WebhookSchema = z.object({
  id: z.string().min(8).max(80),
  name: z.string().min(1).max(60),
  // URL: sólo http(s). Validamos el formato acá; el engine aplica SSRF
  // guard antes de hacer fetch (bloquea loopback, private IPs, etc).
  url: z.string().url().refine(
    (u) => /^https?:\/\//.test(u),
    'URL debe empezar con http:// o https://',
  ).refine(
    (u) => u.length <= 500,
    'URL demasiado larga (max 500 chars)',
  ),
  events: z.array(WebhookEventSchema).min(1, 'Al menos un evento').default(['health_fail']),
  minFailures: z.number().int().min(1).max(20).default(3),
  cooldownMin: z.number().int().min(0).max(1440).default(30),
  enabled: z.boolean().default(true),
});

export const WebhooksSchema = z.object({
  items: z.array(WebhookSchema).default([]),
});
// Sin `.default({})` en el outer: si lo hacemos, WebhooksSchema deja de
// tener `.partial()`. El campo en ConfigSchema es .optional() así que
// configs viejos siguen parseando. saveConfig maneja el default (items: []).

export type Webhook = z.infer<typeof WebhookSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

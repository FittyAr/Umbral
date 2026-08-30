import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Maintenance windows (opt-in: features.maintenanceWindows)
//
// Lista de ventanas de mantenimiento programadas. Durante una ventana
// activa, las cards afectadas muestran un badge ámbar "🔧 Mantenimiento"
// en la portada y NO disparan webhooks de health_fail (reducir spam
// durante deploys).
//
// Una ventana tiene:
// - id: identificador único
// - cardIds: array de card IDs afectados (o ['*'] para "todas")
// - startsAt / endsAt: ISO timestamps (UTC). endsAt > startsAt.
// - reason: descripción libre (ej: "Deploy v2.1")
// - enabled: si false, la ventana queda guardada pero no se aplica
//
// Auto-cleanup: las ventanas con endsAt < now - 24h se consideran
// "históricas" y se pueden borrar en bulk desde la UI.
// ──────────────────────────────────────────────────────────────────────────
export const MaintenanceWindowSchema = z.object({
  id: z.string().min(8).max(80),
  cardIds: z.array(z.string().min(1).max(80)).min(1, 'Al menos una card o "*"').default(['*']),
  // '*' como sentinel para "todas las cards". Validamos que el primer
  // elemento sea '*' o un cardId real (no se puede mezclar).
  startsAt: z.string().datetime({ message: 'startsAt debe ser ISO 8601 UTC' }),
  endsAt: z.string().datetime({ message: 'endsAt debe ser ISO 8601 UTC' }),
  reason: z.string().max(120).default(''),
  enabled: z.boolean().default(true),
}).refine(
  (w) => new Date(w.endsAt).getTime() > new Date(w.startsAt).getTime(),
  { message: 'endsAt debe ser posterior a startsAt', path: ['endsAt'] },
);

export const MaintenanceWindowsSchema = z.object({
  items: z.array(MaintenanceWindowSchema).default([]),
});
// Sin `.default({})` en outer (mismo fix que FeaturesSchema/WebhooksSchema)
// para que `.partial()` funcione. El default de items=[] lo aplica el
// preprocess en saveConfig.

export type MaintenanceWindow = z.infer<typeof MaintenanceWindowSchema>;

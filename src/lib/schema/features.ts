import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Features (feature flags opt-in)
//
// PRINCIPIO 7 del plan de ampliación: toda feature nueva debe poder
// apagarse. El admin decide qué activa; si no la quiere, no la paga (ni
// en código que corre, ni en dependencias, ni en tamaño de config, ni en
// ruido visual). El loader usa `isFeatureEnabled()` para gating y los
// módulos que requieran deps nuevas se importan dinámicamente.
//
// Default `false` para TODO. La app "simplemente funciona" como en v1.x.
// Si el admin apaga una feature que ya tenía datos, los datos se
// preservan en config.json pero inertes; al volver a activar, reaparecen.
//
// Esta sección es el primer bloque que las próximas olas (markdown, tags,
// pinned, presets, audit log viewer, webhooks, métricas, QR, multi-user,
// OIDC, multi-portal) van a poblar. Por ahora arranca vacía con la
// infraestructura lista.
// ──────────────────────────────────────────────────────────────────────────
const FeatureFlagSchema = z.object({
  enabled: z.boolean().default(false),
});

export const FeaturesSchema = z.object({
  i18n: z
    .object({
      enabled: z.boolean().default(false),
      locale: z.enum(['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ru']).default('es'),
    })
    .default({ enabled: false, locale: 'es' }),
  markdown: FeatureFlagSchema.default({ enabled: false }),
  tags: FeatureFlagSchema.default({ enabled: false }),
  pinned: FeatureFlagSchema.default({ enabled: false }),
  presets: FeatureFlagSchema.default({ enabled: true }),
  auditLogViewer: FeatureFlagSchema.default({ enabled: true }),
  qr: FeatureFlagSchema.default({ enabled: false }),
  metrics: z
    .object({
      enabled: z.boolean().default(false),
      persistToDisk: z.boolean().default(false),
      retentionHours: z.number().int().min(1).max(720).default(24),
    })
    .default({ enabled: false, persistToDisk: false, retentionHours: 24 }),
  webhooks: FeatureFlagSchema.default({ enabled: false }),
  maintenanceWindows: FeatureFlagSchema.default({ enabled: false }),
  multiUser: FeatureFlagSchema.default({ enabled: false }),
  totp2fa: FeatureFlagSchema.default({ enabled: false }),
  oidc: FeatureFlagSchema.default({ enabled: false }),
  apiTokens: FeatureFlagSchema.default({ enabled: false }),
  multiPortal: FeatureFlagSchema.default({ enabled: false }),
  status: FeatureFlagSchema.default({ enabled: false }),
  ai: FeatureFlagSchema.default({ enabled: false }),
  iconPacks: FeatureFlagSchema.default({ enabled: false }),
  animations: FeatureFlagSchema.default({ enabled: false }),
});
// NOTA: NO usamos `.default({})` en el outer schema. Si lo hacemos,
// FeaturesSchema se convierte en un ZodDefault que no tiene `.partial()`.
// En su lugar, declaramos `features: FeaturesSchema.optional()` en el
// ConfigSchema (abajo). El código que lo lee debe chequear `cfg.features`
// por null antes de usarlo — el helper `isFeatureEnabled()` ya lo hace.

export type Features = z.infer<typeof FeaturesSchema>;

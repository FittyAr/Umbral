import { z } from 'zod';
import { BrandingSchema } from './branding.ts';
import { ThemeSchema } from './theme.ts';
import { LayoutSchema } from './layout.ts';
import { SecuritySchema } from './security.ts';
import { AISchema, ExternalSearchSchema } from './ai.ts';
import { WebhooksSchema } from './webhooks.ts';
import { MaintenanceWindowsSchema } from './maintenance.ts';
import { OIDCSchema } from './oidc.ts';
import { ApiTokensSchema } from './api-tokens.ts';
import { PortalsSchema } from './portals.ts';
import { FeaturesSchema } from './features.ts';
import { CategorySchema } from './categories.ts';
import { CardSchema } from './cards.ts';
import { AuthSchema } from './auth.ts';

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
  security: SecuritySchema,
  // `ai` es opt-in: el admin lo activa desde el panel cuando quiera.
  // Default vacío → todos los endpoints /api/ai devuelven 503.
  ai: AISchema.optional(),
  // Webhooks (opt-in: features.webhooks). Si la feature está apagada,
  // el engine NO se ejecuta aunque haya webhooks configurados.
  webhooks: WebhooksSchema.optional(),
  // Maintenance windows (opt-in: features.maintenanceWindows). Si la
  // feature está apagada, el render las ignora y los webhooks no las
  // respetan.
  maintenanceWindows: MaintenanceWindowsSchema.optional(),
  // OIDC (opt-in: features.oidc). Lista de providers (Keycloak, Google,
  // Authentik, etc.). Default array vacío = sin providers. Si la feature
  // está apagada, el engine no se ejecuta y los endpoints /api/auth/oidc/*
  // devuelven 404 (defense-in-depth).
  oidc: OIDCSchema.optional(),
  // API tokens (opt-in: features.apiTokens). Lista de tokens para
  // integraciones externas. Si la feature está apagada, los tokens no se
  // persisten (defense-in-depth).
  apiTokens: ApiTokensSchema.optional(),
  // External search (Brave / Tavily / etc) — opcional, también.
  // Default vacío → auto-completar usa sólo Wikipedia + DuckDuckGo (sin key).
  externalSearch: ExternalSearchSchema.optional(),
  // Multi-portal (opt-in: features.multiPortal). Lista de portales adicionales.
  portals: PortalsSchema.optional(),
  // Features flags: sistema unificado de opt-in. Ver FeaturesSchema arriba
  // y src/lib/features.ts para el helper `isFeatureEnabled()`. Cada ola
  // del roadmap (markdown, tags, webhooks, multi-portal, ...) se registra
  // acá con default `enabled: false`.
  features: FeaturesSchema.optional(),
  categories: z.array(CategorySchema).default([]),
  cards: z.array(CardSchema).default([]),
  auth: AuthSchema.optional(),
  _meta: z
    .object({
      createdAt: z.string().nullable().default(null),
      updatedAt: z.string().nullable().default(null),
    })
    .default({ createdAt: null, updatedAt: null }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Partial schema for PUT /api/config (no auth, no _meta).
// Build it from scratch using the same shape as ConfigSchema but with .partial() and
// omitting the protected fields.
export const ConfigUpdateSchema = z
  .object({
    version: z.literal(1).optional(),
    branding: BrandingSchema.partial().optional(),
    theme: ThemeSchema.partial().optional(),
    layout: LayoutSchema.partial().optional(),
    security: SecuritySchema.partial().optional(),
    ai: AISchema.partial().optional(),
    externalSearch: ExternalSearchSchema.partial().optional(),
    webhooks: WebhooksSchema.partial().optional(),
    maintenanceWindows: MaintenanceWindowsSchema.partial().optional(),
    portals: PortalsSchema.partial().optional(),
    oidc: OIDCSchema.partial().optional(),
    apiTokens: ApiTokensSchema.partial().optional(),
    // Features flags: el admin puede togglear individuales. Cada feature
    // tiene su sub-schema; aceptamos partials para permitir updates
    // granulares (ej: cambiar sólo `features.i18n.locale`).
    features: FeaturesSchema.partial().optional(),
    categories: z.array(CategorySchema).optional(),
    cards: z.array(CardSchema).optional(),
    // auth y _meta son sólo del server — el client los manda sin querer al
    // guardar el cfg entero. Aceptamos silenciosamente y los descartamos.
    auth: z.unknown().optional(),
    _meta: z.unknown().optional(),
  })
  .strict();

export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

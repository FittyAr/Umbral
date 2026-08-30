import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
// OIDC (opt-in: features.oidc) — login con OpenID Connect (Keycloak,
// Google Workspace, Authentik, Azure AD, etc.). DEFAULT OFF — incluso
// para instalaciones nuevas, el admin debe explícitamente configurar
// un provider. La razón: OIDC cambia el flujo de auth (agrega rutas,
// superficie de ataque diferente) y no queremos que se active por
// accidente. Ver src/lib/oidc.ts.
// ──────────────────────────────────────────────────────────────────────────
export const OIDCProviderSchema = z.object({
  id: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  name: z.string().min(1).max(60),
  // Issuer URL: el .well-known/openid-configuration se descubre desde acá
  // (ej: https://keycloak.example.com/realms/umbral).
  issuer: z.string().url().refine((u) => /^https?:\/\//.test(u), 'issuer debe ser http(s)'),
  clientId: z.string().min(1).max(200),
  clientSecret: z.string().min(1).max(500),
  scopes: z.array(z.string().min(1).max(60)).default(['openid', 'profile', 'email']),
  claimMap: z.object({
    username: z.string().min(1).max(60).default('preferred_username'),
    email: z.string().min(1).max(60).default('email'),
    displayName: z.string().min(1).max(60).default('name'),
    role: z.string().min(1).max(60).default('umbral_role'),
  }).default({}),
  // Si true y el user no existe en users[], se crea automáticamente
  // con el rol por default. Si false, login falla con "user not provisioned".
  autoProvision: z.boolean().default(false),
  defaultRole: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  enabled: z.boolean().default(true),
  redirectPath: z.string().max(100).default('/'),
});
export const OIDCSchema = z.object({
  providers: z.array(OIDCProviderSchema).default([]),
});
export type OIDCProvider = z.infer<typeof OIDCProviderSchema>;

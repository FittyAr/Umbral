import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// API tokens (opt-in: features.apiTokens) — para integraciones externas
// (CI/CD, scripts, el CLI de Ola 4.2). Un token es una string opaca
// que el server valida contra el hash bcrypt guardado en disco. El
// header es "Authorization: Bearer umb_xxx". Los tokens tienen un
// scope (read/write) y un expiresAt opcional. El admin los crea/borra
// desde el panel. Audit log: api_token_created / api_token_used.
// ──────────────────────────────────────────────────────────────────────────
export const ApiTokenScopeSchema = z.enum(['read', 'write']);
export const ApiTokenSchema = z.object({
  id: z.string().min(8).max(80),
  name: z.string().min(1).max(80),
  // Sólo guardamos el hash bcrypt, NUNCA el plaintext (igual que users).
  tokenHash: z.string().min(1),
  // "read" = GET endpoints. "write" = todo (incluye read).
  scope: ApiTokenScopeSchema.default('read'),
  // ISO 8601 UTC. null = no expira.
  expiresAt: z.string().datetime().nullable().default(null),
  // Metadata para el admin
  createdAt: z.string().datetime().nullable().default(null),
  lastUsedAt: z.string().datetime().nullable().default(null),
  // Últimos 4 chars del token (para identificar en la lista). NUNCA el
  // token completo — eso es el secret que sale una sola vez al crear.
  tokenLast4: z.string().length(4).default('****'),
  // "true" para revocar (preserva el slot en el array para audit log).
  revoked: z.boolean().default(false),
});
export const ApiTokensSchema = z.object({
  items: z.array(ApiTokenSchema).default([]),
});
export type ApiToken = z.infer<typeof ApiTokenSchema>;

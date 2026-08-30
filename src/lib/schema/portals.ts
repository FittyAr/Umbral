import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Portals (opt-in: features.multiPortal) — una sola instancia sirve
// múltiples portales (ej: "IT", "Marketing", "Dev"), cada uno con su
// propio config, uploads, audit log. Routing por Host header o path
// prefix. Ver el plan Ola 4.1.
//
// Cuando la feature está apagada, el portal implícito es "default" y
// todo vive en data/ (legacy). Cuando se prende, se migra automáticamente
// data/ → data/portals/default/.
// ──────────────────────────────────────────────────────────────────────────
export const PortalSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case (a-z, 0-9, guiones)'),
  name: z.string().min(1).max(80),
  // host: dominio que matchea. Vacío = matchea por pathPrefix solamente.
  // '*' = wildcard (matchea cualquier host).
  host: z.string().max(200).optional().default(''),
  // pathPrefix: prefijo de path. '*' = matchea todos los paths (default
  // portal). Default '/'.
  pathPrefix: z.string().max(20).regex(/^[/a-z*0-9-]*$/, 'pathPrefix debe empezar con / y solo letras/digitos/guiones/asterisco').default('/'),
});
export const PortalsSchema = z.object({
  items: z.array(PortalSchema).default([]),
  defaultPortal: z.string().min(1).max(40).default('default'),
});
export type Portal = z.infer<typeof PortalSchema>;

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Branding
// ──────────────────────────────────────────────────────────────────────────
export const BrandingSchema = z.object({
  companyName: z.string().min(1).max(80).default('Mi Empresa'),
  logo: z.string().nullable().default(null), // relative path under /api/assets/
  favicon: z.string().nullable().default(null),
});

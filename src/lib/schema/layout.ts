import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────────────────
export const LayoutSchema = z.object({
  columnsDesktop: z.number().int().min(2).max(8).default(4),
  columnsTablet: z.number().int().min(2).max(6).default(3),
  columnsMobile: z.number().int().min(1).max(3).default(2),
  cardSize: z.enum(['small', 'medium', 'large']).default('medium'),
  showDescriptions: z.boolean().default(true),
  gap: z.number().min(0).max(3).default(1),
  // Separación entre bloques de categoría (rem). Los defaults reproducen el
  // espaciado histórico, que salía del margin del header: 2rem para un grupo
  // con título y 0.35rem para un hueco de tarjetas sueltas (categoría
  // fantasma), que al no tener título necesita mucho menos aire.
  categoryGap: z.number().min(0).max(6).default(2),
  ghostCategoryGap: z.number().min(0).max(6).default(0.35),
  maxWidth: z.number().int().min(720).max(2560).default(1280),
  gridAlign: z.enum(['left', 'center']).default('center'),
  cardRadius: z.number().int().min(0).max(32).default(12),
  compact: z.boolean().default(false),
  // healthCheckInterval: cada cuántos segundos volver a probar las cards con
  // healthCheck=true. Mínimo 10s (evita martillar el server), máximo 1h.
  healthCheckInterval: z.number().int().min(10).max(3600).default(60),
});

export type Layout = z.infer<typeof LayoutSchema>;

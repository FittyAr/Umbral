import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  // name/icon vacíos permitidos en categorías fantasma (isGhost): buckets
  // internos para cards sueltas en la portada, sin título visible.
  name: z.string().max(60).default(''),
  icon: z.string().default(''),
  isLocked: z.boolean().default(false),
  password: z.string().default(''),
  isSubpage: z.boolean().default(false),
  // Ghost: no se muestra en tab Categorías ni como header en la portada.
  // Vive en `categories[]` para preservar el orden intercalado (grupo A,
  // sueltas, grupo B). Vacío → se auto-elimina en move/sync/save.
  isGhost: z.boolean().default(false),
}).superRefine((cat, ctx) => {
  if (!cat.isGhost && !cat.name.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Nombre requerido',
    });
  }
  if (cat.isGhost && cat.isSubpage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['isSubpage'],
      message: 'Una categoría fantasma no puede ser subpágina',
    });
  }
  if (cat.isGhost && cat.isLocked) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['isLocked'],
      message: 'Una categoría fantasma no puede estar bloqueada',
    });
  }
});

export type Category = z.infer<typeof CategorySchema>;

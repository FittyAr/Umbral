import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Branding
// ──────────────────────────────────────────────────────────────────────────
export const BrandingSchema = z.object({
  companyName: z.string().min(1).max(80).default('Mi Empresa'),
  logo: z.string().nullable().default(null), // relative path under /api/assets/
  favicon: z.string().nullable().default(null),
});

// ──────────────────────────────────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────────────────────────────────
export const BackgroundSchema = z.object({
  type: z.enum(['image', 'color', 'gradient']).default('gradient'),
  value: z.string().min(1).default('linear-gradient(135deg, #0f172a, #1e3a8a)'),
  blur: z.number().min(0).max(40).default(0),
  overlay: z.number().min(0).max(1).default(0),
  overlayColor: z.string().default('#000000'),
});

export const ThemeSchema = z.object({
  background: BackgroundSchema,
  cardStyle: z.enum(['flat', 'glass', 'outlined']).default('glass'),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  textColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#f1f5f9'),
  fontFamily: z.string().min(1).default('Inter'),
  fontUrl: z.string().url().or(z.literal('')).default(''),
  colorMode: z.enum(['light', 'dark', 'auto']).default('auto'),
});

// ──────────────────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────────────────
export const LayoutSchema = z.object({
  columnsDesktop: z.number().int().min(2).max(8).default(4),
  columnsTablet: z.number().int().min(2).max(6).default(3),
  columnsMobile: z.number().int().min(1).max(3).default(2),
  cardSize: z.enum(['small', 'medium', 'large']).default('medium'),
  showDescriptions: z.boolean().default(true),
});

// ──────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'ID debe ser kebab-case'),
  name: z.string().min(1).max(60),
  icon: z.string().default('folder'),
});

// ──────────────────────────────────────────────────────────────────────────
// Cards
// ──────────────────────────────────────────────────────────────────────────
export const CardSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  description: z.string().max(200).default(''),
  url: z.string().url(),
  icon: z.string().default('globe'), // nombre de ícono (Lucide) o path /api/assets/<file>
  category: z.string().min(1),
  openInNewTab: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  order: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
});

// ──────────────────────────────────────────────────────────────────────────
// Auth (no se expone al admin: vive solo en el JSON raíz)
// ──────────────────────────────────────────────────────────────────────────
export const AuthSchema = z.object({
  passwordHash: z.string().min(1),
  csrfToken: z.string().min(1),
});

// ──────────────────────────────────────────────────────────────────────────
// Top-level Config
// ──────────────────────────────────────────────────────────────────────────
export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
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
export type Card = z.infer<typeof CardSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type Branding = z.infer<typeof BrandingSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

// Partial schema for PUT /api/config (no auth, no _meta).
// Build it from scratch using the same shape as ConfigSchema but with .partial() and
// omitting the protected fields.
const FullConfigShape = {
  version: z.literal(1).default(1),
  branding: BrandingSchema,
  theme: ThemeSchema,
  layout: LayoutSchema,
  categories: z.array(CategorySchema).default([]),
  cards: z.array(CardSchema).default([]),
};

export const ConfigUpdateSchema = z
  .object({
    version: z.literal(1).optional(),
    branding: BrandingSchema.partial().optional(),
    theme: ThemeSchema.partial().optional(),
    layout: LayoutSchema.partial().optional(),
    categories: z.array(CategorySchema).optional(),
    cards: z.array(CardSchema).optional(),
  })
  .strict();

export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

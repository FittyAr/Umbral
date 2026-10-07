/**
 * Qué parte del config es de cada portal y qué parte es global.
 *
 * Con multi-portal, cada portal tiene su propia portada (marca, tema, layout,
 * categorías, tarjetas y sus ventanas de mantenimiento) en
 * `data/portals/<id>/config.json`. Todo lo demás —auth y usuarios,
 * seguridad, API tokens, OIDC, features, IA, webhooks, la lista de
 * portales— es de la instancia y vive en el portal raíz (`default`): un solo
 * login sirve para todos los portales.
 */
import type { Config } from '../schema';

export const PORTAL_SECTIONS = [
  'branding',
  'theme',
  'layout',
  'categories',
  'cards',
  'maintenanceWindows',
] as const satisfies ReadonlyArray<keyof Config>;

export type PortalSection = (typeof PORTAL_SECTIONS)[number];

const PORTAL_SET: ReadonlySet<string> = new Set(PORTAL_SECTIONS);

export function isPortalSection(key: string): key is PortalSection {
  return PORTAL_SET.has(key);
}

/** Sólo las secciones de portal de un objeto config. */
export function pickPortalSections<T extends Record<string, unknown>>(cfg: T): Partial<T> {
  return Object.fromEntries(Object.entries(cfg).filter(([k]) => PORTAL_SET.has(k))) as Partial<T>;
}

/** Todo menos las secciones de portal (y menos `_meta`). */
export function pickGlobalSections<T extends Record<string, unknown>>(cfg: T): Partial<T> {
  return Object.fromEntries(Object.entries(cfg).filter(([k]) => !PORTAL_SET.has(k) && k !== '_meta')) as Partial<T>;
}

/** El más reciente de dos `updatedAt` ISO (la versión del config combinado). */
export function laterVersion(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

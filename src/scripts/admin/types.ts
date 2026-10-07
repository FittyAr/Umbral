/**
 * Tipo de retorno de las factories de estado del admin.
 *
 * Cada `createXState()` devuelve un fragmento parcial del objeto Alpine que se
 * compone con spread en `dashboard.astro`. Los métodos resuelven `this` contra
 * el objeto completo, que sólo existe en runtime, así que el fragmento se tipa
 * como un mapa laxo: es la anotación que le da a `this` un tipo indexable.
 */
export type AdminFragment = Record<string, any>;

/** Mensaje legible de un valor capturado en un `catch`. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Entrada de `window.__featureList` (inyectada por el dashboard). */
export interface FeatureListItem {
  name: string;
  enabled: boolean;
}

/** Asset subido, tal como lo devuelve GET /api/assets. */
export interface AdminAsset {
  name: string;
}

/** Entrada del audit log serializada por GET /api/audit. */
export interface AdminAuditEntry {
  ts: string;
  action: string;
  detail: string;
}

/** Usuario de `cfg.auth.users[]` (features.multiUser). */
export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  passwordHash?: string;
  role: string;
  userEpoch: number;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  totpSecret?: string | null;
}

/** Token API de `cfg.apiTokens.items[]` (features.apiTokens). */
export interface AdminApiToken {
  id: string;
}

/** Webhook de `cfg.webhooks.items[]` (features.webhooks). */
export interface AdminWebhook {
  id: string;
  url: string;
  preset?: string;
}

/** Ventana de mantenimiento de `cfg.maintenanceWindows.items[]`. */
export interface AdminMaintenanceWindow {
  enabled: boolean;
  startsAt: string;
  endsAt: string;
}

/** Fila de GET /api/metrics (por card). */
export interface AdminMetricsRow {
  cardId: string;
  [key: string]: unknown;
}

/** Variante de color de un preset de tema. */
export type ThemeVariant = 'dark' | 'light';

/** Preset custom guardado en `cfg.theme.customPresets[]`. */
export interface CustomThemePreset {
  id: string;
  name: string;
  theme?: { accentColor?: string; textColor?: string; [key: string]: unknown };
}

/** Item de la lista de presets de tema del admin (builtin o custom). */
export type ThemePresetListItem =
  | { id: string; custom: true; nameKey: string; previewColors?: string[] }
  | { id: string; custom?: false; previewColors?: Partial<Record<string, string[]>> };

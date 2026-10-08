/**
 * Datos del server para el panel: los bloques JSON que dejan dashboard.astro,
 * ThemeAdvanced.astro y ThemePresets.astro (componente JsonData), volcados a
 * los `window.__*` que leen los fragmentos de src/scripts/admin/*.
 *
 * Antes eran scripts inline con `define:vars`; un <script
 * type="application/json"> no se ejecuta, así que la CSP no necesita
 * 'unsafe-inline'. El dashboard lo importa después de Alpine y antes de
 * registrar `adminApp`.
 */
import { readJsonData } from '~/scripts/shared/json-data';

interface DashboardData {
  initialConfig: any;
  demoAvailableIcons: unknown;
  themePresetI18n: unknown;
  helpLocale: string;
  featureList: unknown;
  labels: unknown;
}

/**
 * Normaliza un config que viene del server para el panel. Se usa en el
 * arranque y cada vez que se reemplaza `cfg` (guardar, recargar, reset,
 * import): antes sólo corría al cargar la página, y después de un
 * "Recargar" el `trustedProxiesText` quedaba vacío y el siguiente guardado
 * borraba los proxies confiables.
 */
export function hydrateAdminCfg(cfg: any) {
  if (!cfg) return cfg;
  if (cfg.security && cfg.security.network) {
    // Mirror trustedProxies (array) into a text form so the textarea can edit it.
    cfg.security.network.trustedProxiesText = (cfg.security.network.trustedProxies || []).join('\n');
  }
  // Si el config legacy no tiene `features`, lo inicializamos como objeto
  // vacío (cada feature tendrá default {enabled:false} al renderizar).
  if (!cfg.features) cfg.features = {};
  if (!cfg.oidc) cfg.oidc = { providers: [] };
  if (!cfg.apiTokens) cfg.apiTokens = { items: [] };
  if (!cfg.portals) cfg.portals = { defaultPortal: 'default', items: [] };
  if (!cfg.auth) cfg.auth = { users: [], singlePasswordEnabled: true };
  return cfg;
}

const data = readJsonData<DashboardData | null>('admin-dashboard-data', null);
if (data) {
  const initialConfig = hydrateAdminCfg(data.initialConfig);
  window.__hydrateAdminCfg = hydrateAdminCfg;
  window.__initialConfigVersion = (initialConfig?._meta && initialConfig._meta.updatedAt) || null;
  window.__initialConfig = initialConfig;
  if (data.demoAvailableIcons) window.__availableIcons = data.demoAvailableIcons;
  window.__helpLocale = data.helpLocale;
  window.__featureList = data.featureList;
  window.__themePresetI18n = data.themePresetI18n;
  window.__labels = data.labels;
}

const tokenKeys = readJsonData<string[] | null>('admin-theme-token-keys', null);
if (tokenKeys) window.__themeTokenKeys = tokenKeys;
const tokenCategories = readJsonData<Record<string, unknown> | null>('admin-theme-token-categories', null);
if (tokenCategories) window.__themeTokenCategories = tokenCategories;
const builtinPresets = readJsonData<unknown[] | null>('admin-builtin-theme-presets', null);
if (builtinPresets) window.__builtinThemePresets = builtinPresets;

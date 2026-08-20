import type { Config } from './schema';

/**
 * Sistema de feature flags de Umbral.
 *
 * Cada feature del roadmap vive como un flag opt-in dentro de
 * `config.features.<name>`. Default `false` para todas. El admin decide
 * qué activa desde /admin → Avanzado → Features.
 *
 * Tres reglas de uso:
 *
 * 1. **Server-side gating**: cualquier endpoint o lógica nueva que
 *    corresponda a una feature debe chequear `isFeatureEnabled()` antes
 *    de correr. Si la feature está apagada, devolver 404 o no-op.
 *
 *    ```ts
 *    import { isFeatureEnabled } from '~/lib/features';
 *    if (!isFeatureEnabled(config, 'qr')) {
 *      return new Response('Not Found', { status: 404 });
 *    }
 *    ```
 *
 * 2. **UI gating**: en el admin, cada sección correspondiente a una
 *    feature se muestra solo si está activa. Usar el flag del FEATURE
 *    METADATA más abajo para renderizar el switch.
 *
 * 3. **Dynamic imports**: las features que requieren deps nuevas (qrcode,
 *    otpauth, openid-client) deben importarse con `await import()` dentro
 *    del bloque gated, así el costo es cero si la feature está apagada.
 *
 *    ```ts
 *    if (isFeatureEnabled(config, 'qr')) {
 *      const QRCode = (await import('qrcode')).default;
 *      // ...
 *    }
 *    ```
 */

export type FeatureName =
  | 'i18n'
  | 'markdown'
  | 'tags'
  | 'pinned'
  | 'presets'
  | 'auditLogViewer'
  | 'qr'
  | 'metrics'
  | 'webhooks'
  | 'maintenanceWindows'
  | 'multiUser'
  | 'totp2fa'
  | 'oidc'
  | 'apiTokens'
  | 'multiPortal'
  | 'status'
  | 'ai'
  | 'iconPacks';

/**
 * Metadata para renderizar la sección "Features" del admin.
 *
 * - `label`: nombre corto visible en el switch.
 * - `short`: descripción de una línea (tooltip del "?" help icon).
 * - `body`: descripción larga (modal de ayuda).
 * - `wave`: en qué ola del roadmap entra (referencia, no se muestra en UI).
 * - `experimental`: true si la feature todavía no salió en un release estable.
 * - `deps`: dependencias npm que la feature requiere (informativo, para
 *   que el admin sepa qué se va a cargar si la prende).
 */
export interface FeatureMeta {
  label: string;
  short: string;
  body: string;
  wave: 1 | 2 | 3 | 4;
  experimental: boolean;
  deps?: string[];
}

export const FEATURE_META: Record<FeatureName, FeatureMeta> = {
  i18n: {
    label: 'Internacionalización (i18n)',
    short: 'Permite elegir el idioma de la UI (es/en/pt).',
    body: 'Extrae todas las strings hardcoded de la UI a un módulo de diccionarios por locale. El admin elige el idioma default desde este switch; el visitante puede override por sesión con un toggle visible en la portada.',
    wave: 1,
    experimental: false,
  },
  markdown: {
    label: 'Markdown en descripciones',
    short: 'Permite usar markdown en las descripciones de tarjetas tipo "Nota".',
    body: 'Agrega un toggle "Markdown" en el form de tarjetas. Si está activo, las cards pueden tener descripciones de hasta 1000 chars con formato (listas, links, negrita). Se renderiza con marked + DOMPurify. Las cards link siguen con texto plano.',
    wave: 1,
    experimental: false,
  },
  tags: {
    label: 'Tags en tarjetas',
    short: 'Permite asignar tags (cross-cutting) además de categoría.',
    body: 'Cada tarjeta puede tener hasta 10 tags lowercase-kebab. La búsqueda de la portada los incluye además de título/descripción.',
    wave: 1,
    experimental: false,
  },
  pinned: {
    label: 'Fijar tarjetas (pin)',
    short: 'Permite destacar tarjetas críticas (VPN, status) con un pin.',
    body: 'Las tarjetas pinned se renderizan primero dentro de su categoría con un indicador visual. Sin reordenar manualmente.',
    wave: 1,
    experimental: false,
  },
  presets: {
    label: 'Plantillas de apps populares',
    short: 'Bundle de presets para agregar Mattermost, Excalidraw, GitLab, etc. con un click.',
    body: 'Aparece un botón "Agregar desde plantilla" en el tab Tarjetas con ~20 presets de las apps más comunes detrás de VPN. Cada preset pre-rellena título, descripción e ícono; la URL queda vacía para que completes.',
    wave: 1,
    experimental: false,
  },
  auditLogViewer: {
    label: 'Visor de audit log',
    short: 'Lee el audit.log desde el admin sin entrar al container.',
    body: 'Nueva sección "Auditoría" en Avanzado. Tabla con virtual scroll, filtros por acción/fecha/actor, botón para descargar el log completo.',
    wave: 1,
    experimental: false,
  },
  qr: {
    label: 'QR por tarjeta',
    short: 'Cada tarjeta muestra un QR de su URL para imprimir/compartir.',
    body: 'Botón en cada card link que abre un modal con el QR de la URL. Útil para posters, Notion, etc. Requiere la dep `qrcode` (~30KB, se carga dinámicamente).',
    wave: 2,
    experimental: true,
    deps: ['qrcode'],
  },
  metrics: {
    label: 'Métricas de latencia',
    short: 'Guarda historial de latencia de cada servicio con health check.',
    body: 'Ring buffer en memoria + opcional persistencia a disco (data/metrics.jsonl). UI muestra sparkline al lado del badge de health check.',
    wave: 2,
    experimental: true,
  },
  webhooks: {
    label: 'Webhooks de notificación',
    short: 'Notifica a Slack/Discord/ntfy cuando un servicio cae o se recupera.',
    body: 'Dispara un webhook cuando el health check falla N veces consecutivas (configurable). Cooldown anti-spam. Soporta presets para Slack, Discord, Mattermost, ntfy.sh, Gotify.',
    wave: 2,
    experimental: true,
  },
  maintenanceWindows: {
    label: 'Ventanas de mantenimiento',
    short: 'Silencia el badge rojo durante mantenimientos programados.',
    body: 'Marcá cards con una ventana de inicio/fin. Durante la ventana muestran badge ámbar "🔧 Mantenimiento" y no disparan notificaciones de fallo.',
    wave: 2,
    experimental: false,
  },
  multiUser: {
    label: 'Múltiples usuarios admin',
    short: 'Reemplaza el password único por usuarios con roles (admin/editor/viewer).',
    body: 'Mantiene el password único como super-admin de emergencia. Si lo activás y agregás users, podés opcionalmente revocar el password único (con confirmación dura). NO rompe deployments existentes.',
    wave: 3,
    experimental: true,
  },
  totp2fa: {
    label: '2FA / TOTP',
    short: 'Segundo factor de autenticación con apps tipo Google Authenticator.',
    body: 'TOTP por usuario (compatible con Authy, 1Password, etc.). Backup codes de un solo uso. El password único super-admin NO se puede proteger con TOTP (intencional: si perdés acceso a los seeds, el password único es el rescue).',
    wave: 3,
    experimental: true,
    deps: ['otpauth'],
  },
  oidc: {
    label: 'OIDC / SSO',
    short: 'Login con Keycloak, Google Workspace, Authentik, etc.',
    body: 'Integra cualquier IdP OpenID-Connect. Botón "Login with SSO" en /admin. Just-in-time provisioning. Requiere la dep `openid-client` (~80KB).',
    wave: 3,
    experimental: true,
    deps: ['openid-client'],
  },
  apiTokens: {
    label: 'API tokens',
    short: 'Tokens de larga duración para integraciones (GitHub Actions, scripts, etc).',
    body: 'Similar a tokens de GitHub. Scopes `read` y `write`. Header `Authorization: Bearer umb_xxx`. Requerido por el CLI `umb`.',
    wave: 4,
    experimental: true,
  },
  multiPortal: {
    label: 'Multi-portal',
    short: 'Múltiples portales (IT/Marketing/Dev) en una sola instancia.',
    body: 'Cada portal tiene su propio config.json, uploads y audit log. Detección por subdominio o path prefix. **Migra automáticamente** el config legacy al activar la feature por primera vez.',
    wave: 4,
    experimental: true,
  },
  status: {
    label: 'Monitoreo de Estado (Status)',
    short: 'Pestaña Status para diagnosticar conectividad y health checks en tiempo real.',
    body: 'Agrega la pestaña "Status" en el panel de administración para ejecutar diagnósticos y chequear en vivo la conectividad y tiempos de respuesta de todas las tarjetas.',
    wave: 1,
    experimental: false,
  },
  ai: {
    label: 'Asistente de IA',
    short: 'Pestaña IA y herramientas para formatear y mejorar tarjetas con LLMs.',
    body: 'Habilita la pestaña "IA" en el panel de administración y las funciones para mejorar y formatear automáticamente títulos y descripciones de tarjetas con modelos de lenguaje.',
    wave: 1,
    experimental: false,
  },
  iconPacks: {
    label: 'Paquetes de Íconos (Icon Packs)',
    short: 'Descarga e instala miles de íconos SVG desde repositorios Git de código abierto.',
    body: 'Permite descargar e instalar con un solo clic colecciones completas de miles de íconos SVG (Simple Icons, Dashboard Icons, Lucide, Tabler, etc.) o desde cualquier repositorio Git personalizado, manteniendo las licencias y atribuciones correspondientes.',
    wave: 2,
    experimental: false,
  },
};

/** Lista de nombres de features, ordenada por la ola del roadmap. Útil
 *  para renderizar la UI en el mismo orden que el plan. */
export const FEATURE_NAMES: FeatureName[] = (Object.keys(FEATURE_META) as FeatureName[]).sort(
  (a, b) => FEATURE_META[a].wave - FEATURE_META[b].wave,
);

/** Chequea si una feature está habilitada en el config.
 *  Devuelve `false` si la sección `features` no existe (caso legacy). */
export function isFeatureEnabled(config: Config | null | undefined, name: FeatureName): boolean {
  if (!config || !config.features) return false;
  const flag = (config.features as Record<string, unknown>)[name];
  if (!flag || typeof flag !== 'object') return false;
  const enabled = (flag as { enabled?: unknown }).enabled;
  return enabled === true;
}

/** Lee la configuración completa de una feature (no solo el `enabled`).
 *  Devuelve `null` si la feature no existe en el config. */
export function getFeatureConfig<T = unknown>(
  config: Config | null | undefined,
  name: FeatureName,
): T | null {
  if (!config || !config.features) return null;
  const flag = (config.features as Record<string, unknown>)[name];
  return (flag as T) ?? null;
}

/** Helper para imports dinámicos de dependencias pesadas. Solo carga la
 *  dep si la feature está activa. Node ya cachea módulos por defecto, así
 *  que no hace falta cache acá — pero centralizamos el gating para que el
 *  call site sea legible.
 *
 *  ```ts
 *  const QRCode = await loadFeatureModule(
 *    config,
 *    'qr',
 *    () => import('qrcode'),
 *  );
 *  if (!QRCode) {
 *    return new Response('Not Found', { status: 404 });
 *  }
 *  ```
 *
 *  Si la feature está apagada, devuelve `null` y NO ejecuta el importer. */
export async function loadFeatureModule<T>(
  config: Config | null | undefined,
  name: FeatureName,
  importer: () => Promise<T>,
): Promise<T | null> {
  if (!isFeatureEnabled(config, name)) return null;
  return await importer();
}
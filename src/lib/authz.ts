/**
 * Autorización por rol de las rutas `/api/*`.
 *
 * Antes el middleware sólo exigía estar autenticado: un usuario `viewer` (o
 * `editor`) podía hacer PUT de `/api/config` con `auth.users` y volverse
 * admin, plantar un API token, bajar el CSRF a `none`, importar un backup o
 * borrar icon packs. Sólo los API tokens de lectura estaban limitados.
 *
 * Esta tabla es la única fuente: cada ruta declara el rol mínimo por método.
 * Una ruta que no aparece requiere admin (default seguro). Las rutas
 * públicas se resuelven antes, en el middleware.
 */
import type { Role } from './auth';

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

type MethodRoles = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*', Role>>;

interface RouteRule {
  /** Path exacto, o prefijo si termina en `/`. */
  path: string;
  roles: MethodRoles;
}

const RULES: RouteRule[] = [
  // Lectura para cualquier sesión.
  { path: '/api/config', roles: { GET: 'viewer', PUT: 'editor', DELETE: 'admin' } },
  { path: '/api/metrics', roles: { GET: 'viewer' } },
  { path: '/api/icon-names', roles: { GET: 'viewer' } },
  { path: '/api/icon-pack-catalog.json', roles: { GET: 'viewer' } },
  { path: '/api/presets.json', roles: { GET: 'viewer' } },
  { path: '/api/ai-meta.json', roles: { GET: 'viewer' } },
  { path: '/api/help/', roles: { GET: 'viewer' } },
  { path: '/api/logout', roles: { POST: 'viewer' } },
  { path: '/api/assets', roles: { GET: 'viewer', DELETE: 'editor' } },
  // Edición de contenido (tarjetas, assets, autocompletar).
  { path: '/api/upload', roles: { POST: 'editor' } },
  { path: '/api/upload-from-url', roles: { POST: 'editor' } },
  { path: '/api/fetch-card-info', roles: { GET: 'editor' } },
  { path: '/api/markdown/render', roles: { POST: 'editor' } },
  { path: '/api/ai/format-card', roles: { POST: 'editor' } },
  // Todo lo demás (audit, import, password, tokens, totp, hash-password,
  // check-default-password, icon packs, webhooks/test) queda en admin por
  // no estar listado.
];

function findRule(pathname: string): RouteRule | undefined {
  return RULES.find((r) => (r.path.endsWith('/') ? pathname.startsWith(r.path) : pathname === r.path));
}

/** Rol mínimo para `method` en `pathname`. */
export function requiredRole(pathname: string, method: string): Role {
  const rule = findRule(pathname);
  if (!rule) return 'admin';
  const upper = method.toUpperCase();
  const m = (upper === 'HEAD' ? 'GET' : upper) as keyof MethodRoles;
  const role = rule.roles[m] ?? rule.roles['*'];
  return role ?? 'admin';
}

export function hasRole(actual: Role | null | undefined, required: Role): boolean {
  if (!actual) return false;
  return RANK[actual] >= RANK[required];
}

/**
 * Secciones del config que un `editor` puede tocar en un PUT. El resto
 * (auth, security, apiTokens, oidc, portals, features, ai, externalSearch,
 * webhooks) es de admin.
 */
export const EDITOR_CONFIG_SECTIONS: ReadonlySet<string> = new Set([
  'branding',
  'theme',
  'layout',
  'categories',
  'cards',
  'maintenanceWindows',
  // El cliente manda el config entero; estos los descarta el server.
  'version',
  '_meta',
]);

/**
 * Recorta el update a lo que el rol puede modificar. El panel manda el
 * config entero en cada guardado, así que para un editor las secciones de
 * admin se descartan (quedan como están en disco) en vez de rechazar todo el
 * guardado. Cualquier rol que no sea admin ni editor no puede modificar nada.
 */
export function pickAllowedConfigSections<T extends Record<string, unknown>>(
  update: T,
  role: Role | null | undefined,
): Partial<T> {
  if (role === 'admin') return update;
  if (role !== 'editor') return {};
  return Object.fromEntries(Object.entries(update).filter(([k]) => EDITOR_CONFIG_SECTIONS.has(k))) as Partial<T>;
}

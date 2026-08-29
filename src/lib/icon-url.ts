import { isSystemCard, SYSTEM_DOCS_ICON, SYSTEM_DOCS_ICON_PATH } from './system-card.ts';

export { SYSTEM_DOCS_ICON, SYSTEM_DOCS_ICON_PATH };

/** Resuelve el campo `icon` a una URL pública:
 *  - Si es URL absoluta o data-url o empieza con /, se devuelve tal cual.
 *  - Si contiene '/' (ej: "simple-icons/github" o "lucide/activity"), se sirve desde /api/icons/...
 *  - Si tiene extensión no-SVG (ej: "logo.png"), se sirve desde /api/assets/...
 *  - Nombres bare sin pack no se resuelven (null) — instalar un icon pack primero.
 */
export function resolveIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  if (icon === SYSTEM_DOCS_ICON || icon === SYSTEM_DOCS_ICON_PATH) {
    return SYSTEM_DOCS_ICON_PATH;
  }
  if (icon.startsWith('/')) return icon;
  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:')) {
    return icon;
  }
  if (icon.includes('/')) {
    const clean = icon.replace(/\.svg$/, '');
    return `/api/icons/${clean}.svg`;
  }
  if (/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(icon)) {
    return `/api/assets/${icon}`;
  }
  return null;
}

/** Nombre canónico de un ícono de pack: `pack/nombre`, sin la extensión. */
export function normalizeIconName(icon: string | null | undefined): string {
  return icon ? String(icon).replace(/\.svg$/, '') : '';
}

/**
 * Predicado para saber si un ícono de pack (`pack/nombre`) está instalado.
 *
 * Umbral arranca sin ningún icon pack y los packs se instalan a mano, así que
 * referenciar un ícono ausente es normal — por ejemplo las plantillas de app
 * apuntan a Lucide. Sin este chequeo cada `<img>` dispara un 404.
 *
 * Devuelve una función y no un simple booleano para armar el `Set` una sola
 * vez: el icon picker resuelve cientos de íconos por render.
 */
export function createInstalledIconLookup(
  installed: readonly string[] | null | undefined,
): (icon: string | null | undefined) => boolean {
  const set = new Set((installed || []).map(normalizeIconName));
  return (icon) => {
    const name = normalizeIconName(icon);
    return name !== '' && set.has(name);
  };
}

/** La card de documentación siempre usa el SVG de sistema, con o sin icon packs. */
export function resolveCardIconUrl(
  card: { id?: string; url?: string; icon?: string } | null | undefined,
): string | null {
  if (!card) return null;
  if (isSystemCard(card)) return SYSTEM_DOCS_ICON_PATH;
  return resolveIconUrl(card.icon);
}

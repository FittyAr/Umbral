import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ICON_PACKS_DIR = path.join(DATA_DIR, 'icon-packs');
const PUBLIC_ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

let cache: { icons: Set<string>; loadedAt: number } | null = null;
const TTL = 60_000;

export function invalidateIconsCache(): void {
  cache = null;
}

/** Devuelve la lista de íconos disponibles: core built-ins de /public/icons y paquetes instalados en data/icon-packs/ */
export async function getBuiltinIconNames(): Promise<string[]> {
  if (!cache || Date.now() - cache.loadedAt > TTL) {
    const allNames = new Set<string>();

    // 1. Íconos core built-in del repositorio (public/icons)
    try {
      const entries = await fs.readdir(PUBLIC_ICONS_DIR);
      for (const e of entries) {
        if (e.endsWith('.svg')) {
          allNames.add(e.replace(/\.svg$/, ''));
        }
      }
    } catch {
      // ignore
    }

    // 2. Íconos de paquetes instalados en data/icon-packs/<packId>/
    try {
      const packDirs = await fs.readdir(ICON_PACKS_DIR, { withFileTypes: true });
      for (const pDir of packDirs) {
        if (!pDir.isDirectory()) continue;
        const packId = pDir.name;
        const packPath = path.join(ICON_PACKS_DIR, packId);
        try {
          const files = await fs.readdir(packPath);
          for (const f of files) {
            if (f.endsWith('.svg')) {
              const iconName = f.replace(/\.svg$/, '');
              allNames.add(`${packId}/${iconName}`);
            }
          }
        } catch {
          // ignore pack dir read error
        }
      }
    } catch {
      // ignore icon packs dir read error
    }

    const names = Array.from(allNames).sort();
    cache = { icons: allNames, loadedAt: Date.now() };
    return names;
  }
  return Array.from(cache.icons);
}

/** Resuelve el campo `icon` a una URL pública:
 *  - Si es URL absoluta o data-url o empieza con /, se devuelve tal cual.
 *  - Si contiene '/' (ej: "simple-icons/github" o "lucide/activity"), se sirve desde /api/icons/...
 *  - Si tiene extensión no-SVG (ej: "logo.png"), se sirve desde /api/assets/...
 *  - De lo contrario, es un ícono built-in en /icons/<name>.svg
 */
export function resolveIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  if (icon.startsWith('/')) return icon;
  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:')) {
    return icon;
  }
  // Si contiene slash, es un ícono de un paquete instalado (ej: "lucide/activity" o "simple-icons/github")
  if (icon.includes('/')) {
    const clean = icon.replace(/\.svg$/, '');
    return `/api/icons/${clean}.svg`;
  }
  // Si es un archivo con extensión de imagen (png, webp, etc.), es un asset subido
  if (/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(icon)) {
    return `/api/assets/${icon}`;
  }
  // Ícono core built-in
  return `/icons/${icon.replace(/\.svg$/, '')}.svg`;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';

export function getIconsDirs(): string[] {
  const dirs: string[] = [];
  const publicIcons = path.join(process.cwd(), 'public', 'icons');
  const distClientIcons = path.join(process.cwd(), 'dist', 'client', 'icons');
  dirs.push(publicIcons);
  if (distClientIcons !== publicIcons) {
    dirs.push(distClientIcons);
  }
  return dirs;
}

let cache: { icons: Set<string>; loadedAt: number } | null = null;
const TTL = 60_000;

export function invalidateIconsCache(): void {
  cache = null;
}

/** Returns the set of predefined icon names available in /public/icons and /dist/client/icons. */
export async function getBuiltinIconNames(): Promise<string[]> {
  if (!cache || Date.now() - cache.loadedAt > TTL) {
    const allNames = new Set<string>();
    const dirs = getIconsDirs();
    for (const dir of dirs) {
      try {
        const entries = await fs.readdir(dir);
        for (const e of entries) {
          if (e.endsWith('.svg')) {
            allNames.add(e.replace(/\.svg$/, ''));
          }
        }
      } catch {
        // Ignorar directorios no existentes
      }
    }
    const names = Array.from(allNames).sort();
    cache = { icons: allNames, loadedAt: Date.now() };
    return names;
  }
  return Array.from(cache.icons);
}

/** Resolve an `icon` field from the config to a public URL.
 *  - If the icon is an absolute path or starts with /, return as-is.
 *  - If the icon is a name matching a builtin, return /icons/<name>.svg
 *  - Otherwise treat it as a custom uploaded asset and return /api/assets/<name>.
 */
export function resolveIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  if (icon.startsWith('/')) return icon;
  if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:')) {
    return icon;
  }
  // If it looks like a filename with an extension, assume it's an uploaded asset
  if (/\.[a-z0-9]+$/i.test(icon)) {
    return `/api/assets/${icon}`;
  }
  // Otherwise, builtin icon
  return `/icons/${icon}.svg`;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';

const PUBLIC_ICONS_DIR = path.join(process.cwd(), 'public', 'icons');
let cache: { icons: Set<string>; loadedAt: number } | null = null;
const TTL = 60_000;

/** Returns the set of predefined icon names available in /public/icons. */
export async function getBuiltinIconNames(): Promise<string[]> {
  if (!cache || Date.now() - cache.loadedAt > TTL) {
    try {
      const entries = await fs.readdir(PUBLIC_ICONS_DIR);
      const names = entries
        .filter((e) => e.endsWith('.svg'))
        .map((e) => e.replace(/\.svg$/, ''))
        .sort();
      cache = { icons: new Set(names), loadedAt: Date.now() };
      return names;
    } catch {
      cache = { icons: new Set(), loadedAt: Date.now() };
      return [];
    }
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

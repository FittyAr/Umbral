import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ICON_PACKS_DIR = path.join(DATA_DIR, 'icon-packs');

let cache: { icons: Set<string>; loadedAt: number } | null = null;
const TTL = 60_000;

export function invalidateIconsCache(): void {
  cache = null;
}

/** Devuelve la lista de íconos disponibles desde paquetes instalados en data/icon-packs/ */
export async function getAvailableIconNames(): Promise<string[]> {
  if (!cache || Date.now() - cache.loadedAt > TTL) {
    const allNames = new Set<string>();

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

/** @deprecated Use getAvailableIconNames */
export const getBuiltinIconNames = getAvailableIconNames;

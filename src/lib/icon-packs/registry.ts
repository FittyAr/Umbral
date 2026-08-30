/**
 * Paths de instalación y registro de packs instalados en disco.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PREDEFINED_ICON_PACKS, type IconPackStatus, type InstalledPackRecord } from './catalog.ts';

export function getDataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

export function getIconPacksDir(): string {
  return path.join(getDataDir(), 'icon-packs');
}

export function getPrimaryInstalledPacksFile(): string {
  return path.join(getIconPacksDir(), '.installed-packs.json');
}

export function getLegacyInstalledPacksFile(): string {
  return path.join(getDataDir(), '.installed-packs.json');
}

export const PROTECTED_FILES = new Set([
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  '.installed-packs.json',
]);

/** Lee el registro de packs instalados */
export async function getInstalledPacks(): Promise<Record<string, InstalledPackRecord>> {
  try {
    const raw = await fs.readFile(getPrimaryInstalledPacksFile(), 'utf8');
    return JSON.parse(raw);
  } catch {
    try {
      const raw = await fs.readFile(getLegacyInstalledPacksFile(), 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

/** Guarda el registro de packs instalados */
export async function saveInstalledPacks(records: Record<string, InstalledPackRecord>): Promise<void> {
  await fs.mkdir(getIconPacksDir(), { recursive: true });
  await fs.writeFile(getPrimaryInstalledPacksFile(), JSON.stringify(records, null, 2), 'utf8');
}

/** Obtiene el listado completo de packs con su estado de instalación */
export async function listIconPacksWithStatus(): Promise<{
  packs: IconPackStatus[];
  totalInstalledIcons: number;
}> {
  const installed = await getInstalledPacks();
  const packs: IconPackStatus[] = PREDEFINED_ICON_PACKS.map((p) => {
    const inst = installed[p.id];
    return {
      ...p,
      installed: !!inst,
      installedAt: inst?.installedAt,
      installedCount: inst?.iconsCount,
    };
  });

  let totalInstalledIcons = 0;
  try {
    const entries = await fs.readdir(getIconPacksDir(), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const files = await fs.readdir(path.join(getIconPacksDir(), entry.name));
        for (const f of files) {
          if (f.endsWith('.svg') && !PROTECTED_FILES.has(f)) {
            totalInstalledIcons++;
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return { packs, totalInstalledIcons };
}

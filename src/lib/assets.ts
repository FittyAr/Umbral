import { promises as fs } from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR, getConfig } from './config';

export interface AssetInfo {
  name: string;
  url: string;
  bytes: number;
  mtime: string;
  usedBy: string[]; // references like "branding.logo" / "cards.3.icon"
}

/** List all uploaded assets, marking which ones are referenced by the config. */
export async function listAssets(): Promise<AssetInfo[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(UPLOADS_DIR);
  } catch {
    return [];
  }
  const cfg = await getConfig();
  const inUse = new Set<string>();
  const usedBy: Record<string, string[]> = {};
  const add = (n: string | null | undefined, ref: string) => {
    if (!n) return;
    if (n.startsWith('/api/assets/')) n = n.replace('/api/assets/', '');
    inUse.add(n);
    (usedBy[n] ??= []).push(ref);
  };
  add(cfg.branding.logo, 'branding.logo');
  add(cfg.branding.favicon, 'branding.favicon');
  cfg.cards.forEach((c, i) => add(c.icon, `cards[${i}].icon`));
  if (cfg.theme.background.type === 'image') {
    add(cfg.theme.background.value, 'theme.background');
  }

  const out: AssetInfo[] = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    try {
      const st = await fs.stat(path.join(UPLOADS_DIR, name));
      out.push({
        name,
        url: `/api/assets/${name}`,
        bytes: st.size,
        mtime: st.mtime.toISOString(),
        usedBy: usedBy[name] ?? [],
      });
    } catch {
      // skip unreadable
    }
  }
  out.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return out;
}

export async function deleteAsset(name: string): Promise<boolean> {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  const full = path.resolve(UPLOADS_DIR, name);
  if (!full.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) return false;
  // Refuse to delete referenced assets.
  const all = await listAssets();
  const meta = all.find((a) => a.name === name);
  if (meta && meta.usedBy.length > 0) {
    throw new Error(`Asset en uso: ${meta.usedBy.join(', ')}`);
  }
  try {
    await fs.unlink(full);
    return true;
  } catch {
    return false;
  }
}

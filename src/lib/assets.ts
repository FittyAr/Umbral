import { promises as fs } from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR, getConfig, _invalidate as invalidateConfig } from './config';

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

/** Devuelve las referencias al asset en la config (sin leer el filesystem
 *  entero). Más barato que listAssets() y elimina la TOCTOU entre "chequeo"
 *  y "unlink" — leemos la config justo antes de borrar. */
function findAssetRefs(cfg: import('./schema').Config, assetName: string): string[] {
  const refs: string[] = [];
  const stripPrefix = (n: string) => n.startsWith('/api/assets/') ? n.replace('/api/assets/', '') : n;
  if (cfg.branding.logo && stripPrefix(cfg.branding.logo) === assetName) refs.push('branding.logo');
  if (cfg.branding.favicon && stripPrefix(cfg.branding.favicon) === assetName) refs.push('branding.favicon');
  cfg.cards.forEach((c, i) => {
    if (c.icon && stripPrefix(c.icon) === assetName) refs.push(`cards[${i}].icon`);
  });
  if (cfg.theme.background.type === 'image') {
    if (cfg.theme.background.value && stripPrefix(cfg.theme.background.value) === assetName) {
      refs.push('theme.background');
    }
  }
  return refs;
}

export async function deleteAsset(name: string): Promise<boolean> {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  const full = path.resolve(UPLOADS_DIR, name);
  if (!full.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) return false;
  // BUGFIX: TOCTOU entre el check de usedBy y el unlink. Antes leíamos
  // listAssets() (que cachea config) y después hacíamos unlink — un request
  // concurrente que actualizara la config entre medio nos dejaba con un
  // asset borrado y la config apuntando a un archivo inexistente. Ahora
  // forzamos reload fresco y chequeamos las refs SIN pasar por la lista
  // completa de assets (más barato y atómico desde el punto de vista del
  // delete: o el asset está libre y se borra, o está en uso y se rechaza).
  invalidateConfig();
  const cfg = await getConfig();
  const refs = findAssetRefs(cfg, name);
  if (refs.length > 0) {
    throw new Error(`Asset en uso: ${refs.join(', ')}`);
  }
  try {
    await fs.unlink(full);
    return true;
  } catch {
    return false;
  }
}

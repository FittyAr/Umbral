import type { APIRoute } from 'astro';
import { getConfig, audit } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import { uninstallIconPack } from '~/lib/icon-packs';
import { invalidateIconsCache } from '~/lib/icon-pack-names.ts';
import { json, error } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'iconPacks')) {
    return error('La feature iconPacks está desactivada.', 403);
  }

  try {
    const body = await request.json();
    if (!body?.packId) {
      return error('Se requiere packId.', 400);
    }

    const result = await uninstallIconPack(body.packId);

    invalidateIconsCache();

    await audit('delete', `Icon pack uninstalled: ${body.packId} (${result.iconsRemoved} icons removed)`);

    return json(result);
  } catch (err: any) {
    return error(err?.message || 'Error al desinstalar paquete de íconos.', 400);
  }
};

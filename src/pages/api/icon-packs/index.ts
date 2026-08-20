import type { APIRoute } from 'astro';
import { getConfig, audit } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import { listIconPacksWithStatus, installIconPack } from '~/lib/icon-packs';
import { json, error } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'iconPacks')) {
    return error('La feature iconPacks está desactivada.', 403);
  }

  try {
    const data = await listIconPacksWithStatus();
    return json(data);
  } catch (err: any) {
    return error(err?.message || 'Error al listar paquetes de íconos.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'iconPacks')) {
    return error('La feature iconPacks está desactivada.', 403);
  }

  try {
    const body = await request.json();
    const result = await installIconPack(body);

    await audit('update', `Icon pack installed: ${result.name} (${result.iconsInstalled} icons)`);

    return json(result);
  } catch (err: any) {
    return error(err?.message || 'Error al instalar el paquete de íconos.', 400);
  }
};

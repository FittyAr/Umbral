import type { APIRoute } from 'astro';
import { getConfig, audit } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import { listIconPacksWithStatus, installIconPack } from '~/lib/icon-packs';
import { getAvailableIconNames, invalidateIconsCache } from '~/lib/icon-pack-names.ts';
import { json, error } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'iconPacks')) {
    return error('La feature iconPacks está desactivada.', 403);
  }

  try {
    const data = await listIconPacksWithStatus();
    const availableIcons = await getAvailableIconNames();
    return json({ ...data, availableIcons });
  } catch (err: any) {
    return error(err?.message || 'Error al listar paquetes de íconos.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'iconPacks')) {
    return error('La feature iconPacks está desactivada.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body || typeof body !== 'object') return error('Body inválido', 400);

  try {
    // Los campos se validan dentro de installIconPack (ver
    // lib/icon-packs/validate.ts): de acá salían directo a `git`.
    const result = await installIconPack(body as Parameters<typeof installIconPack>[0]);

    invalidateIconsCache();

    // Acción propia y no el genérico 'update', que en el visor de auditoría
    // no dice nada y se mezcla con cualquier otro cambio de config.
    await audit('icon_pack_installed', `pack=${result.packId} name=${result.name} icons=${result.iconsInstalled}`);

    return json(result);
  } catch (err: any) {
    return error(err?.message || 'Error al instalar el paquete de íconos.', 400);
  }
};

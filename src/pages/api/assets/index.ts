import type { APIRoute } from 'astro';
import { listAssets, deleteAsset } from '~/lib/assets';
import { audit } from '~/lib/config';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await listAssets();
  return json({ items });
};

/** DELETE /api/assets { name } */
export const DELETE: APIRoute = async ({ request }) => {
  let body: { name?: string };
  try {
    body = await readJson<{ name?: string }>(request);
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body.name) return error('Falta name', 400);
  try {
    const ok = await deleteAsset(body.name);
    if (!ok) return error('No se pudo borrar (¿inexistente?)', 404);
    await audit('asset_delete', body.name);
    return json({ ok: true });
  } catch (err) {
    return error((err as Error).message, 409);
  }
};

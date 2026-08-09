import type { APIRoute } from 'astro';
import { getConfig, saveConfig, resetConfig, importConfig, audit } from '~/lib/config';
import { ConfigUpdateSchema, ConfigSchema } from '~/lib/schema';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

/** GET → returns the full config (admin use, also the public homepage uses server-side render) */
export const GET: APIRoute = async () => {
  const cfg = await getConfig();
  return json(cfg);
};

/** PUT → partial update. Body shape: any subset of the top-level config (except auth/_meta). */
export const PUT: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error('JSON inválido', 400);
  }
  const result = ConfigUpdateSchema.safeParse(body);
  if (!result.success) {
    return error(
      `Datos inválidos: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      400,
    );
  }
  let updated;
  try {
    // BUGFIX: saveConfig re-valida el merged (current + new). Si por algo
    // el merge produce algo que rompe el schema, .parse() tira ZodError y
    // la ruta devolvía un 500 opaco. Ahora lo capturamos y devolvemos un
    // 400 con el detalle, así el admin puede mostrar el problema exacto.
    updated = await saveConfig(result.data);
  } catch (err) {
    console.error('[umbral] saveConfig failed:', err);
    const message = err instanceof Error ? err.message : String(err);
    return error(`Error guardando config: ${message}`, 400);
  }
  await audit('config_update');
  return json(updated);
};

/** DELETE → reset to defaults (keeps auth). */
export const DELETE: APIRoute = async () => {
  const reset = await resetConfig();
  await audit('config_reset');
  return json(reset);
};

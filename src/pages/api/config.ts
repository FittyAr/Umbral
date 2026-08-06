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
  const updated = await saveConfig(result.data);
  await audit('config_update');
  return json(updated);
};

/** DELETE → reset to defaults (keeps auth). */
export const DELETE: APIRoute = async () => {
  const reset = await resetConfig();
  await audit('config_reset');
  return json(reset);
};

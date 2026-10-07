import type { APIRoute } from 'astro';
import { importConfig, audit } from '~/lib/config';
import { ConfigSchema } from '~/lib/schema';
import { json, error, readJson } from '~/lib/http';
import { sanitizeConfigForAdmin } from '~/lib/client-config';

export const prerender = false;

/** PUT /api/import → full config replacement (used by the admin "Import" button). */
export const PUT: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error('JSON inválido', 400);
  }
  // auth y apiTokens se conservan del config vigente (ver importConfig): los
  // del archivo se ignoran antes de validar, porque un export del panel los
  // trae saneados (hashes vacíos) y no pasarían el schema.
  if (body && typeof body === 'object') {
    delete (body as Record<string, unknown>).auth;
    delete (body as Record<string, unknown>).apiTokens;
  }
  const result = ConfigSchema.safeParse(body);
  if (!result.success) {
    return error(
      `Config inválido: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      400,
    );
  }
  const saved = await importConfig(result.data);
  await audit('config_import');
  return json(sanitizeConfigForAdmin(saved));
};

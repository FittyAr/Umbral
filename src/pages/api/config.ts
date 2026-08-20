import type { APIRoute } from 'astro';
import { getConfig, saveConfig, resetConfig, importConfig, audit } from '~/lib/config';
import { ConfigUpdateSchema, ConfigSchema } from '~/lib/schema';
import { FEATURE_META } from '~/lib/features';
import { json, error, readJson } from '~/lib/http';
import { verifyApiToken } from '~/lib/api-tokens';

export const prerender = false;

/** GET → returns the full config. Si la request trae Authorization:
 *  Bearer umb_xxx con un API token válido (feature.apiTokens ON),
 *  responde igual. Si no, exige sesión admin. Esto permite que integraciones
 *  externas (CI/CD, scripts, el CLI de Ola 4.2) consuman la API sin
 *  depender de cookies de sesión. */
export const GET: APIRoute = async ({ request }) => {
  const auth = await verifyApiToken(request);
  if (!auth.valid) {
    // Fallback al flow normal: sesión admin + CSRF.
    return await getConfigWithSession();
  }
  const cfg = await getConfig();
  return json(cfg);
};

async function getConfigWithSession() {
  // Lógica legacy: requiere sesión admin.
  const { buildAuthContext } = await import('~/lib/auth');
  const ctx = await buildAuthContext(new Request('http://x/x')); // dummy
  if (!ctx.isAuthenticated) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const cfg = await getConfig();
  return new Response(JSON.stringify(cfg), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** Diff entre dos secciones `features` para loguear toggles en el audit
 *  log. Devuelve un array de strings estilo "i18n: false→true" sólo con
 *  las features que efectivamente cambiaron. Si nada cambió, devuelve []. */
function diffFeatures(
  before: Record<string, { enabled?: boolean }> | undefined,
  after: Record<string, { enabled?: boolean }> | undefined,
): string[] {
  const out: string[] = [];
  const names = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const name of names) {
    const wasOn = before?.[name]?.enabled === true;
    const isOn = after?.[name]?.enabled === true;
    if (wasOn !== isOn) {
      // Verificamos que el nombre esté en FEATURE_META (ignora typos
      // silenciosos del admin que de otro modo quedarían en el log).
      if (name in FEATURE_META) {
        out.push(`${name}: ${wasOn ? 'true' : 'false'}→${isOn ? 'true' : 'false'}`);
      }
    }
  }
  return out;
}

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
  // Tomamos snapshot de features ANTES de guardar para poder loguear
  // los toggles que efectivamente cambiaron en este PUT.
  const before = await getConfig();
  const beforeFeatures = before.features as Record<string, { enabled?: boolean }> | undefined;
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
  // Diff de features para el audit log. Si sólo cambió features (sin
  // tocar otros tabs), igual registramos con detalle.
  const featureDiffs = diffFeatures(beforeFeatures, updated.features as Record<string, { enabled?: boolean }> | undefined);
  if (featureDiffs.length > 0) {
    await audit('config_update', `features: ${featureDiffs.join(', ')}`);
  } else {
    await audit('config_update');
  }
  return json(updated);
};

/** DELETE → reset to defaults (keeps auth). */
export const DELETE: APIRoute = async () => {
  const reset = await resetConfig();
  await audit('config_reset');
  return json(reset);
};

import type { APIRoute } from 'astro';
import { getConfig, saveConfig, resetConfig, audit, ConfigConflictError } from '~/lib/config';
import { ConfigUpdateSchema, type ConfigUpdate } from '~/lib/schema';
import { FEATURE_META } from '~/lib/features';
import { json, error, readJson } from '~/lib/http';
import { pickAllowedConfigSections } from '~/lib/authz';
import { sanitizeConfigForRole } from '~/lib/client-config';
import { restoreClientSecrets } from '~/lib/config/gating';

export const prerender = false;

/**
 * GET → config saneado. Nunca viajan el hash del super-admin, el CSRF, los
 * hashes/seeds TOTP de los users, client secrets ni API keys; un admin
 * recibe además la parte editable de `auth` (ver sanitizeConfigForAdmin).
 * Antes devolvía el config crudo a cualquier sesión o token de lectura.
 */
export const GET: APIRoute = async ({ locals }) => {
  const cfg = await getConfig();
  return json(sanitizeConfigForRole(cfg, locals.auth?.isAdmin === true));
};

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
export const PUT: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Body inválido', 400);
  // Los API tokens se administran sólo desde /api/tokens, y los secretos
  // llegan vacíos (el panel nunca los recibe): se reponen antes de validar,
  // porque el schema exige que no estén vacíos.
  delete (body as Record<string, unknown>).apiTokens;
  body = restoreClientSecrets(await getConfig(), body as Record<string, unknown>);
  const result = ConfigUpdateSchema.safeParse(body);
  if (!result.success) {
    console.error('[umbral] ConfigUpdateSchema validation failed:', result.error.issues);
    return error(
      `Datos inválidos: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      400,
    );
  }
  // Se mergea el body crudo, no `result.data`: los sub-schemas parciales
  // rellenan defaults anidados, y un PUT con sólo
  // `features.i18n.enabled` reseteaba el `locale` guardado a 'es'. La
  // validación completa la hace saveConfig sobre el resultado del merge.
  const auth = locals.auth;
  const update = pickAllowedConfigSections(body as Record<string, unknown>, auth?.role) as ConfigUpdate;
  // If-Match con el `_meta.updatedAt` que el cliente editó. Sin el header
  // (CLI, scripts) no hay control de concurrencia, como antes.
  const ifMatch = request.headers.get('if-match');
  // Tomamos snapshot de features ANTES de guardar para poder loguear
  // los toggles que efectivamente cambiaron en este PUT.
  const before = await getConfig();
  const beforeFeatures = before.features as Record<string, { enabled?: boolean }> | undefined;
  let updated;
  try {
    // saveConfig re-valida el merged (current + new); un ZodError vuelve
    // como 400 con el detalle, así el admin puede mostrar el problema exacto.
    updated = await saveConfig(update, { source: 'client', expectedVersion: ifMatch || undefined });
  } catch (err) {
    if (err instanceof ConfigConflictError) {
      return json({ error: err.message, currentVersion: err.currentVersion }, { status: 409 });
    }
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
  return json(sanitizeConfigForRole(updated, auth?.isAdmin === true));
};

/** DELETE → reset to defaults (keeps auth). */
export const DELETE: APIRoute = async ({ locals }) => {
  const reset = await resetConfig();
  await audit('config_reset');
  return json(sanitizeConfigForRole(reset, locals.auth?.isAdmin === true));
};

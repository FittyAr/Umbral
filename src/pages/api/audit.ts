import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { isFeatureEnabled } from '~/lib/features';
import { readAuditLog, listAuditActions } from '~/lib/audit';
import { AUDIT_LOG_PATH } from '~/lib/config';

export const prerender = false;

/**
 * GET /api/audit?limit=200&action=config_update&detail=features&from=...&to=...
 *
 * Devuelve las últimas N entradas del audit log (newest-first).
 * Soporta filtros:
 *   - limit (default 200, cap 1000)
 *   - action (exacto, ej: 'config_update')
 *   - detail (substring case-insensitive)
 *   - from / to (ISO timestamps)
 *
 * Feature gate: requiere `features.auditLogViewer.enabled === true`.
 * Si la feature está apagada, devuelve 404 (consistente con el patrón
 * opt-in — el visitante no puede bypassear el flag vía endpoint).
 *
 * Auth: requiere sesión admin (heredado del middleware — /api/* no
 * público requiere sesión activa + CSRF en mutations; GET no necesita
 * CSRF).
 *
 * Sidecar endpoint: `GET /api/audit?actions=1` devuelve la lista de
 * acciones distintas (para popular el dropdown del filtro).
 */
export const GET: APIRoute = async ({ url }) => {
  const { getConfig } = await import('~/lib/config');
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'auditLogViewer')) {
    return error('Visor de audit log no habilitado. Activalo en Admin → Avanzado → Features.', 404);
  }

  // Sidecar: lista de acciones
  if (url.searchParams.get('actions') === '1') {
    const actions = await listAuditActions(AUDIT_LOG_PATH);
    return json({ actions });
  }

  const params = url.searchParams;
  const limitRaw = params.get('limit');
  const action = params.get('action') || undefined;
  const detailContains = params.get('detail') || undefined;
  const from = params.get('from') || undefined;
  const to = params.get('to') || undefined;

  const limit = limitRaw ? Math.max(1, Math.min(1000, Number(limitRaw) || 200)) : 200;

  // Validar from/to si vienen
  for (const [name, val] of [['from', from], ['to', to]] as const) {
    if (val && Number.isNaN(new Date(val).getTime())) {
      return error(`Parámetro "${name}" no es un ISO timestamp válido`, 400);
    }
  }

  const result = await readAuditLog(AUDIT_LOG_PATH, {
    limit,
    action,
    detailContains,
    from,
    to,
  });
  return json(result);
};
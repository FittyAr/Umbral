import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { json, error } from '~/lib/http';
import { isPrivateOrLoopback, resolveAndCheckUrl } from '~/lib/ssrf';
import { processHealthResults } from '~/lib/webhooks';
import { recordSample } from '~/lib/metrics';

export const prerender = false;

interface StatusResult {
  id: string;
  url: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }
  // BUGFIX: antes hacíamos `body.ids.includes(c.id)` sin chequear que ids
  // sea array. Si el client mandaba { ids: "foo" } o { ids: 42 }, .includes
  // tiraba TypeError no capturado y el handler devolvía 500 opaco.
  const ids = (typeof body === 'object' && body !== null && 'ids' in body) ? (body as { ids?: unknown }).ids : undefined;
  if (ids !== undefined && !Array.isArray(ids)) {
    return error('ids debe ser array de strings', 400);
  }
  const idSet = ids ? new Set(ids.filter((x): x is string => typeof x === 'string')) : undefined;
  const cfg = await getConfig();
  // Si el deploy es interno (default), permitimos hosts privados. Si es
  // un deploy público en internet, `security.network.allowInternalHosts`
  // se setea a false y la guard SSRF vuelve a activar — el atacante no
  // puede usar /api/status para enumerar 169.254.169.254 u otros.
  const allowInternal = cfg.security.network.allowInternalHosts !== false;
  const targets = cfg.cards.filter((c) => c.enabled && (!idSet || idSet.has(c.id)));

  // Cap total a 50 chequeos para evitar abuso si alguien carga miles de cards.
  const capped = targets.slice(0, 50);

  const checks: StatusResult[] = await Promise.all(
    capped.map(async (c): Promise<StatusResult> => {
      const t0 = Date.now();
      // Bloqueo SSRF: rechaza URLs a infra interna / metadata / loopback.
      // Skip si el admin permite hosts internos (deploy típico en LAN).
      const guard = allowInternal ? { ok: true } : await resolveAndCheckUrl(c.url);
      if (!guard.ok) {
        const result: StatusResult = { id: c.id, url: c.url, ok: false, error: guard.reason, latencyMs: Date.now() - t0 };
        // Registrar muestra de latencia (opt-in: features.metrics).
        if (c.healthCheck) {
          recordSample(c.id, { ts: new Date().toISOString(), latencyMs: result.latencyMs ?? 0, ok: result.ok });
        }
        return result;
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        // redirect: 'manual' — NO seguimos redirects. Si la URL apunta a
        // attacker.com y redirige a 127.0.0.1, no nos interesa: el admin
        // debería apuntar al destino final. Esto cierra el bypass clásico
        // de SSRF por redirección.
        const res = await fetch(c.url, {
          method: 'HEAD',
          signal: ctrl.signal,
          redirect: 'manual',
        });
        clearTimeout(timer);
        const result: StatusResult = { id: c.id, url: c.url, ok: res.ok, status: res.status, latencyMs: Date.now() - t0 };
        if (c.healthCheck) {
          recordSample(c.id, { ts: new Date().toISOString(), latencyMs: result.latencyMs ?? 0, ok: result.ok });
        }
        return result;
      } catch (err) {
        const result: StatusResult = { id: c.id, url: c.url, ok: false, error: (err as Error).message, latencyMs: Date.now() - t0 };
        if (c.healthCheck) {
          recordSample(c.id, { ts: new Date().toISOString(), latencyMs: result.latencyMs ?? 0, ok: result.ok });
        }
        return result;
      }
    }),
  );

  // Disparar webhooks si la feature está activa. No bloqueamos la response
  // del endpoint: los webhooks se procesan en background. Si fallan, el
  // error queda en audit.log para debugging.
  // Convertimos el shape al que espera el engine (necesita title).
  processHealthResults(
    checks.map((c, i) => ({
      cardId: c.id,
      ok: c.ok,
      status: c.status,
      latencyMs: c.latencyMs,
      url: c.url,
      title: capped[i]?.title ?? '',
    })),
  ).catch((e) => {
    console.error('[umbral] webhook engine failed:', e);
  });

  return json({ results: checks });
};

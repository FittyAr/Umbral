import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { json, error, readJson } from '~/lib/http';
import { processHealthResults } from '~/lib/webhooks';
import { recordSample } from '~/lib/metrics';
import { safeFetch } from '~/lib/safe-fetch';
import { checkRateLimit } from '~/lib/rate-limit';

export const prerender = false;

interface StatusResult {
  id: string;
  url: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

// Resultados recientes por card. El endpoint es público (lo usa la portada),
// así que sin cache cada visitante —o un script— disparaba hasta 50 HEAD
// salientes por request y alimentaba los contadores de los webhooks. Una
// card se vuelve a chequear como mucho una vez por ventana; las métricas y
// los webhooks sólo ven chequeos nuevos.
const recent = new Map<string, { result: StatusResult; at: number }>();
const inflight = new Map<string, Promise<StatusResult>>();

function freshnessMs(intervalSec: number): number {
  return Math.max(10, Math.min(intervalSec, 300)) * 500; // la mitad del intervalo
}

export const POST: APIRoute = async ({ request, locals }) => {
  const rl = checkRateLimit(`status:${locals.clientIp || 'unknown'}`, 30, 60);
  if (!rl.ok) return error(`Demasiados pedidos. Probá en ${rl.resetInSec}s.`, 429);

  let body: unknown;
  try {
    body = await readJson(request);
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
  // Sólo las cards con health check: el resto no tiene por qué recibir
  // tráfico de Umbral.
  const targets = cfg.cards.filter((c) => c.enabled && c.healthCheck && (!idSet || idSet.has(c.id)));

  // Cap total a 50 chequeos para evitar abuso si alguien carga miles de cards.
  const capped = targets.slice(0, 50);
  const maxAge = freshnessMs(cfg.layout.healthCheckInterval);
  const fresh: Array<{ result: StatusResult; title: string }> = [];

  const runCheck = async (c: (typeof capped)[number]): Promise<StatusResult> => {
    const t0 = Date.now();
    let result: StatusResult;
    try {
      // safeFetch: guarda SSRF sobre la IP real de conexión (también con
      // allowInternal la metadata de la nube queda bloqueada) y sin seguir
      // redirects — el admin debería apuntar al destino final.
      const res = await safeFetch(c.url, {
        method: 'HEAD',
        allowInternal,
        maxRedirects: 0,
        timeoutMs: 5000,
        maxBytes: 64 * 1024,
      });
      // Un 3xx (p.ej. redirect al login) es un servicio que responde.
      result = { id: c.id, url: c.url, ok: res.status < 400, status: res.status, latencyMs: Date.now() - t0 };
    } catch (err) {
      result = { id: c.id, url: c.url, ok: false, error: (err as Error).message, latencyMs: Date.now() - t0 };
    }
    recordSample(c.id, { ts: new Date().toISOString(), latencyMs: result.latencyMs ?? 0, ok: result.ok });
    recent.set(c.id, { result, at: Date.now() });
    fresh.push({ result, title: c.title });
    return result;
  };

  const checks: StatusResult[] = await Promise.all(
    capped.map((c) => {
      const cached = recent.get(c.id);
      if (cached && cached.result.url === c.url && Date.now() - cached.at < maxAge) {
        return Promise.resolve(cached.result);
      }
      let p = inflight.get(c.id);
      if (!p) {
        p = runCheck(c).finally(() => inflight.delete(c.id));
        inflight.set(c.id, p);
      }
      return p;
    }),
  );

  // Disparar webhooks si la feature está activa, sólo con los chequeos
  // nuevos. No bloqueamos la response: los webhooks se procesan en
  // background y si fallan el error queda en audit.log.
  if (fresh.length > 0) {
    processHealthResults(
      fresh.map(({ result, title }) => ({
        cardId: result.id,
        ok: result.ok,
        status: result.status,
        latencyMs: result.latencyMs,
        url: result.url,
        title,
      })),
    ).catch((e) => {
      console.error('[umbral] webhook engine failed:', e);
    });
  }

  return json({ results: checks });
};

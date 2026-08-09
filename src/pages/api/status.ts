import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { json, error } from '~/lib/http';
import { isPrivateOrLoopback, resolveAndCheckUrl } from '~/lib/ssrf';

export const prerender = false;

interface CheckResult {
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

  const checks: CheckResult[] = await Promise.all(
    capped.map(async (c): Promise<CheckResult> => {
      const t0 = Date.now();
      // Bloqueo SSRF: rechaza URLs a infra interna / metadata / loopback.
      // Skip si el admin permite hosts internos (deploy típico en LAN).
      const guard = allowInternal ? { ok: true } : await resolveAndCheckUrl(c.url);
      if (!guard.ok) {
        return { id: c.id, url: c.url, ok: false, error: guard.reason, latencyMs: Date.now() - t0 };
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
        return { id: c.id, url: c.url, ok: res.ok, status: res.status, latencyMs: Date.now() - t0 };
      } catch (err) {
        return { id: c.id, url: c.url, ok: false, error: (err as Error).message, latencyMs: Date.now() - t0 };
      }
    }),
  );

  return json({ results: checks });
};

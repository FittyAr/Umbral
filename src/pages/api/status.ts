import type { APIRoute } from 'astro';
import { getConfig } from '~/lib/config';
import { json, error } from '~/lib/http';

export const prerender = false;

interface CheckResult {
  id: string;
  url: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

/** Concurrent health check for a list of card URLs. Used by the admin preview. */
export const POST: APIRoute = async ({ request }) => {
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }
  const cfg = await getConfig();
  const targets = cfg.cards.filter((c) => c.enabled && (!body.ids || body.ids.includes(c.id)));

  const checks: CheckResult[] = await Promise.all(
    targets.map(async (c): Promise<CheckResult> => {
      const t0 = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(c.url, {
          method: 'HEAD',
          signal: ctrl.signal,
          redirect: 'follow',
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

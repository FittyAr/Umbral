import type { APIRoute } from 'astro';
import dns from 'node:dns/promises';
import net from 'node:net';
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

/** Devuelve true si el host es una IP privada/loopback/link-local/metadata
 *  (RFC 1918, 127/8, 169.254/16 cloud metadata, IPv6 ULA/link-local, etc.).
 *  Bloquea SSRF contra la propia infra o servicios cloud. */
function isPrivateOrLoopback(host: string): boolean {
  // IPv4 literal
  if (net.isIP(host) === 4) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 10) return true;                          // 10/8
    if (parts[0] === 127) return true;                         // 127/8 loopback
    if (parts[0] === 169 && parts[1] === 254) return true;      // 169.254/16 link-local + cloud metadata
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16/12
    if (parts[0] === 192 && parts[1] === 168) return true;      // 192.168/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64/10 carrier-grade NAT
    if (parts[0] === 0) return true;                           // 0.0.0.0/8
    if (parts[0] >= 224) return true;                          // 224/4 multicast + 240/4 reserved
    return false;
  }
  // IPv6 literal
  if (net.isIP(host) === 6) {
    const lc = host.toLowerCase().split('%')[0];
    if (lc === '::1' || lc === '::') return true;              // loopback + unspecified
    if (lc.startsWith('fc') || lc.startsWith('fd')) return true; // fc00::/7 ULA
    if (lc.startsWith('fe80:')) return true;                    // fe80::/10 link-local
    if (lc.startsWith('ff')) return true;                       // multicast
    return false;
  }
  return false;
}

/** Valida que la URL apunte a un destino público vía http(s). Resuelve el
 *  host por DNS y rechaza si la IP resuelta es privada/loopback/metadata.
 *  Esto cierra el SSRF clásico: admin pone url=http://169.254.169.254/... */
async function isPublicHttpUrl(rawUrl: string): Promise<{ ok: boolean; reason?: string }> {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { ok: false, reason: 'URL inválida' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: `Protocolo ${u.protocol} no permitido` };
  }
  if (isPrivateOrLoopback(u.hostname)) {
    return { ok: false, reason: 'Host bloqueado (privado/loopback)' };
  }
  // DNS lookup: si el hostname resuelve a una IP privada, también bloqueamos.
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    for (const a of addrs) {
      if (isPrivateOrLoopback(a.address)) {
        return { ok: false, reason: 'Host bloqueado (DNS → privado)' };
      }
    }
  } catch (err) {
    return { ok: false, reason: 'DNS lookup falló' };
  }
  return { ok: true };
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

  // Cap total a 50 chequeos para evitar abuso si alguien carga miles de cards.
  const capped = targets.slice(0, 50);

  const checks: CheckResult[] = await Promise.all(
    capped.map(async (c): Promise<CheckResult> => {
      const t0 = Date.now();
      // Bloqueo SSRF: rechaza URLs a infra interna / metadata / loopback.
      const guard = await isPublicHttpUrl(c.url);
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

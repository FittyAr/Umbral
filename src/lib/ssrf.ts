// SSRF (Server-Side Request Forgery) guard.
//
// Usado por /api/status (health check) y /api/fetch-card-info (auto-completar
// tarjeta desde URL). Centralizado acá para que la lógica sea consistente
// entre endpoints y más fácil de testear.
//
// La decisión de si está "permitido" o "bloqueado" la toma el caller leyendo
// `security.network.allowInternalHosts` del config. Este módulo sólo
// clasifica el host.
import dns from 'node:dns/promises';
import net from 'node:net';

/** Devuelve true si el host es una IP privada/loopback/link-local/metadata
 *  (RFC 1918, 127/8, 169.254/16 cloud metadata, IPv6 ULA/link-local, etc.). */
export function isPrivateOrLoopback(host: string): boolean {
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

/**
 * Hosts de metadata de la nube. Se bloquean **siempre**, incluso con
 * `allowInternalHosts` prendido: un portal en LAN quiere monitorear sus
 * servicios internos, no leer las credenciales de la instancia. Estaba
 * escrito a mano como comparación literal en dos endpoints, así que agregar
 * un host nuevo dejaba al otro sin cubrir.
 */
const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
]);

export function isCloudMetadataHost(hostname: string): boolean {
  return CLOUD_METADATA_HOSTS.has(hostname.toLowerCase());
}

/** Resuelve el hostname por DNS y devuelve {ok, reason}. Cierra el bypass
 *  clásico de SSRF: el admin pone url=http://attacker.com/ que devuelve un
 *  redirect a http://127.0.0.1:6379/ (internal redis). Si sólo bloqueamos
 *  el hostname literal, el redirect lo bypasea. */
export async function resolveAndCheckUrl(rawUrl: string): Promise<{ ok: boolean; reason?: string; ip?: string }> {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { ok: false, reason: 'URL inválida' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: `Protocolo ${u.protocol} no permitido` };
  }
  if (isPrivateOrLoopback(u.hostname)) {
    return { ok: false, reason: 'Host bloqueado (privado/loopback)' };
  }
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    for (const a of addrs) {
      if (isPrivateOrLoopback(a.address)) {
        return { ok: false, reason: 'Host bloqueado (DNS → privado)' };
      }
    }
    return { ok: true, ip: addrs[0]?.address };
  } catch (err) {
    return { ok: false, reason: 'DNS lookup falló' };
  }
}

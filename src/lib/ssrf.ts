// SSRF (Server-Side Request Forgery) guard.
//
// Clasifica hosts e IPs. Los fetch salientes no deberían usar esto a mano:
// `safeFetch` (lib/safe-fetch.ts) aplica la misma clasificación a cada salto
// de redirect y a la IP con la que realmente se conecta (DNS rebinding).
//
// La decisión de si está "permitido" o "bloqueado" la toma el caller leyendo
// `security.network.allowInternalHosts` del config. Este módulo sólo
// clasifica.
import dns from 'node:dns/promises';
import net from 'node:net';

// Rangos no públicos (RFC 6890 y compañía). Con BlockList en vez de
// comparaciones a mano: antes faltaban 198.18/15, 192.0.0/24, NAT64,
// fec0::/10 y las IPv4 mapeadas en IPv6 (`::ffff:127.0.0.1` pasaba como
// pública).
const PRIVATE = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC 1918
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + cloud metadata
  ['172.16.0.0', 12], // RFC 1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // RFC 1918
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservado + broadcast
] as const) {
  PRIVATE.addSubnet(addr, prefix, 'ipv4');
}
for (const [addr, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64 (embebe IPv4)
  ['64:ff9b:1::', 48], // NAT64 local
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentación
  ['fc00::', 7], // ULA
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecado)
  ['ff00::', 8], // multicast
] as const) {
  PRIVATE.addSubnet(addr, prefix, 'ipv6');
}

/** Normaliza una IP: sin corchetes ni zona, minúsculas, y las IPv4 mapeadas
 *  o compatibles en IPv6 pasadas a IPv4. Devuelve '' si no es una IP. */
export function normalizeIp(host: string): string {
  let h = host.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  h = h.split('%')[0];
  const family = net.isIP(h);
  if (family === 4) return h;
  if (family !== 6) return '';
  // ::ffff:a.b.c.d / ::ffff:7f00:1 → IPv4
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return h;
}

/** Devuelve true si el host es una IP no pública (privada, loopback,
 *  link-local, metadata, reservada…). Un hostname (no IP) devuelve false:
 *  para eso hay que resolverlo (ver `resolveAndCheckUrl` / `safeFetch`). */
export function isPrivateOrLoopback(host: string): boolean {
  const ip = normalizeIp(host);
  if (!ip) return false;
  return PRIVATE.check(ip, net.isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

/**
 * Hosts de metadata de la nube. Se bloquean **siempre**, incluso con
 * `allowInternalHosts` prendido: un portal en LAN quiere monitorear sus
 * servicios internos, no leer las credenciales de la instancia.
 */
const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',
  'fd00:ec2::254',
  'metadata.google.internal',
  'metadata.goog',
  'metadata.azure.internal',
]);
const METADATA_NET = new net.BlockList();
METADATA_NET.addSubnet('169.254.0.0', 16, 'ipv4');
METADATA_NET.addAddress('fd00:ec2::254', 'ipv6');

/** true si el hostname o la IP (ya resuelta) es de metadata de la nube. */
export function isCloudMetadataHost(hostname: string): boolean {
  const lc = hostname.toLowerCase().replace(/\.$/, '');
  if (CLOUD_METADATA_HOSTS.has(lc)) return true;
  const ip = normalizeIp(lc);
  if (!ip) return false;
  return METADATA_NET.check(ip, net.isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

/** Resuelve el hostname por DNS y valida todas las IPs. Para un fetch real
 *  usar `safeFetch`, que además valida la IP con la que conecta y cada
 *  redirect: este chequeo solo es vulnerable a DNS rebinding. */
export async function resolveAndCheckUrl(
  rawUrl: string,
  opts: { allowInternal?: boolean } = {},
): Promise<{ ok: boolean; reason?: string; ip?: string }> {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { ok: false, reason: 'URL inválida' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: `Protocolo ${u.protocol} no permitido` };
  }
  const check = (host: string) => checkAddress(host, opts.allowInternal === true);
  const direct = check(u.hostname);
  if (direct) return { ok: false, reason: direct };
  if (net.isIP(normalizeIp(u.hostname))) return { ok: true, ip: normalizeIp(u.hostname) };
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    for (const a of addrs) {
      const reason = check(a.address);
      if (reason) return { ok: false, reason: reason.replace('Host', 'Host (DNS)') };
    }
    return { ok: true, ip: addrs[0]?.address };
  } catch {
    return { ok: false, reason: 'DNS lookup falló' };
  }
}

/** Motivo del bloqueo de un host/IP, o null si está permitido. */
export function checkAddress(host: string, allowInternal: boolean): string | null {
  if (isCloudMetadataHost(host)) return 'Host bloqueado (metadata de la nube)';
  if (!allowInternal && isPrivateOrLoopback(host)) return 'Host bloqueado (privado/loopback)';
  return null;
}

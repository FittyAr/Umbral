/**
 * IP del cliente detrás (o no) de un reverse proxy.
 *
 * Con `trustForwardedFor` se tomaba la entrada de más a la IZQUIERDA de
 * X-Forwarded-For. Nginx, Traefik y OpenResty *agregan* al header que manda
 * el cliente, así que esa entrada la elige el atacante: con un XFF distinto
 * por request el rate limit del login no frenaba nada.
 *
 * Ahora se recorre la cadena de derecha a izquierda (socket incluido) y se
 * devuelve el primer salto que no es un proxy confiable:
 * - con `trustedProxies` (IPs o CIDRs) se saltean esos;
 * - sin lista, se confía en un solo salto: el proxy que nos habla por socket,
 *   y la IP es la última entrada que agregó.
 */
import net from 'node:net';

function normalize(ip: string): string {
  let v = ip.trim();
  // "[::1]:1234" / "1.2.3.4:5678"
  if (v.startsWith('[')) v = v.slice(1, v.indexOf(']') > 0 ? v.indexOf(']') : undefined);
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(v)) v = v.slice(0, v.lastIndexOf(':'));
  v = v.toLowerCase();
  // IPv4 mapeada en IPv6: ::ffff:10.0.0.1 → 10.0.0.1
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return mapped ? mapped[1] : v;
}

/** Arma un BlockList con las IPs/CIDRs. Entradas inválidas se ignoran. */
export function buildProxyList(entries: readonly string[]): net.BlockList {
  const list = new net.BlockList();
  for (const raw of entries) {
    const entry = raw.trim();
    if (!entry) continue;
    const [addr, prefix] = entry.split('/');
    const ip = normalize(addr);
    const family = net.isIP(ip);
    if (!family) continue;
    const type = family === 6 ? 'ipv6' : 'ipv4';
    try {
      if (prefix !== undefined) list.addSubnet(ip, Number(prefix), type);
      else list.addAddress(ip, type);
    } catch {
      // prefix inválido: se ignora la entrada
    }
  }
  return list;
}

function isTrusted(ip: string, list: net.BlockList | null): boolean {
  if (!list) return false;
  const family = net.isIP(ip);
  if (!family) return false;
  return list.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}

export function resolveClientIp(opts: {
  socketIp: string;
  forwardedFor?: string | null;
  realIp?: string | null;
  trustForwarded: boolean;
  trustedProxies?: readonly string[];
}): string {
  const socketIp = opts.socketIp && opts.socketIp !== 'unknown' ? normalize(opts.socketIp) : '';
  if (!opts.trustForwarded) return socketIp || 'unknown';

  const hops = (opts.forwardedFor ?? '')
    .split(',')
    .map((h) => normalize(h))
    .filter((h) => net.isIP(h) !== 0);

  if (hops.length === 0) {
    const real = opts.realIp ? normalize(opts.realIp) : '';
    return (net.isIP(real) ? real : socketIp) || 'unknown';
  }

  const proxies = opts.trustedProxies?.length ? buildProxyList(opts.trustedProxies) : null;
  if (!proxies) {
    // Un solo salto confiable: la última entrada la agregó nuestro proxy.
    return hops[hops.length - 1];
  }
  // Si el socket no es un proxy confiable, el XFF lo mandó el cliente.
  if (socketIp && !isTrusted(socketIp, proxies)) return socketIp;
  for (let i = hops.length - 1; i >= 0; i--) {
    if (!isTrusted(hops[i], proxies)) return hops[i];
  }
  return hops[0];
}

/**
 * `fetch` saliente con guardas de SSRF, límite de tamaño y timeout total.
 *
 * Reemplaza el patrón "chequear la URL y después `fetch` con
 * `redirect: 'follow'`", que tenía tres agujeros:
 * - Sólo se validaba la primera URL: `https://evil/` con un 302 a
 *   `http://10.0.0.5/` (o a la metadata de la nube) pasaba.
 * - El chequeo de DNS y la conexión resolvían por separado (DNS rebinding:
 *   la primera respuesta es pública, la segunda privada).
 * - El timeout se cancelaba al llegar los headers; un servidor que mandaba
 *   el body gota a gota colgaba el request y la memoria crecía sin tope.
 *
 * Acá cada salto de redirect se valida, la IP se valida en el `lookup` del
 * socket (la misma con la que se conecta), y el timeout y el tope de bytes
 * cubren también la lectura del body.
 */
import dns from 'node:dns';
import net from 'node:net';
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from 'undici';
import { checkAddress, normalizeIp } from './ssrf';

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly code: 'blocked' | 'too_large' | 'timeout' | 'too_many_redirects' | 'bad_url' | 'network',
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Permite IPs privadas/LAN (`security.network.allowInternalHosts`). La
   *  metadata de la nube se bloquea igual. */
  allowInternal?: boolean;
  /** Timeout total: conexión, redirects y body. */
  timeoutMs?: number;
  /** Tope del body en bytes (default 5 MB). */
  maxBytes?: number;
  /** Redirects a seguir (default 5; 0 = no seguir). */
  maxRedirects?: number;
  /** Si el body supera maxBytes, devolver lo leído hasta ahí en vez de
   *  fallar (útil para scrapear el <head> de un HTML grande). */
  truncate?: boolean;
}

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  headers: Headers;
  url: string;
  body: Buffer;
  text(): string;
  json<T = unknown>(): T;
}

const agents = new Map<boolean, Agent>();

/** Agent cuyo lookup DNS rechaza las IPs bloqueadas: la validación ocurre
 *  sobre la IP con la que efectivamente se abre el socket. */
function agentFor(allowInternal: boolean): Agent {
  let agent = agents.get(allowInternal);
  if (!agent) {
    agent = new Agent({
      connect: {
        lookup(hostname, options, callback) {
          dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
            if (err) return callback(err, '', 0);
            const list = (addresses as dns.LookupAddress[]).filter(
              (a) => checkAddress(a.address, allowInternal) === null,
            );
            if (list.length === 0) {
              return callback(new SafeFetchError(`Host bloqueado: ${hostname}`, 'blocked'), '', 0);
            }
            if ((options as { all?: boolean }).all) {
              return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
            }
            callback(null, list[0].address, list[0].family);
          });
        },
      },
    });
    agents.set(allowInternal, agent);
  }
  return agent;
}

function assertAllowedUrl(raw: string, allowInternal: boolean): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SafeFetchError('URL inválida', 'bad_url');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new SafeFetchError(`Protocolo ${u.protocol} no permitido`, 'bad_url');
  }
  if (u.username || u.password) throw new SafeFetchError('URL con credenciales no permitida', 'bad_url');
  // IP literal: el lookup no corre, así que se valida acá.
  const reason = checkAddress(u.hostname, allowInternal);
  if (reason) throw new SafeFetchError(reason, 'blocked');
  if (net.isIP(normalizeIp(u.hostname)) === 0 && /^(localhost|.*\.localhost)$/i.test(u.hostname) && !allowInternal) {
    throw new SafeFetchError('Host bloqueado (localhost)', 'blocked');
  }
  return u;
}

export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const allowInternal = opts.allowInternal === true;
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
  const maxRedirects = opts.maxRedirects ?? 5;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000);
  let method = (opts.method ?? 'GET').toUpperCase();
  let body = opts.body;
  try {
    let url = assertAllowedUrl(rawUrl, allowInternal);
    for (let hop = 0; ; hop++) {
      const init: UndiciRequestInit = {
        method,
        headers: opts.headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
        redirect: 'manual',
        signal: ctrl.signal,
        dispatcher: agentFor(allowInternal),
      };
      const res = await undiciFetch(url.toString(), init);
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location && maxRedirects > 0) {
        await res.body?.cancel().catch(() => {});
        if (hop >= maxRedirects) throw new SafeFetchError('Demasiados redirects', 'too_many_redirects');
        url = assertAllowedUrl(new URL(location, url).toString(), allowInternal);
        // 303 (y 301/302 sobre POST, como los navegadores) pasan a GET.
        if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) {
          method = 'GET';
          body = undefined;
        }
        continue;
      }
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes && !opts.truncate) {
        await res.body?.cancel().catch(() => {});
        throw new SafeFetchError(`Respuesta demasiado grande (${declared} bytes)`, 'too_large');
      }
      const chunks: Buffer[] = [];
      let total = 0;
      if (res.body && method !== 'HEAD') {
        for await (const chunk of res.body) {
          total += chunk.byteLength;
          if (total > maxBytes) {
            if (opts.truncate) {
              chunks.push(Buffer.from(chunk).subarray(0, chunk.byteLength - (total - maxBytes)));
              ctrl.abort();
              break;
            }
            ctrl.abort();
            throw new SafeFetchError(`Respuesta demasiado grande (>${maxBytes} bytes)`, 'too_large');
          }
          chunks.push(Buffer.from(chunk));
        }
      }
      const buf = Buffer.concat(chunks);
      const headers = new Headers();
      res.headers.forEach((v, k) => headers.append(k, v));
      return {
        status: res.status,
        ok: res.ok,
        headers,
        url: url.toString(),
        body: buf,
        text: () => buf.toString('utf8'),
        json: <T,>() => JSON.parse(buf.toString('utf8')) as T,
      };
    }
  } catch (err) {
    if (err instanceof SafeFetchError) throw err;
    const cause = (err as { cause?: unknown }).cause;
    if (cause instanceof SafeFetchError) throw cause;
    if (ctrl.signal.aborted) throw new SafeFetchError('Timeout', 'timeout');
    throw new SafeFetchError((err as Error).message || 'Error de red', 'network');
  } finally {
    clearTimeout(timer);
  }
}

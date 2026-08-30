import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { getConfig } from '~/lib/config';
import { processAndStore, UploadError } from '~/lib/upload';
import { isCloudMetadataHost, resolveAndCheckUrl } from '~/lib/ssrf';

export const prerender = false;

type AssetKind = 'icon' | 'logo' | 'favicon' | 'background';
const ASSET_KINDS: readonly AssetKind[] = ['icon', 'logo', 'favicon', 'background'];

/** POST /api/upload-from-url
 *
 *  Body: { url: string, kind?: 'icon' | 'logo' | 'favicon' | 'background' }
 *  Descarga la imagen del URL server-side, valida MIME/tamaño, y la
 *  guarda como asset. Devuelve { url, name, bytes, mime } igual que
 *  /api/upload.
 *
 *  Por qué existe: el browser del user tiene CSP `connect-src 'self'`,
 *  entonces NO puede fetchear imágenes externas (Wikipedia thumbs,
 *  Google favicons, etc.) directo desde el cliente. Hacemos el
 *  download server-side y el browser sólo ve una request same-origin.
 *
 *  Seguridad:
 *  - Bloquea hosts privados/loopback (mismas reglas SSRF que el
 *    health check). El user puede flagear `allowInternalHosts: true`
 *    en Hardening para que esto funcione con servicios internos
 *    (mismo toggle, mismo comportamiento).
 *  - Bloquea metadata cloud (169.254.169.254) SIEMPRE.
 *  - Cap según el kind del asset (igual que /api/upload).
 *  - Sólo permite image/* MIME types.
 *  - 10s timeout.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { url?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body.url) return error('Falta el campo "url"', 400);

  // Validar el kind
  const kind: AssetKind = (ASSET_KINDS as readonly string[]).includes(body.kind || 'icon')
    ? (body.kind as AssetKind)
    : 'icon';
  const limits: Record<AssetKind, number> = {
    icon: 512 * 1024,
    logo: 1 * 1024 * 1024,
    favicon: 256 * 1024,
    background: 5 * 1024 * 1024,
  };
  const maxBytes = limits[kind];

  // Validar la URL
  let parsed: URL;
  try { parsed = new URL(body.url); } catch { return error('URL inválida', 400); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return error(`Protocolo ${parsed.protocol} no permitido (sólo http/https)`, 400);
  }

  // SSRF guard
  const cfg = await getConfig();
  const allowInternal = cfg.security.network.allowInternalHosts !== false;
  if (!allowInternal) {
    const check = await resolveAndCheckUrl(body.url);
    if (!check.ok) {
      return error(check.reason || 'Host bloqueado por SSRF. Si es deploy interno, activá "Permitir hosts internos" en Hardening.', 400);
    }
  } else if (isCloudMetadataHost(parsed.hostname)) {
    return error('Cloud metadata bloqueado por seguridad', 400);
  }

  // Download con timeout y cap
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let buf: Buffer;
  let contentType: string;
  try {
    const res = await fetch(body.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // User-agent genérico (Wikipedia, Google favicons, etc. a veces
        // bloquean user-agents raros o sirven HTML de error)
        'User-Agent': 'Mozilla/5.0 (compatible; UmbralBot/1.0; +https://github.com/FittyAr/Umbral)',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });
    // BUGFIX (console flooded with 502 reportado por el user): cuando el
    // scraper del /api/fetch-card-info encuentra una og:image o favicon que
    // apunta a un recurso que NO existe (ej: Wikipedia thumbnail con .svg
    // renombrado a .png, favicon de IP interna que no tiene /favicon, etc.),
    // el origen devuelve 4xx. Antes respondíamos 502 Bad Gateway acá, que
    // técnicamente es correcto pero ensucia la consola del admin con
    // errores que en realidad significan "el ícono no está, seguí sin él".
    //
    // Diferenciamos 4xx (recurso no existe → soft fail, no es culpa del
    // proxy) de 5xx (el origen está roto → sí es culpa del proxy). 4xx
    // devuelve 200 con {ok:false, reason:'not_found'}; el cliente
    // simplemente no setea el ícono y sigue con el resto del autofill
    // (title/description). 5xx y errores de red siguen siendo 502/504.
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        return json({ ok: false, reason: 'not_found', status: res.status });
      }
      return error(`El origen respondió HTTP ${res.status}`, 502);
    }
    contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return error(`El origen devolvió content-type "${contentType}", se esperaba image/*`, 415);
    }
    const reader = res.body?.getReader();
    if (!reader) return error('Sin body en la respuesta', 502);
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return error(`Imagen demasiado grande (${Math.round(received / 1024)} KB, máx ${Math.round(maxBytes / 1024)} KB para ${kind})`, 413);
      }
      chunks.push(value);
    }
    buf = Buffer.concat(chunks);
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      return error('Timeout (10s) descargando la imagen', 504);
    }
    return error(`No se pudo descargar: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  // Guardado por el mismo camino que /api/upload.
  //
  // Antes esto escribía los bytes crudos a disco con su propio `writeFile`,
  // salteándose todo lo que hace `processAndStore`: la extensión salía del
  // content-type que elige el origen (no de los bytes), y un SVG llegaba sin
  // pasar por DOMPurify. Con `image/svg+xml` en la whitelist por default y
  // una CSP que permite `script-src 'self' 'unsafe-inline'`, un `<script>`
  // dentro de ese SVG corría en nuestro propio origen al abrir
  // /api/assets/<nombre>.
  try {
    const stored = await processAndStore(
      new File([new Uint8Array(buf)], 'external', { type: contentType }),
      kind,
    );
    return json({
      url: stored.publicUrl,
      name: stored.storedName,
      bytes: stored.bytes,
      mime: stored.mime,
    });
  } catch (err) {
    if (err instanceof UploadError) return error(err.message, err.status);
    return error(`No se pudo guardar el asset: ${(err as Error).message}`, 500);
  }
};

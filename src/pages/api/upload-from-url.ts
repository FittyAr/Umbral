import type { APIRoute } from 'astro';
import { json, error, readJson } from '~/lib/http';
import { getConfig } from '~/lib/config';
import { processAndStore, UploadError } from '~/lib/upload';
import { safeFetch, SafeFetchError } from '~/lib/safe-fetch';

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
    body = await readJson(request);
  } catch {
    return error('JSON inválido', 400);
  }
  if (!body.url) return error('Falta el campo "url"', 400);

  // Validar el kind
  const kind: AssetKind = (ASSET_KINDS as readonly string[]).includes(body.kind || 'icon')
    ? (body.kind as AssetKind)
    : 'icon';
  // Mismos topes que /api/upload (security.uploads.maxBytes*): estaban
  // hardcodeados acá y no seguían lo que el admin configura en Hardening.
  const cfg = await getConfig();
  const up = cfg.security.uploads;
  const limits: Record<AssetKind, number> = {
    icon: up.maxBytesIcon,
    logo: up.maxBytesLogo,
    favicon: up.maxBytesFavicon,
    background: up.maxBytesBackground,
  };
  const maxBytes = limits[kind];

  // Download: safeFetch valida la URL, cada redirect y la IP de conexión
  // (SSRF), y el timeout y el tope cubren también el body.
  const allowInternal = cfg.security.network.allowInternalHosts !== false;
  let buf: Buffer;
  let contentType: string;
  try {
    const res = await safeFetch(body.url, {
      allowInternal,
      timeoutMs: 10_000,
      maxBytes,
      headers: {
        // User-agent genérico (Wikipedia, Google favicons, etc. a veces
        // bloquean user-agents raros o sirven HTML de error)
        'User-Agent': 'Mozilla/5.0 (compatible; UmbralBot/1.0; +https://github.com/FittyAr/Umbral)',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });
    // 4xx del origen (og:image o favicon inexistente) → 200 con
    // {ok:false, reason:'not_found'}: el cliente sigue sin ícono y la
    // consola no se llena de 502. 5xx sí es error del origen.
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
    buf = res.body;
  } catch (err) {
    if (err instanceof SafeFetchError) {
      if (err.code === 'blocked' || err.code === 'bad_url') {
        return error(`${err.message}. Si es deploy interno, activá "Permitir hosts internos" en Hardening.`, 400);
      }
      if (err.code === 'too_large') {
        return error(`Imagen demasiado grande (máx ${Math.round(maxBytes / 1024)} KB para ${kind})`, 413);
      }
      if (err.code === 'timeout') return error('Timeout (10s) descargando la imagen', 504);
    }
    return error('No se pudo descargar la imagen', 502);
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
      ok: true,
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

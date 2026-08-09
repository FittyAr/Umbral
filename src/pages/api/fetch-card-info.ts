import type { APIRoute } from 'astro';
import { JSDOM } from 'jsdom';
import { json, error } from '~/lib/http';
import { getConfig } from '~/lib/config';
import { resolveAndCheckUrl } from '~/lib/ssrf';

export const prerender = false;

/** GET /api/fetch-card-info?url=…
 *
 *  Devuelve { title, description, image } extraído del HTML de la URL.
 *  Pensado para el "auto-completar" del form de tarjeta en el admin: el
 *  user pega una URL, presiona un botón, y el form se rellena con el
 *  <title> + <meta description> + <og:image> (o favicon) del sitio.
 *
 *  Protección:
 *  - Bloquea hosts privados/loopback/metadata cuando el deploy es público
 *    (security.network.allowInternalHosts === false). En deploys internos
 *    (default), los hosts privados están permitidos.
 *  - Timeout de 8s en el fetch — el form no debería colgarse esperando.
 *  - Cap de 2MB de HTML descargado (suficiente para un <head> completo).
 *  - Solo http(s) — bloquea javascript:, data:, file:, etc.
 */
export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) {
    return error('Falta el parámetro url', 400);
  }
  let parsed: URL;
  try { parsed = new URL(target); } catch { return error('URL inválida', 400); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return error(`Protocolo ${parsed.protocol} no permitido (sólo http/https)`, 400);
  }

  const cfg = await getConfig();
  const allowInternal = cfg.security.network.allowInternalHosts !== false;

  if (!allowInternal) {
    // Modo estricto: bloquea SSRF contra infra/metadata.
    const dnsCheck = await resolveAndCheckUrl(target);
    if (!dnsCheck.ok) return error(dnsCheck.reason || 'Host bloqueado. Activá "Permitir hosts internos" si es deploy interno.', 400);
  } else {
    // Modo permisivo: igual validamos que el hostname no sea metadata obvio
    // (169.254.169.254) — eso es un riesgo incluso en LAN. Pero IPs internas
    // comunes (10/8, 192.168/16) las dejamos pasar.
    if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
      return error('Cloud metadata bloqueado por seguridad', 400);
    }
  }

  // Fetch con timeout y cap de tamaño.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html = '';
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Identificador genérico — muchos sitios devuelven HTML distinto (o
        // un 403) si ven "JavaScript" o "python-requests" en el UA.
        'User-Agent': 'Mozilla/5.0 (compatible; UmbralBot/1.0; +https://github.com/FittyAr/Umbral)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return error(`Sitio respondió HTTP ${res.status}`, 502);
    // Leer con cap de 2MB. Si el sitio devuelve más, lo cortamos — sólo
    // necesitamos el <head>.
    const reader = res.body?.getReader();
    if (!reader) return error('Sitio no devolvió contenido', 502);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let received = 0;
    const MAX = 2 * 1024 * 1024;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX) {
        await reader.cancel();
        break;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      return error('Timeout (8s) leyendo el sitio', 504);
    }
    return error(`No se pudo leer la URL: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  // Parsear con jsdom (mismo approach que docs/[...slug].astro).
  let dom: JSDOM;
  try { dom = new JSDOM(html); } catch {
    return error('El sitio devolvió HTML inválido', 502);
  }
  const doc = dom.window.document;

  // Title: <title> es la primera opción, sino og:title.
  const title =
    metaContent(doc, 'meta[property="og:title"]')
    || doc.querySelector('title')?.textContent?.trim()
    || metaContent(doc, 'meta[name="twitter:title"]')
    || '';

  // Description: og:description > meta description > twitter:description.
  const description =
    metaContent(doc, 'meta[property="og:description"]')
    || metaContent(doc, 'meta[name="description"]')
    || metaContent(doc, 'meta[name="twitter:description"]')
    || '';

  // Image: og:image > twitter:image > favicon.
  let image = metaContent(doc, 'meta[property="og:image"]')
    || metaContent(doc, 'meta[name="twitter:image"]')
    || '';
  if (!image) {
    const iconHref =
      doc.querySelector('link[rel="icon"]')?.getAttribute('href')
      || doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href')
      || '/favicon.ico';
    image = new URL(iconHref, target).toString();
  }

  // Limpiar title (suelen venir con " | Nombre del sitio" o " - Nombre").
  const cleanedTitle = cleanTitle(title);

  return json({
    title: cleanedTitle.slice(0, 200),
    description: description.slice(0, 500),
    image,
  });
};

function metaContent(doc: Document, selector: string): string {
  const el = doc.querySelector(selector);
  return (el?.getAttribute('content') || '').trim();
}

/** Quita sufijos tipo " | NombreSitio" del title cuando es obvio. La
 *  heurística: si el primer segmento después del separador es MUY corto
 *  (≤ 5 chars) y el segundo es largo, asumimos que el segundo es el título
 *  real (ej: "GitHub · Change is constant..." → "Change is constant...").
 *  Si los dos segmentos son similares o el primero es largo, devolvemos el
 *  original (caso conservador: mejor title largo que title mal cortado). */
function cleanTitle(title: string): string {
  if (!title) return '';
  const separators = [' | ', ' - ', ' · ', ' — ', ' – ', ' :: '];
  for (const sep of separators) {
    if (!title.includes(sep)) continue;
    const parts = title.split(sep);
    if (parts.length !== 2) return title.trim();
    const [first, second] = parts;
    const f = first.trim();
    const s = second.trim();
    // Caso: primer segmento corto (probable nombre de sitio) y segundo largo.
    // Devolvemos el segundo como title.
    if (f.length <= 8 && s.length > f.length * 1.5) return s;
    // Default conservador: devolver tal cual.
    return title.trim();
  }
  return title.trim();
}

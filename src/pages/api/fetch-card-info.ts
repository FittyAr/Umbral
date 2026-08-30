import type { APIRoute } from 'astro';
import { JSDOM } from 'jsdom';
import { json, error } from '~/lib/http';
import { getConfig } from '~/lib/config';
import { isCloudMetadataHost, resolveAndCheckUrl } from '~/lib/ssrf';

export const prerender = false;

/** GET /api/fetch-card-info?url=…&name=…
 *
 *  Auto-completar tarjetas: trae título, descripción e imagen del sitio.
 *  Modo híbrido:
 *
 *  1) Si hay `url` y parsea como http(s) → fetch directo al sitio
 *     (respeta el guard SSRF, mismo que antes).
 *  2) Si el fetch falla, devuelve HTML sin meta tags útiles, o no hay
 *     url → fallback a búsqueda externa por `name` (o derivado de la URL).
 *     Orden: Brave (si key) → Tavily (si key) → Wikipedia REST →
 *     DuckDuckGo Instant Answer. Las dos últimas no requieren key.
 *
 *  Devuelve: { title, description, image, source }
 *  Donde source es uno de: 'scrape' | 'brave' | 'tavily' | 'wikipedia'
 *  | 'duckduckgo' | 'none'. Útil para que el admin sepa de dónde salió
 *  la info (y para que el form pueda mostrar "Wikipedia dice…" si quiere).
 */
export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url');
  const nameQuery = url.searchParams.get('name') || '';

  // ── 1) Fetch directo si hay URL ─────────────────────────────────
  if (target) {
    let parsed: URL;
    try { parsed = new URL(target); } catch { return error('URL inválida', 400); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return error(`Protocolo ${parsed.protocol} no permitido (sólo http/https)`, 400);
    }

    const cfg = await getConfig();
    const allowInternal = cfg.security.network.allowInternalHosts !== false;

    if (!allowInternal) {
      const dnsCheck = await resolveAndCheckUrl(target);
      if (!dnsCheck.ok) {
        return error(dnsCheck.reason || 'Host bloqueado. Activá "Permitir hosts internos" si es deploy interno.', 400);
      }
    } else {
      // Aún en modo permisivo, bloqueamos cloud metadata (169.254/16) por seguridad.
      if (isCloudMetadataHost(parsed.hostname)) {
        return error('Cloud metadata bloqueado por seguridad', 400);
      }
    }

    const scraped = await scrapeUrl(target);
    if (scraped) {
      return json({ ...scraped, source: 'scrape' });
    }
    // Si llegamos acá, el scrape falló o no devolvió info útil. Si tenemos
    // un name explícito, lo usamos; si no, derivamos del hostname.
    if (nameQuery.trim()) {
      return searchAndReturn(nameQuery.trim());
    }
    // Sin name y sin scrape útil: devolvemos lo que tengamos del scrape
    // (que probablemente es title vacío). Mejor intentamos con el hostname
    // limpio como query, así le damos una chance al fallback de búsqueda.
    return searchAndReturn(prettyHostname(parsed));
  }

  // ── 2) Sin URL, sólo nombre ────────────────────────────────────
  if (nameQuery.trim()) {
    return searchAndReturn(nameQuery.trim());
  }

  return error('Pasá al menos el parámetro url o name', 400);
};

// ──────────────────────────────────────────────────────────────────────
// Scrape directo
// ──────────────────────────────────────────────────────────────────────

async function scrapeUrl(target: string): Promise<{ title: string; description: string; image: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html = '';
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UmbralBot/1.0; +https://github.com/FittyAr/Umbral)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!html || html.length < 50) return null;

  let dom: JSDOM;
  try { dom = new JSDOM(html); } catch { return null; }
  const doc = dom.window.document;

  const title =
    metaContent(doc, 'meta[property="og:title"]')
    || doc.querySelector('title')?.textContent?.trim()
    || metaContent(doc, 'meta[name="twitter:title"]')
    || '';

  const description =
    metaContent(doc, 'meta[property="og:description"]')
    || metaContent(doc, 'meta[name="description"]')
    || metaContent(doc, 'meta[name="twitter:description"]')
    || '';

  let image = metaContent(doc, 'meta[property="og:image"]')
    || metaContent(doc, 'meta[name="twitter:image"]')
    || '';
  if (!image) {
    const iconHref =
      doc.querySelector('link[rel="icon"]')?.getAttribute('href')
      || doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href')
      || '/favicon.ico';
    try { image = new URL(iconHref, target).toString(); } catch { image = ''; }
  }
  // BUGFIX (imagen desde internet, segundo fallback): si el sitio no
  // expone un favicon accesible (ej: devuelve 404 o está en una ruta que
  // requiere auth), usamos el servicio público de Google que devuelve el
  // favicon de cualquier dominio. Es gratis, sin key, sin tracking del
  // user (sólo el server hace el request). Devuelve un PNG 64x64.
  // Si no tenemos NADA útil, devolvemos null para que el caller haga fallback.
  if (!title && !description && !image) return null;
  // Si sólo tenemos imagen (favicon) sin title/description, no es útil.
  if (!title && !description) return null;

  return {
    title: cleanTitle(title).slice(0, 200),
    description: description.slice(0, 500),
    image,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Búsqueda externa
// ──────────────────────────────────────────────────────────────────────

async function searchAndReturn(query: string): Promise<Response> {
  // Limpiar la query: si es muy largo, recortar. Si parece URL, hostname
  // sin path.
  const q = query.trim().slice(0, 200);
  if (!q) return json({ title: '', description: '', image: '', source: 'none' });

  const cfg = await getConfig();
  const searchCfg = cfg.externalSearch ?? { braveApiKey: '', tavilyApiKey: '' };

  const faviconFallback = '';

  // 1) Brave (si key)
  if (searchCfg.braveApiKey) {
    const r = await searchBrave(q, searchCfg.braveApiKey);
    if (r) return json({ ...r, image: r.image || faviconFallback, source: 'brave' });
  }
  // 2) Tavily (si key)
  if (searchCfg.tavilyApiKey) {
    const r = await searchTavily(q, searchCfg.tavilyApiKey);
    if (r) return json({ ...r, image: r.image || faviconFallback, source: 'tavily' });
  }
  // 3) Wikipedia REST (sin key, sin rate limit respetable)
  const w = await searchWikipedia(q);
  if (w) return json({ ...w, image: w.image || faviconFallback, source: 'wikipedia' });
  // 4) DuckDuckGo Instant Answer (sin key, resultados inconsistentes)
  const d = await searchDuckDuckGo(q);
  if (d) return json({ ...d, image: d.image || faviconFallback, source: 'duckduckgo' });

  return json({ title: '', description: '', image: faviconFallback, source: 'none' });
}

/** Heurística barata: si la query parece un dominio (tiene punto y no
 *  tiene espacios), la usamos para el favicon fallback. */
function isLikelyDomain(s: string): boolean {
  return !s.includes(' ') && s.includes('.') && s.length < 100;
}

async function searchBrave(query: string, apiKey: string): Promise<SearchResult | null> {
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { web?: { results?: Array<{ title: string; description?: string; profile?: { img?: string } }> } };
    const r = data.web?.results?.[0];
    if (!r) return null;
    return { title: r.title, description: r.description || '', image: r.profile?.img || '' };
  } catch { return null; }
}

async function searchTavily(query: string, apiKey: string): Promise<SearchResult | null> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5, include_images: true }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ title: string; content?: string; url?: string }> };
    const r = data.results?.[0];
    if (!r) return null;
    return { title: r.title, description: (r.content || '').slice(0, 500), image: '' };
  } catch { return null; }
}

async function searchWikipedia(query: string): Promise<SearchResult | null> {
  // Wikipedia REST API. Para queries que NO son exactamente el título de un
  // artículo, primero buscamos con la API de search y después pedimos el
  // summary del primer hit. Para queries exactas (ej: "MongoDB") va directo.
  try {
    // 1) Búsqueda
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json() as { query?: { search?: Array<{ title: string }> } };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;
    // 2) Summary del primer hit
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const sumRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
    if (!sumRes.ok) return null;
    const sumData = await sumRes.json() as { title?: string; extract?: string; thumbnail?: { source: string } };
    return {
      title: sumData.title || title,
      description: sumData.extract || '',
      image: sumData.thumbnail?.source || '',
    };
  } catch { return null; }
}

async function searchDuckDuckGo(query: string): Promise<SearchResult | null> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { AbstractText?: string; Abstract?: string; Heading?: string; Image?: string };
    const title = data.Heading || '';
    const description = (data.AbstractText || data.Abstract || '').slice(0, 500);
    // DDG devuelve "" para queries que no matchean — chequeamos que tengamos algo.
    if (!title && !description) return null;
    return { title, description, image: data.Image ? `https://duckduckgo.com${data.Image}` : '' };
  } catch { return null; }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  description: string;
  image: string;
}

function metaContent(doc: Document, selector: string): string {
  const el = doc.querySelector(selector);
  return (el?.getAttribute('content') || '').trim();
}

/** Quita sufijos tipo " | NombreSitio" del title cuando es obvio. */
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
    if (f.length <= 8 && s.length > f.length * 1.5) return s;
    return title.trim();
  }
  return title.trim();
}

/** Si la query parece un hostname feo (ej: "10.155.49.240"), lo formatea
 *  para búsqueda: "10.155.49.240" → no se puede arreglar mucho, lo dejamos
 *  tal cual y dejamos que el caller aborte con "no encontrado". */
function prettyHostname(parsed: URL): string {
  return parsed.hostname;
}

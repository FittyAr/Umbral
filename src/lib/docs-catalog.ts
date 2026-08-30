import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Catálogo de la documentación: recorre `docs/`, saca título y bajada de cada
 * archivo y agrupa por sección.
 *
 * Estaba inline en `docs/index.astro` y corría completo en **cada** request:
 * `readdir` recursivo más un `readFile` de cada `.md`. Era, por lejos, el
 * trabajo por request más caro de las páginas públicas.
 *
 * Ahora se memoiza y se invalida por el `mtime` más nuevo del árbol, así que
 * editar un `.md` se refleja igual sin reiniciar: el walk de directorios
 * (baratо, sólo metadata) corre siempre; la lectura y el parseo de los
 * archivos, sólo cuando algo cambió.
 *
 * Las etiquetas de sección también vivían duplicadas en las dos páginas de
 * docs, y a la copia de `[...slug].astro` le faltaba `general`.
 */
const DOCS_DIR = path.join(process.cwd(), 'docs');

export interface DocFile {
  /** Slug de la URL: `install/quickstart`, o sea el path sin `.md`. */
  slug: string;
  /** Título tomado del primer H1 del archivo. */
  title: string;
  /** Primer párrafo o TL;DR, para la descripción del índice. */
  description: string;
  /** Sección de primer nivel: install | config | usage | dev | '' (raíz). */
  section: string;
}

export const SECTION_LABELS: Record<string, string> = {
  install: 'Instalación',
  config: 'Configuración',
  usage: 'Uso',
  dev: 'Desarrollo',
  general: 'General',
};

interface Entry {
  abs: string;
  slug: string;
  mtimeMs: number;
}

let cache: { fingerprint: string; docs: DocFile[] } | null = null;

async function collect(dir: string, prefix: string, out: Entry[]): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(full, prefix ? `${prefix}/${entry.name}` : entry.name, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (entry.name.toLowerCase() === 'readme.md') continue;
    const name = entry.name.replace(/\.md$/, '');
    try {
      const stat = await fs.stat(full);
      out.push({ abs: full, slug: prefix ? `${prefix}/${name}` : name, mtimeMs: stat.mtimeMs });
    } catch { /* archivo ilegible: lo salteamos */ }
  }
}

/** Lista los docs, releyendo del disco sólo si el árbol cambió. */
export async function listDocs(): Promise<DocFile[]> {
  const entries: Entry[] = [];
  await collect(DOCS_DIR, '', entries);
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  const fingerprint = entries.map((e) => `${e.slug}:${e.mtimeMs}`).join('|');

  if (cache && cache.fingerprint === fingerprint) return cache.docs;

  const docs: DocFile[] = [];
  for (const entry of entries) {
    try {
      let raw = await fs.readFile(entry.abs, 'utf8');
      // BOM: Notepad y `Set-Content -Encoding UTF8` lo agregan, y sin sacarlo
      // el primer H1 no matchea porque la línea arranca con \uFEFF.
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      const { title, description } = parseDocMeta(raw);
      docs.push({
        slug: entry.slug,
        title,
        description,
        section: entry.slug.includes('/') ? entry.slug.split('/')[0] : '',
      });
    } catch { /* archivo ilegible: lo salteamos */ }
  }
  docs.sort((a, b) => (a.section !== b.section
    ? a.section.localeCompare(b.section)
    : a.title.localeCompare(b.title)));

  cache = { fingerprint, docs };
  return docs;
}

/** Agrupa por sección, con los sin-sección bajo `general`. */
export function groupDocsBySection(docs: DocFile[]): Map<string, DocFile[]> {
  const grouped = new Map<string, DocFile[]>();
  for (const doc of docs) {
    const key = doc.section || 'general';
    const arr = grouped.get(key) ?? [];
    arr.push(doc);
    grouped.set(key, arr);
  }
  return grouped;
}

/**
 * Resuelve el slug a un archivo dentro de `docs/`, rechazando cualquier cosa
 * que intente salirse del directorio.
 */
export function resolveDocFile(slugParam: string | undefined): { abs: string; rel: string } | null {
  if (!slugParam) return null;
  if (/[\\:\0]/.test(slugParam)) return null;
  const safe = slugParam
    .split('/')
    .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, ''))
    .filter(Boolean)
    .join('/');
  if (!safe) return null;
  const abs = path.resolve(DOCS_DIR, `${safe}.md`);
  const rel = path.relative(DOCS_DIR, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return { abs, rel };
}

/** Abre en pestaña nueva los links externos del HTML ya sanitizado. */
const EXTERNAL_LINK_RE = /<a\s+(?![^>]*\btarget=)([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>/g;

const pageCache = new Map<string, { mtimeMs: number; title: string; html: string }>();

/**
 * Devuelve el HTML renderizado de un doc, o `null` si el slug no resuelve a
 * un archivo legible.
 *
 * Cachea por `mtime`: el markdown es estático entre ediciones, y parsearlo con
 * marked más sanitizarlo con DOMPurify en cada visita era trabajo repetido.
 * El cache está acotado por la cantidad de archivos en `docs/`, así que no
 * crece sin control.
 */
export async function loadDocPage(
  slugParam: string | undefined,
  render: (md: string) => string,
): Promise<{ title: string; html: string } | null> {
  const resolved = resolveDocFile(slugParam);
  if (!resolved) return null;

  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(resolved.abs)).mtimeMs;
  } catch {
    return null;
  }

  const hit = pageCache.get(resolved.abs);
  if (hit && hit.mtimeMs === mtimeMs) return { title: hit.title, html: hit.html };

  let raw: string;
  try {
    raw = await fs.readFile(resolved.abs, 'utf8');
  } catch {
    return null;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const titleMatch = raw.match(/^#\s+(.+?)$/m);
  const title = titleMatch?.[1]
    ?.replace(/^Umbral\s*—\s*/i, '')
    .replace(/^Documentación\s*—\s*/i, '')
    .trim() ?? 'Documentación';
  const html = render(raw).replace(EXTERNAL_LINK_RE, '<a $1href="$2" target="_blank" rel="noopener noreferrer"$3>');

  pageCache.set(resolved.abs, { mtimeMs, title, html });
  return { title, html };
}

/**
 * Saca título y descripción del markdown: primer `# ` como título y el primer
 * párrafo (o el blockquote de TL;DR) como descripción.
 */
export function parseDocMeta(md: string): { title: string; description: string } {
  const lines = md.split(/\r?\n/);
  let title = '';
  let description = '';
  let inBlockquote = false;
  let pastTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith('# ')) {
      title = trimmed
        .replace(/^#\s+/, '')
        .replace(/^Umbral\s*—\s*/i, '')
        .replace(/^Documentación\s*—\s*/i, '')
        .trim();
      pastTitle = true;
      continue;
    }
    if (!pastTitle || description) continue;
    if (trimmed === '' || trimmed.startsWith('#')) {
      inBlockquote = false;
      continue;
    }
    if (trimmed.startsWith('>')) {
      inBlockquote = true;
      description = trimmed.replace(/^>\s*/, '').replace(/^>\s*/, '').slice(0, 200);
      continue;
    }
    if (inBlockquote) {
      inBlockquote = false;
    }
    description = trimmed.slice(0, 200);
    break;
  }
  return { title: title || '(sin título)', description };
}

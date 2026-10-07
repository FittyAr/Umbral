import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

export const MARKDOWN_ALLOWED_TAGS = [
  'a', 'b', 'i', 'em', 'strong', 'p', 'br', 'hr', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'span', 'div', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
] as const;

export const MARKDOWN_ALLOWED_ATTR = ['href', 'title', 'alt', 'src', 'class'] as const;

export const MARKDOWN_ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

let purifier: ReturnType<typeof createDOMPurify> | null = null;

export function getPurifier(): ReturnType<typeof createDOMPurify> {
  if (purifier) return purifier;
  const dom = new JSDOM('');
  purifier = createDOMPurify(dom.window as unknown as Parameters<typeof createDOMPurify>[0]);
  // Todo link que abre en otra pestaña lleva rel="noopener noreferrer": sin
  // eso la página destino obtiene `window.opener` y puede redirigir la
  // pestaña de Umbral (tabnabbing).
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return purifier;
}

export interface SanitizeOptions {
  /** Desarma los `<a>` (se queda el texto). Para descripciones dentro de
   *  una tarjeta que ya es un link: un `<a>` anidado es HTML inválido y el
   *  parser cerraba el link de la tarjeta antes de tiempo. */
  noLinks?: boolean;
}

export function sanitizeHtml(raw: string, opts: SanitizeOptions = {}): string {
  return getPurifier().sanitize(raw, {
    ALLOWED_TAGS: opts.noLinks ? MARKDOWN_ALLOWED_TAGS.filter((t) => t !== 'a') : [...MARKDOWN_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_ALLOWED_ATTR],
    ALLOWED_URI_REGEXP: MARKDOWN_ALLOWED_URI_REGEXP,
  });
}

export async function renderMarkdown(src: string, opts: SanitizeOptions = {}): Promise<string> {
  if (!src) return '';
  const raw = await marked.parse(src, {
    gfm: true,
    breaks: true,
    async: true,
  });
  return sanitizeHtml(typeof raw === 'string' ? raw : String(raw), opts);
}

export function renderMarkdownSync(src: string): string {
  if (!src) return '';
  const raw = marked.parse(src, {
    gfm: true,
    breaks: true,
    async: false,
  });
  return sanitizeHtml(typeof raw === 'string' ? raw : String(raw));
}

export function renderDocsMarkdown(src: string): string {
  if (!src) return '';
  const raw = marked.parse(src, { gfm: true, breaks: false, async: false });
  return getPurifier().sanitize(typeof raw === 'string' ? raw : String(raw), {
    ALLOWED_TAGS: [
      ...MARKDOWN_ALLOWED_TAGS,
      'h1', 'h4', 'h5', 'h6', 'del', 'kbd', 'samp', 'sub', 'sup', 'input',
    ],
    ALLOWED_ATTR: [...MARKDOWN_ALLOWED_ATTR, 'checked', 'disabled', 'type', 'rel', 'target', 'id'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

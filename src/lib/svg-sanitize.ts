/**
 * Sanitizado de SVG con DOMPurify (perfil SVG).
 *
 * Único camino para todo SVG que se sirve desde nuestro origen: subidas
 * (`/api/assets`) e icon packs (`/api/icons`). Los SVG de packs se escribían
 * tal cual venían del repo; un repo hostil (o un upstream comprometido) podía
 * meter un `<script>` que corría en el origen de Umbral al abrir la URL del
 * ícono. Y el camino "sin sanitizar" de las subidas usaba un regex que no
 * cubría `<svg/onload=…>`, `javascript:` en href ni `foreignObject`.
 */
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// jsdom es pesado: una sola ventana para todo el proceso.
let purify: ReturnType<typeof createDOMPurify> | null = null;

function getPurify(): ReturnType<typeof createDOMPurify> {
  if (purify) return purify;
  const instance = createDOMPurify(new JSDOM('').window as unknown as Window & typeof globalThis);
  // `<use href>` / `<image href>` sólo a fragmentos locales o data:image:
  // una referencia externa hace que el navegador pida recursos de terceros
  // (tracking) y un `<use>` cross-origin puede traer contenido activo.
  instance.addHook('afterSanitizeAttributes', (node) => {
    for (const attr of ['href', 'xlink:href']) {
      const value = node.getAttribute?.(attr);
      if (value == null) continue;
      const v = value.trim().toLowerCase();
      if (!(v.startsWith('#') || v.startsWith('data:image/'))) node.removeAttribute(attr);
    }
  });
  purify = instance;
  return purify;
}

/** Devuelve el SVG sanitizado, o '' si no queda un `<svg>` válido. */
export function sanitizeSvgMarkup(input: string): string {
  const cleaned = getPurify().sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // DOMPurify saca `<use>` por default; varios packs lo usan para reusar
    // paths. Se permite porque el hook de arriba deja sólo href locales.
    ADD_TAGS: ['use'],
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'embed', 'object'],
  });
  const out = typeof cleaned === 'string' ? cleaned : String(cleaned);
  return /<svg[\s>]/i.test(out) ? out : '';
}

/** CSP para servir SVG (assets e íconos) como documentos aislados: aunque
 *  se colara algo activo, no puede ejecutar scripts ni leer el origen. */
export const SVG_RESPONSE_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

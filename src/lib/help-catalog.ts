import { getHelpTexts } from '~/i18n/help/index.ts';
import { renderMarkdownSync } from '~/lib/markdown.ts';
import type { Locale } from '~/i18n';

export interface RenderedHelpText {
  title: string;
  short: string;
  bodyHtml: string;
}

export type RenderedHelpCatalog = Record<string, RenderedHelpText>;

/**
 * El catálogo renderizado es idéntico entre requests: son 162 entradas de
 * markdown estático por locale. Renderizarlas costaba 190-490 ms de CPU
 * sincrónica en cada GET del dashboard, así que se hace una sola vez por
 * locale y por proceso.
 */
const cache = new Map<Locale, RenderedHelpCatalog>();

export function getRenderedHelpCatalog(locale: Locale): RenderedHelpCatalog {
  const cached = cache.get(locale);
  if (cached) return cached;

  const rendered: RenderedHelpCatalog = Object.fromEntries(
    Object.entries(getHelpTexts(locale)).map(([key, val]) => [
      key,
      { title: val.title, short: val.short, bodyHtml: renderMarkdownSync(val.body) },
    ]),
  );
  cache.set(locale, rendered);
  return rendered;
}

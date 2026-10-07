import type { Locale } from '../index.ts';
import { helpEs, type HelpCatalog, type HelpText } from './es.ts';
import { helpEn } from './en.ts';
import { helpPt } from './pt.ts';
export type { HelpCatalog, HelpText };

/**
 * Catálogos traducidos. Los idiomas sin catálogo propio usan el inglés: había
 * 18 archivos que eran copias idénticas de `en.ts` (~14.000 líneas) y que
 * había que mantener sincronizados a mano. Para traducir un idioma, se crea
 * `help/<locale>.ts` y se lo agrega acá; las claves que falten caen al
 * inglés y, en último término, al español.
 */
const CATALOGS: Partial<Record<Locale, Partial<HelpCatalog>>> = {
  es: helpEs,
  en: helpEn,
  pt: helpPt,
};

/** Idiomas con catálogo de ayuda propio (el resto usa inglés). */
export const TRANSLATED_HELP_LOCALES = Object.keys(CATALOGS) as Locale[];

export function getHelpTexts(locale: Locale): HelpCatalog {
  if (locale === 'es') return helpEs;
  const primary = CATALOGS[locale] ?? {};
  const merged = { ...helpEs } as HelpCatalog;
  for (const key of Object.keys(helpEs) as Array<keyof HelpCatalog>) {
    const translated = primary[key] ?? helpEn[key];
    if (translated) merged[key] = translated;
  }
  return merged;
}

export function getHelpText(locale: Locale, key: keyof HelpCatalog): HelpText | undefined {
  return getHelpTexts(locale)[key] ?? helpEs[key];
}

export const HELP_CATALOG_KEYS = Object.keys(helpEs) as Array<keyof HelpCatalog>;

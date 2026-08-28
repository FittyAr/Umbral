import type { Locale } from '../index.ts';
import { helpEs, type HelpCatalog, type HelpText } from './es.ts';
import { helpEn } from './en.ts';
import { helpPt } from './pt.ts';

export type { HelpCatalog, HelpText };

const CATALOGS: Record<Locale, HelpCatalog> = {
  es: helpEs,
  en: helpEn,
  pt: helpPt,
};

export function getHelpTexts(locale: Locale): HelpCatalog {
  const primary = CATALOGS[locale] ?? helpEs;
  if (locale === 'es') return primary;

  const merged = { ...helpEs } as HelpCatalog;
  for (const key of Object.keys(helpEs) as Array<keyof HelpCatalog>) {
    const translated = primary[key];
    if (translated) merged[key] = translated;
  }
  return merged;
}

export function getHelpText(locale: Locale, key: keyof HelpCatalog): HelpText | undefined {
  return getHelpTexts(locale)[key] ?? helpEs[key];
}

export const HELP_CATALOG_KEYS = Object.keys(helpEs) as Array<keyof HelpCatalog>;

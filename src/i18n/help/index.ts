import type { Locale } from '../index.ts';
import { helpEs, type HelpCatalog, type HelpText } from './es.ts';
import { helpEn } from './en.ts';
import { helpPt } from './pt.ts';
import { helpFr } from './fr.ts';
import { helpDe } from './de.ts';
import { helpIt } from './it.ts';
import { helpZh } from './zh.ts';
import { helpJa } from './ja.ts';
import { helpRu } from './ru.ts';
import { helpNl } from './nl.ts';
import { helpPl } from './pl.ts';
import { helpKo } from './ko.ts';
import { helpTr } from './tr.ts';
import { helpUk } from './uk.ts';
import { helpSv } from './sv.ts';

export type { HelpCatalog, HelpText };

const CATALOGS: Record<Locale, HelpCatalog> = {
  es: helpEs,
  en: helpEn,
  pt: helpPt,
  fr: helpFr,
  de: helpDe,
  it: helpIt,
  zh: helpZh,
  ja: helpJa,
  ru: helpRu,
  nl: helpNl,
  pl: helpPl,
  ko: helpKo,
  tr: helpTr,
  uk: helpUk,
  sv: helpSv,
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

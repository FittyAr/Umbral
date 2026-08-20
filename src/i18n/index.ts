/**
 * Sistema de i18n de Umbral.
 *
 * Feature flag: `features.i18n.enabled`. Si está apagada, todo el UI
 * sigue en español (locale default histórico) — sin overhead.
 *
 * Tres locales soportados: 'es', 'en', 'pt'. Default 'es' (no rompe nada
 * para deployments existentes).
 *
 * Tres reglas de uso:
 *
 * 1. **Server-side**: cada componente Astro importa `t()` y pasa el
 *    locale resuelto al construir la página.
 *    ```astro
 *    ---
 *    import { resolveLocale, t } from '~/i18n';
 *    const locale = resolveLocale(Astro.request, config);
 *    const tr = t(locale);
 *    ---
 *    <h1>{tr('home.welcome')}</h1>
 *    ```
 *
 * 2. **Cliente (browser)**: strings que se setean via JS (ej: aria-label
 *    del toggle de modo) se renderizan con placeholders que el cliente
 *    llena con `t()` cuando corresponde.
 *
 * 3. **Cookie override**: el visitante puede cambiar el locale con el
 *    switcher del header. Cookie persistente (30 días). El admin elige
 *    el default en Features.
 *
 * Lo que NO se traduce (acordado en el plan):
 *  - Markdown/HTML dentro de descripciones de tarjetas (autor)
 *  - Nombres/descripciones de cards y categorías (datos del usuario)
 *  - Docs en /docs (archivos .md independientes)
 *  - Logs internos
 */

import type { Config } from '~/lib/schema';

import { es } from './es';
import { en } from './en';
import { pt } from './pt';

export type Locale = 'es' | 'en' | 'pt';
export const LOCALES: Locale[] = ['es', 'en', 'pt'];
export const DEFAULT_LOCALE: Locale = 'es';

/** Nombre nativo del locale para mostrar en el switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

/** Cookie que guarda el override del visitante. 30 días. */
export const LOCALE_COOKIE = 'umbral_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

type Messages = typeof es;

const DICTIONARIES: Record<Locale, Messages> = {
  es,
  en,
  pt: pt as Messages, // PT puede tener keys faltantes; fallback abajo
};

/** Tipo de un diccionario (tipo estructural, no literal). */
export type Translations = Messages;

/**
 * Función principal de traducción.
 *
 *   const tr = t('en');
 *   tr('home.welcome');                         // → "Welcome to your portal"
 *   tr('home.cards', {n: 5});                   // → "5 apps"
 *   tr('home.lock.unlockButton');               // → "Unlock"
 *
 * Si la key no existe en el locale activo, cae al español (default).
 * Si tampoco está en español, devuelve la key entre brackets (para
 * detectar typos en build-time / QA).
 *
 * ICU-lite, sin librería externa:
 *  - {varName} → reemplazo posicional
 *  - {n, plural, one {# app} other {# apps}} → plurales básicos
 */
export function t(locale: Locale): (key: string, vars?: Record<string, unknown>) => string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const fallback = DICTIONARIES[DEFAULT_LOCALE];
  return (key, vars) => {
    const tmpl = (dict as Record<string, string>)[key] ?? (fallback as Record<string, string>)[key] ?? `[${key}]`;
    return interpolate(tmpl, vars);
  };
}

/**
 * Helper para acceder a traducciones anidadas con dot-notation.
 *   tr('home.welcome')  →  dict.home.welcome
 *
 * Si el valor no es un string (ej: sub-objeto con más keys), devuelve el
 * path entre brackets. Las claves planas en dot-notation son el formato
 * recomendado en este proyecto — simple, sin overhead.
 */
function interpolate(tmpl: string, vars?: Record<string, unknown>): string {
  if (!vars) return tmpl;
  // 1) Plurals ICU-lite: {n, plural, one {# item} other {# items}}
  //    Match贪婪 hasta el primer `}` que cierre el bloque.
  tmpl = tmpl.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
    (_, name, oneT, otherT) => {
      const v = vars[name];
      const num = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(num)) return otherT;
      // Reglas básicas: 1 y no-1 (castellano/inglés/portugués usan plurales
      // más complejos para 0/2, pero para los casos del UI — "1 app" vs
      // "2 apps" — alcanza). Si en el futuro hace falta locale-aware
      // plurales (Rusia, Árabe), reemplazar con `Intl.PluralRules`.
      return num === 1 ? oneT : otherT;
    },
  );
  // 2) {varName} simple
  tmpl = tmpl.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars[name];
    return v === undefined || v === null ? `{${name}}` : String(v);
  });
  return tmpl;
}

/**
 * Resuelve el locale efectivo para un request:
 *   1. Override del visitante (cookie `umbral_locale`) si está seteada
 *      y matchea un locale soportado.
 *   2. Default del admin (`config.features.i18n.locale`).
 *   3. 'es' (último fallback histórico).
 *
 * Si `features.i18n.enabled` es false, SIEMPRE devuelve 'es' (locale
 * default). El visitante no puede overridear si la feature está apagada.
 *
 * `acceptLanguage` opcional: el primer valor que matchea un locale
 * soportado se usa como sugerencia si no hay override ni config. Esto
 * permite que un visitante con `Accept-Language: en` vea la portada en
 * inglés aún si el admin no activó i18n explicitamente — pero sólo si
 * la feature está activa.
 */
export function resolveLocale(
  request: Request | undefined,
  config: Config | null | undefined,
  cookieValue?: string,
): Locale {
  const features = (config?.features ?? {}) as { i18n?: { enabled?: boolean; locale?: Locale } };
  const enabled = features.i18n?.enabled === true;
  const adminDefault: Locale = (features.i18n?.locale as Locale) || DEFAULT_LOCALE;

  // Si la feature está apagada, devolvemos 'es' sin chequear nada.
  // El visitante no debería poder cambiar el idioma si el admin no lo
  // activó (principio 7 — opt-in total).
  if (!enabled) return DEFAULT_LOCALE;

  // 1) Override del visitante via cookie.
  if (cookieValue && isLocale(cookieValue)) {
    return cookieValue;
  }

  // 2) Default del admin.
  if (isLocale(adminDefault)) return adminDefault;

  // 3) Accept-Language header del browser.
  if (request) {
    const al = request.headers.get('accept-language');
    if (al) {
      const preferred = parseAcceptLanguage(al);
      for (const tag of preferred) {
        if (isLocale(tag)) return tag;
      }
    }
  }

  return DEFAULT_LOCALE;
}

/** Type-guard para Locale. */
export function isLocale(s: string): s is Locale {
  return s === 'es' || s === 'en' || s === 'pt';
}

/**
 * Parsea el header Accept-Language y devuelve los locales en orden de
 * preferencia. Maneja el formato estándar: "es-AR,es;q=0.9,en;q=0.8".
 *
 * Estrategia: split por coma, extraer el código base antes del guión
 * (es-AR → es), y ordenar por q-value descendente. Sin q-value = 1.0.
 */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';').map((s) => s.trim());
      let q = 1;
      for (const p of params) {
        const m = /^q=([\d.]+)$/.exec(p);
        if (m) q = parseFloat(m[1]);
      }
      // Solo el código base (es-AR → es)
      const base = (tag || '').split('-')[0].toLowerCase();
      return { tag: base, q };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}

/**
 * Helper para leer el locale override desde el header Cookie del request.
 *   const locale = readLocaleCookie(Astro.request);
 *   const effective = resolveLocale(Astro.request, config, locale);
 */
export function readLocaleCookie(request: Request): string | undefined {
  const cookie = request.headers.get('cookie');
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === LOCALE_COOKIE) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
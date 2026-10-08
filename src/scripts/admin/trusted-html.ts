import type { Alpine as AlpineType } from 'alpinejs';

/**
 * `x-trusted-html`: lo que era `x-html` antes del build CSP de Alpine, que
 * prohíbe esa directiva. Pone el resultado de la expresión como innerHTML,
 * así que sólo va con HTML que el panel ya controla: textos i18n del server,
 * markdown pasado por DOMPurify, la ayuda renderizada en el server y el SVG
 * de los sparklines que genera /api/metrics. Nunca con datos de un usuario
 * sin sanitizar.
 */
export function registerTrustedHtml(Alpine: AlpineType): void {
  Alpine.directive('trusted-html', (el, { expression }, { effect, evaluateLater }) => {
    const evaluate = evaluateLater(expression);
    effect(() => {
      evaluate((value) => {
        el.innerHTML = value == null ? '' : String(value);
      });
    });
  });
}

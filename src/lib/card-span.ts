import type { Layout } from './schema';

/**
 * Ancho de tarjeta en columnas del grid.
 *
 * `grid-column: span N` exige un entero literal, y las columnas del grid viven
 * en custom properties (`--cols-mobile/tablet/desktop`), así que el recorte al
 * ancho disponible no se puede resolver con CSS estático. Como el servidor ya
 * conoce `config.layout` al renderizar, generamos acá las reglas exactas por
 * breakpoint y PublicLayout las inyecta inline.
 */

/** Tope del schema: coincide con el máximo de `layout.columnsDesktop`, así que
 *  este valor siempre resuelve a "todo el ancho" sea cual sea la config. */
export const MAX_CARD_SPAN = 8;

/** Breakpoints de `.grid` en global.css. */
export const CARD_SPAN_BREAKPOINTS = { tablet: 640, desktop: 1024 } as const;

/** Ancho efectivo de una tarjeta: nunca menos de 1 ni más que las columnas. */
export function clampCardSpan(span: unknown, columns: unknown): number {
  const requested =
    typeof span === 'number' && Number.isFinite(span) ? Math.trunc(span) : 1;
  const available =
    typeof columns === 'number' && Number.isFinite(columns)
      ? Math.max(1, Math.trunc(columns))
      : 1;
  return Math.max(1, Math.min(requested, available));
}

function spanRule(span: number, effective: number): string {
  return `.grid>[data-span="${span}"]{grid-column:span ${effective}}`;
}

/** Anchos > 1 realmente en uso, para no emitir reglas que nadie matchea. */
function spansInUse(cards?: ReadonlyArray<{ span?: number }>): number[] {
  if (!cards) {
    return Array.from({ length: MAX_CARD_SPAN - 1 }, (_, i) => i + 2);
  }
  const used = new Set<number>();
  for (const card of cards) {
    const span = typeof card?.span === 'number' ? Math.trunc(card.span) : 1;
    if (span > 1) used.add(Math.min(span, MAX_CARD_SPAN));
  }
  return [...used].sort((a, b) => a - b);
}

/**
 * Reglas `grid-column` ya recortadas a las columnas configuradas.
 *
 * Cada breakpoint sólo emite una regla cuando su valor difiere del que venía
 * heredando por cascada. El caso que obliga a comparar en ambos sentidos:
 * mobile admite hasta 3 columnas y tablet arranca en 2, así que un span puede
 * tener que *bajar* al pasar a una pantalla más ancha.
 *
 * Pasando `cards` sólo se emiten los anchos en uso, así una config sin
 * tarjetas anchas no agrega nada de CSS.
 */
export function computeCardSpanCss(
  layout: Layout,
  cards?: ReadonlyArray<{ span?: number }>,
): string {
  const base: string[] = [];
  const tablet: string[] = [];
  const desktop: string[] = [];

  for (const span of spansInUse(cards)) {
    const onMobile = clampCardSpan(span, layout.columnsMobile);
    const onTablet = clampCardSpan(span, layout.columnsTablet);
    const onDesktop = clampCardSpan(span, layout.columnsDesktop);

    if (onMobile > 1) base.push(spanRule(span, onMobile));
    if (onTablet !== onMobile) tablet.push(spanRule(span, onTablet));
    if (onDesktop !== onTablet) desktop.push(spanRule(span, onDesktop));
  }

  const blocks: string[] = [];
  if (base.length) blocks.push(base.join(''));
  if (tablet.length) {
    blocks.push(`@media (min-width:${CARD_SPAN_BREAKPOINTS.tablet}px){${tablet.join('')}}`);
  }
  if (desktop.length) {
    blocks.push(`@media (min-width:${CARD_SPAN_BREAKPOINTS.desktop}px){${desktop.join('')}}`);
  }
  return blocks.join('');
}

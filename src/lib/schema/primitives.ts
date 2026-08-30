/**
 * Regex compartidas entre schemas.
 *
 * Viven acá y no en el schema que las usa primero porque `theme` y `cards`
 * comparten varias: importarlas cruzado crearía un ciclo.
 */
// ──────────────────────────────────────────────────────────────────────────
/** CSS font-family safe characters: letters, digits, spaces, hyphen, underscore.
 *  Previene inyecciones via `set:html` en PublicLayout.astro. */
export const SAFE_FONT_FAMILY = /^[\w\- ]{1,60}$/;

/** Caracteres seguros para valores CSS (color hex, gradient, image URL).
 *  Bloquea `<`, `>`, `"`, `'`, backtick, `{`, `}` (rompen set:html o cierran
 *  contexto CSS). Permite espacios (los gradients los necesitan), `:`, `,`,
 *  `(`, `)`, `#`, `%`, números, letras, guiones, puntos, `/`, `?`, `=`, `&`.
 *  El value de background se inyecta en `set:html` en PublicLayout, así que
 *  este regex es nuestra última línea contra XSS/CSS injection. */
export const SAFE_CSS_VALUE = /^[^\u0000-\u001f<>'"`{}|\\^]{0,500}$/;

/** Safe color for token overrides: hex or rgba()/rgb(). */
export const SAFE_COLOR_VALUE = /^(#([0-9a-fA-F]{3}){1,2}|rgba?\([0-9,.\s%]+\))$/;

/** Una URL de tarjeta puede ser:
 *  - `https://...` o `http://...` (link externo normal), o
 *  - un path interno que empieza con `/` (ej: `/docs`, `/admin`).
 *  El `href` del card es el `url` literal, así que `/docs` navega a la
 *  página interna y `https://...` abre el sitio externo. El HTML escape
 *  lo maneja Astro; el regex bloquea javascript:/data:/vbscript:.
 */
export const SAFE_CARD_URL = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;

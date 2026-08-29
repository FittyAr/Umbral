/**
 * Tipos compartidos por los componentes genéricos de `src/components/admin/ui/`.
 * Viven acá y no en un `.astro` para que los paneles puedan tipar sus arrays de
 * opciones y para poder testearlos sin renderizar.
 */

/** Opción de un `<select>`, con la doble capa de i18n del admin. */
export interface SelectOption {
  value: string;
  /** Clave i18n. Si falta se usa `label` tal cual (ej: "24h", "12h"). */
  key?: string;
  label: string;
}

/** Ítem de una barra de tabs. */
export interface TabItem {
  /** Valor que se compara contra la propiedad de estado Alpine. */
  id: string;
  key?: string;
  label: string;
  /** Expresión Alpine para `x-text`, la capa de i18n de cliente. */
  labelExpr?: string;
  /** Expresión Alpine para `x-show`. Sin ella el tab siempre se muestra. */
  show?: string;
}

/**
 * Resuelve el texto de una opción o tab con el helper `t` del componente.
 * Centraliza el "si no hay clave, usá el literal" que si no se repite en cada
 * componente.
 */
export function optionLabel(
  option: { key?: string; label: string },
  t: (key: string, fallback: string) => string,
): string {
  return option.key ? t(option.key, option.label) : option.label;
}

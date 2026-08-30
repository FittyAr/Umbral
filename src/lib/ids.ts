/**
 * Generación de ids locales.
 *
 * El patrón `Date.now().toString(36)` + sufijo aleatorio estaba escrito ocho
 * veces, y no todas las copias llevaban el sufijo: sin él, dos altas dentro
 * del mismo milisegundo (agregar dos tarjetas seguidas, importar una
 * plantilla) producen el mismo id. Acá siempre lo lleva.
 */

/** Sufijo aleatorio en base36. Cuatro caracteres alcanzan: el id ya está
 *  acotado al milisegundo, esto sólo desempata dentro de él. */
function randomSuffix(length = 4): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

/**
 * Devuelve `<prefix>-<timestamp36>-<random36>`. El prefijo hace legible de qué
 * es el id cuando aparece en el config o en el audit log.
 */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomSuffix()}`;
}

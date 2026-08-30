/**
 * Tipo de retorno de las factories de estado del admin.
 *
 * Cada `createXState()` devuelve un fragmento parcial del objeto Alpine que se
 * compone con spread en `dashboard.astro`. Los métodos resuelven `this` contra
 * el objeto completo, que sólo existe en runtime, así que el fragmento se tipa
 * como un mapa laxo: es la anotación que le da a `this` un tipo indexable.
 */
export type AdminFragment = Record<string, any>;

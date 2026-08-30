/**
 * Barrel de los tokens de tema.
 *
 * El archivo era un monolito de 500 líneas que mezclaba utilidades de color
 * puras, defaults, generación de CSS y mutaciones del objeto vivo. Ahora
 * cada cosa vive en `theme/`, y esto se mantiene para que ninguno de los
 * importadores tenga que cambiar.
 */
export * from './theme/color-utils.ts';
export * from './theme/token-defaults.ts';
export * from './theme/css.ts';
export * from './theme/mutations.ts';

/**
 * Barrel de la administracion de tarjetas.
 *
 * El dominio puro vive en `cards/domain.ts` y la lectura del DOM en
 * `cards/dom.ts`. Esto se mantiene para los importadores del cliente.
 */
export * from './cards/domain.ts';
export * from './cards/dom.ts';

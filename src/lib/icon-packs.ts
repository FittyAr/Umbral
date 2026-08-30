/**
 * Barrel de los packs de íconos.
 *
 * El archivo mezclaba catálogo, registro en disco, dos extractores (ZIP y
 * git) y el instalador. Al separarlos, el código que ejecuta un binario
 * externo y el que escribe archivos quedan cada uno en su módulo, con sus
 * propios timeouts y validaciones a la vista.
 */
export * from './icon-packs/catalog.ts';
export * from './icon-packs/registry.ts';
export * from './icon-packs/svg.ts';
export * from './icon-packs/zip.ts';
export * from './icon-packs/git.ts';
export * from './icon-packs/install.ts';

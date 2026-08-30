/**
 * Barrel del schema de configuración.
 *
 * Todo el código importa `~/lib/schema`, así que el corte por dominio no
 * cambió ni un import: lo que antes era un archivo de 1.000 líneas ahora
 * son 16 módulos que se re-exportan desde acá.
 */
export * from './primitives.ts';
export * from './branding.ts';
export * from './theme.ts';
export * from './layout.ts';
export * from './categories.ts';
export * from './cards.ts';
export * from './auth.ts';
export * from './security.ts';
export * from './ai.ts';
export * from './webhooks.ts';
export * from './maintenance.ts';
export * from './features.ts';
export * from './portals.ts';
export * from './oidc.ts';
export * from './api-tokens.ts';
export * from './config.ts';

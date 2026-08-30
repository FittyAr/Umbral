/**
 * Carga diferida de los clientes que sólo alimentan vistas previas.
 *
 * `lib/animations.ts` (~12 kB) y `lib/layout-admin-client.ts` (~6 kB) sólo
 * hacen falta en dos de los dieciocho tabs del panel, pero estaban en el chunk
 * inicial: quien entra a agregar una tarjeta pagaba los dos.
 *
 * Los getters de Alpine que los usan son sincrónicos, así que el patrón es:
 * el getter pregunta por el módulo con `getX()`, y si todavía no está devuelve
 * un valor neutro después de disparar `loadX()`. La re-evaluación la garantiza
 * una bandera reactiva del fragmento (`_layoutClientReady`,
 * `_animationsClientReady`): el getter la lee, así que cuando pasa a `true`
 * Alpine vuelve a correrlo con el módulo en mano.
 *
 * `lib/theme-admin-client.ts` queda estático a propósito: además de la vista
 * previa lo usan caminos que *escriben* el config (el gradiente, la URL de la
 * fuente), y ahí un valor neutro no es neutro, borra datos.
 *
 * `prefetchAdminClients()` los pide en cuanto el navegador está ocioso, así
 * que en la práctica ya están cargados antes de que alguien abra el tab.
 */
export type AnimationsClient = typeof import('~/lib/animations');
export type LayoutClient = typeof import('~/lib/layout-admin-client');

let animationsMod: AnimationsClient | null = null;
let animationsPromise: Promise<AnimationsClient> | null = null;
let layoutMod: LayoutClient | null = null;
let layoutPromise: Promise<LayoutClient> | null = null;

export function getAnimationsClient(): AnimationsClient | null {
  return animationsMod;
}

export function loadAnimationsClient(): Promise<AnimationsClient> {
  animationsPromise ??= import('~/lib/animations').then((m) => (animationsMod = m));
  return animationsPromise;
}

export function getLayoutClient(): LayoutClient | null {
  return layoutMod;
}

export function loadLayoutClient(): Promise<LayoutClient> {
  layoutPromise ??= import('~/lib/layout-admin-client').then((m) => (layoutMod = m));
  return layoutPromise;
}

/** Pide los módulos cuando el navegador no tiene nada mejor que hacer. */
export function prefetchAdminClients(): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    void loadAnimationsClient();
    void loadLayoutClient();
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 300);
  }
}

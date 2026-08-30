/**
 * Confirmación de acciones destructivas.
 *
 * El `if (!confirm(mensaje)) return;` estaba escrito once veces con tres
 * variantes (`confirm`, `window.confirm`, y una sin signo de apertura), y en
 * los tests el diálogo nativo bloquea. Centralizarlo deja un solo lugar para
 * cambiar el diálogo por uno propio más adelante.
 */
export function confirmAction(message: string): boolean {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    // Sin ventana (SSR, tests) no hay nadie a quien preguntar: no destruimos.
    return false;
  }
  return window.confirm(message);
}

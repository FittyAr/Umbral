import { ADMIN_LABELS } from '~/lib/admin-labels';

/**
 * Fragmento del objeto Alpine: los labels de la UI.
 *
 * Cada entrada de `ADMIN_LABELS` genera un método con el mismo nombre que
 * usaban los 166 helpers escritos a mano, así que el markup (`x-text="
 * themeTitle()"`) no cambia. El servidor manda sólo los textos traducidos en
 * `window.__labels`; si la feature i18n está apagada, no manda nada y cada
 * método devuelve su fallback en español.
 */
export function createLabelsState(): Record<string, unknown> {
  const state: Record<string, unknown> = {
    labels: (globalThis as { __labels?: Record<string, string> }).__labels || null,

    /** Lookup por nombre de label. Es la forma preferida para código nuevo. */
    l(this: { labels: Record<string, string> | null }, name: string): string {
      const entry = ADMIN_LABELS[name];
      if (!entry) return '';
      return this.labels?.[name] || entry[1];
    },
  };

  for (const [name, [, fallback]] of Object.entries(ADMIN_LABELS)) {
    state[name] = function (this: { labels: Record<string, string> | null }) {
      return this.labels?.[name] || fallback;
    };
  }

  return state;
}

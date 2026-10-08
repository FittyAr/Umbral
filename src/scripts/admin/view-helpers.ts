import type { AdminFragment } from './types';

/**
 * Helpers genéricos para las expresiones del markup.
 *
 * El panel usa el build CSP de Alpine, que interpreta las expresiones de los
 * x-* con un parser propio en vez de `new Function`. Ese parser no acepta
 * arrow functions, template literals, `?.`, `??`, `new`, regex, varias
 * sentencias separadas por `;` ni globales (`window`, `Math`, `JSON`...).
 * Lo que necesita alguna de esas cosas vive acá (o en el fragmento de su
 * dominio) y el markup sólo llama al método.
 */
export function createViewHelpersState(): AdminFragment {
  return {
    /** `value ?? fallback`. */
    orDefault(value: unknown, fallback: unknown) {
      return value ?? fallback;
    },

    /** Foco en `el` después del próximo render (para modales y x-if). */
    focusLater(el: HTMLElement) {
      this.$nextTick(() => el.focus());
    },

    /** Trap de foco de un modal, después del próximo render. */
    trapFocusLater(el: HTMLElement) {
      this.$nextTick(() => window.umbralAdmin.trapFocus(el));
    },

    /** Fija el valor de un <select>/<input> después del próximo render
     *  (cuando las <option> de un x-for ya existen). */
    setValueLater(el: HTMLInputElement | HTMLSelectElement, value: unknown) {
      this.$nextTick(() => {
        el.value = value == null ? '' : String(value);
      });
    },

    /** JSON indentado, para mostrar objetos en un <pre>. */
    prettyJson(value: unknown) {
      return JSON.stringify(value, null, 2);
    },

    /** Fecha local corta de un ISO string. */
    formatDate(iso: string | null | undefined) {
      return iso ? new Date(iso).toLocaleDateString() : '';
    },

    /** Bytes → KB redondeados (los caps de upload se editan en KB). */
    bytesToKb(bytes: number) {
      return Math.round((Number(bytes) || 0) / 1024);
    },

    /** Nombre de la variable CSS de un token: `cardBg` → `--card-bg`. */
    tokenCssVar(key: string) {
      return '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    },

    /** Lista de una sección del config (`cfg.<section>.<key>`), o `[]`. */
    cfgList(section: string, key = 'items') {
      const list = this.cfg?.[section]?.[key];
      return Array.isArray(list) ? list : [];
    },

    /** Assets cuyo nombre termina en alguna de las extensiones. */
    assetsWithExt(...exts: string[]) {
      const re = new RegExp(`\\.(${exts.join('|')})$`, 'i');
      return (this.assets || []).filter((a: { name: string }) => re.test(a.name));
    },

    /** Activa/desactiva un ítem de una lista del config (`item.enabled`). */
    toggleEnabled(item: { enabled: boolean }) {
      item.enabled = !item.enabled;
      this.markDirty();
    },

    /** Cambia de tab y corre una carga (`tab = x; loadX()`). */
    openTab(tab: string) {
      this.tab = tab;
      if (tab === 'iconpacks') this.loadIconPacks();
    },
  };
}

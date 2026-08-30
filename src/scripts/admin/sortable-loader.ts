import type SortableType from 'sortablejs';
import { installSortableGuard } from '~/lib/sortable-guard';

/**
 * Carga diferida de SortableJS.
 *
 * Sortable son ~45 kB que sólo sirven para arrastrar tarjetas y categorías en
 * un único tab del admin. Importado de forma estática entraba en el chunk
 * crítico y bloqueaba el primer render de todo el panel, incluido el de quien
 * entra a cambiar un color.
 *
 * El módulo queda memoizado: la promesa se crea una sola vez y el guard (los
 * parches sobre el prototipo, ver lib/sortable-guard.ts) se aplica ahí, así
 * que nunca se instala dos veces por más veces que se llame.
 */
let promise: Promise<typeof SortableType> | null = null;

/** Ctor ya resuelto, para los caminos síncronos que corren después. */
let ctor: typeof SortableType | null = null;

export function loadSortable(): Promise<typeof SortableType> {
  if (!promise) {
    promise = import('sortablejs').then((mod) => {
      const Sortable = (mod.default ?? mod) as typeof SortableType;
      installSortableGuard(Sortable);
      ctor = Sortable;
      return Sortable;
    });
  }
  return promise;
}

/**
 * Devuelve el ctor sólo si ya está cargado. Sirve para las funciones que
 * corren en un handler sincrónico (un `onEnd`, un `$nextTick`) y que pueden
 * salirse sin hacer nada cuando todavía no hay nada arrastrable.
 */
export function getSortable(): typeof SortableType | null {
  return ctor;
}

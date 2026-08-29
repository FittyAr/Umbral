/**
 * Hardening for SortableJS in an Alpine-rendered list.
 *
 * 1. `_onDragOver` can fire after `destroy()` nulled `this.el` (SortableJS
 *    #2469), which throws on `el.lastElementChild`.
 * 2. In fallback mode SortableJS clones the dragged node into the DOM. Alpine
 *    picks the clone up as a fresh tree without the `x-for` scope, so every
 *    binding on it ("card is not defined") throws. `x-ignore` keeps Alpine off.
 *
 * Safe to call multiple times.
 */
import Sortable from 'sortablejs';

let patched = false;

type SortableProto = Sortable & {
  _onDragOver?: (this: Sortable, evt: Event) => boolean;
  _appendGhost?: (this: Sortable) => void;
};

/** Marks a Sortable-created clone so Alpine never initializes it. */
function shieldFromAlpine(el: Element | null | undefined): void {
  if (!el || typeof el.setAttribute !== 'function') return;
  el.setAttribute('x-ignore', '');
  el.querySelectorAll?.('[x-for], [x-if], [x-text], [x-show], [x-model]').forEach((child) => {
    child.setAttribute('x-ignore', '');
  });
}

export function installSortableGuard(SortableCtor: typeof Sortable = Sortable): void {
  if (patched) return;

  const proto = SortableCtor.prototype as SortableProto;
  const originalDragOver = proto._onDragOver;
  if (typeof originalDragOver !== 'function') return;

  proto._onDragOver = function (this: Sortable, evt: Event) {
    if (!this.el) return false;
    return originalDragOver.call(this, evt);
  };

  const originalAppendGhost = proto._appendGhost;
  if (typeof originalAppendGhost === 'function') {
    proto._appendGhost = function (this: Sortable) {
      originalAppendGhost.call(this);
      shieldFromAlpine(SortableCtor.ghost);
    };
  }

  patched = true;
}

/** @internal Test-only reset */
export function resetSortableGuardForTests(): void {
  patched = false;
}

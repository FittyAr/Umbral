import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import Sortable from 'sortablejs';
import { installSortableGuard, resetSortableGuardForTests } from '../src/lib/sortable-guard.ts';

describe('sortable-guard', () => {
  beforeEach(() => {
    resetSortableGuardForTests();
  });

  test('returns false without calling original when el is null', () => {
    let originalCalled = false;
    const FakeSortable = {
      prototype: {
        _onDragOver() {
          originalCalled = true;
          return true;
        },
      },
    };

    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));

    const ctx = { el: null as HTMLElement | null };
    const result = FakeSortable.prototype._onDragOver.call(ctx, new Event('dragover'));

    assert.equal(result, false);
    assert.equal(originalCalled, false);
  });

  test('delegates to original when el is present', () => {
    let originalCalled = false;
    const el = {} as HTMLElement;
    const FakeSortable = {
      prototype: {
        _onDragOver() {
          originalCalled = true;
          return true;
        },
      },
    };

    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));

    const ctx = { el };
    const result = FakeSortable.prototype._onDragOver.call(ctx, new Event('dragover'));

    assert.equal(result, true);
    assert.equal(originalCalled, true);
  });

  test('installSortableGuard is idempotent', () => {
    let callCount = 0;
    const FakeSortable = {
      prototype: {
        _onDragOver() {
          callCount += 1;
          return true;
        },
      },
    };

    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));
    const first = FakeSortable.prototype._onDragOver;
    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));
    assert.equal(FakeSortable.prototype._onDragOver, first);
  });

  test('marks the fallback ghost with x-ignore so Alpine skips it', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const ghost = dom.window.document.createElement('div');
    ghost.innerHTML = '<span x-text="card.title"></span>';

    const FakeSortable = {
      ghost,
      prototype: {
        _onDragOver() {
          return true;
        },
        _appendGhost() {
          /* original appends FakeSortable.ghost to the DOM */
        },
      },
    };

    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));
    FakeSortable.prototype._appendGhost.call({});

    assert.ok(ghost.hasAttribute('x-ignore'));
    assert.ok(ghost.querySelector('[x-text]')!.hasAttribute('x-ignore'));
  });

  test('_appendGhost guard tolerates a missing ghost', () => {
    const FakeSortable = {
      ghost: null,
      prototype: {
        _onDragOver() {
          return true;
        },
        _appendGhost() {},
      },
    };

    installSortableGuard(FakeSortable as unknown as typeof import('sortablejs'));
    assert.doesNotThrow(() => FakeSortable.prototype._appendGhost.call({}));
  });

  test('real Sortable instance does not throw _onDragOver after destroy', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><ul id="list"><li>one</li></ul></body></html>');
    const { window } = dom.window;
    // @ts-expect-error jsdom globals for Sortable
    globalThis.document = window.document;
    // @ts-expect-error jsdom globals for Sortable
    globalThis.window = window;

    installSortableGuard(Sortable);

    const list = window.document.getElementById('list')!;
    const sortable = Sortable.create(list, { group: 'test-guard' });
    sortable.destroy();

    assert.doesNotThrow(() => {
      const proto = Sortable.prototype as Sortable & { _onDragOver(evt: Event): boolean };
      proto._onDragOver.call(sortable, new window.Event('dragover'));
    });
  });
});

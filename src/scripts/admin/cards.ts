import type { AdminFragment } from "./types";
import { createCardGroupsState } from './cards/groups.ts';
import { createCardSortableState } from './cards/sortable.ts';
import { createCardEditorState } from './cards/editor.ts';
import { createCardIconsState } from './cards/icons.ts';
import { createCardTagsState } from './cards/tags.ts';
import { createCardMarkdownState } from './cards/markdown-preview.ts';
import { createCardAutofillState } from './cards/autofill.ts';
import { createCardPresetsState } from './cards/presets.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio cards.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo. Cada submódulo de `cards/`
 * aporta un trozo del dominio; ninguno define getters, así que el spread
 * copia valores y métodos tal cual.
 */
export function createCardsState(): AdminFragment {
  return {
    ...createCardGroupsState(),
    ...createCardSortableState(),
    ...createCardEditorState(),
    ...createCardIconsState(),
    ...createCardTagsState(),
    ...createCardMarkdownState(),
    ...createCardAutofillState(),
    ...createCardPresetsState(),
  };
}

import type { AdminFragment } from "../types";
import { isFeatureListed } from './shared.ts';

/** Chip input de tags del editor de cards (opt-in: features.tags). */
export function createCardTagsState(): AdminFragment {
  return {
    // Tags (opt-in: features.tags). El server dropea el array si la
    // feature está apagada. Acá solo manejamos el chip input + autocomplete.
    tagsEnabled: isFeatureListed('tags'),
    tagInput: '',

    tagSuggestions() {
      // Tags que ya existen en otras cards, filtradas por lo que el
      // user está tipeando. Limit 8.
      if (!this.tagInput) return [];
      const q = this.tagInput.toLowerCase();
      const current = new Set((this.editingCard?.tags || []).map((t: string) => t.toLowerCase()));
      const allTags = new Set<string>();
      for (const c of (this.cfg?.cards || [])) {
        for (const t of (c.tags || [])) {
          const norm = String(t).toLowerCase().trim();
          if (norm && !current.has(norm)) allTags.add(norm);
        }
      }
      return Array.from(allTags).filter(t => t.startsWith(q)).sort().slice(0, 8);
    },

    // Chip input con Enter/coma/espacio para agregar y backspace para
    // borrar. Sanitiza y normaliza (kebab-case lowercase). El server
    // también valida, pero hacerlo client-side da feedback inmediato.
    sanitizeTag(raw: unknown) {
      if (typeof raw !== 'string') return null;
      const norm = raw.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 30);
      if (!/^[a-z0-9-]{1,30}$/.test(norm)) return null;
      return norm;
    },
    addTag(raw: unknown) {
      if (!this.editingCard) return;
      if (!Array.isArray(this.editingCard.tags)) this.editingCard.tags = [];
      if (this.editingCard.tags.length >= 10) return;
      const t = this.sanitizeTag(raw);
      if (!t) return;
      if (this.editingCard.tags.some((x: string) => x.toLowerCase() === t)) return; // dedup
      this.editingCard.tags.push(t);
      this.tagInput = '';
      this.cardFormDirty = true;
    },
    addTagFromInput() {
      if (this.tagInput && this.tagInput.trim()) {
        this.addTag(this.tagInput);
      }
    },
    removeTag(idx: number) {
      if (!this.editingCard?.tags) return;
      if (idx < 0 || idx >= this.editingCard.tags.length) return;
      this.editingCard.tags.splice(idx, 1);
      this.cardFormDirty = true;
    },
  };
}

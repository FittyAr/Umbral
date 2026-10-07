import type { FeatureListItem } from "../types";

/**
 * Helpers compartidos por los módulos del dominio cards. No dependen de
 * `this`: los métodos Alpine los llaman pasando lo que necesitan.
 */

/** Si la feature opt-in `name` viene activa en `window.__featureList`. */
export function isFeatureListed(name: string): boolean {
  return window.__featureList?.find?.((f: FeatureListItem) => f.name === name)?.enabled === true;
}

/** El título que pone `addCard()`: el traducido o el histórico en español. */
export function isDefaultCardTitle(title: string | undefined, translatedNewLabel: string): boolean {
  return title === 'Nueva tarjeta' || title === translatedNewLabel;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

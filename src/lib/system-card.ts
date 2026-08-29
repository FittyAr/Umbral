import type { Card } from './schema';

/** Nombre reservado: no depende de icon packs. Archivo en public/system/docs.svg. */
export const SYSTEM_DOCS_ICON = 'system/docs';
export const SYSTEM_DOCS_ICON_PATH = '/system/docs.svg';

/** Campos de la card `docs` que el admin no puede persistir. `enabled` sí se puede cambiar. */
export const SYSTEM_CARD_PROTECTED_FIELDS = [
  'title',
  'description',
  'url',
  'icon',
  'color',
  'category',
  'order',
  'openInNewTab',
  'healthCheck',
  'kind',
  'id',
] as const;

export type SystemCardProtectedField = (typeof SYSTEM_CARD_PROTECTED_FIELDS)[number];

/** Card de documentación del sistema: id `docs` o URL `/docs*`. */
export function isSystemCard(card: { id?: string; url?: string } | null | undefined): boolean {
  if (!card) return false;
  if (card.id === 'docs') return true;
  const u = (card.url || '').toLowerCase();
  return u === '/docs' || u.startsWith('/docs/') || u.startsWith('/docs?');
}

export function restoreSystemCardProtectedFields<T extends Record<string, unknown>>(
  incoming: T,
  original: T,
): T {
  for (const field of SYSTEM_CARD_PROTECTED_FIELDS) {
    if (field in original) {
      (incoming as Record<string, unknown>)[field] = original[field];
    }
  }
  return incoming;
}

/**
 * Si falta la card de sistema, la reinserta. Si está, revierte campos protegidos
 * al valor persistido (no lanza). `enabled` se conserva del incoming.
 */
export function reconcileSystemCards(
  incomingCards: Card[],
  currentCards: Card[],
  defaultDocs: Card | undefined,
): Card[] {
  const cards = [...incomingCards];
  const existing = cards.find((c) => c.id === 'docs');

  if (!existing) {
    if (defaultDocs) cards.push({ ...defaultDocs });
    return cards;
  }

  const original = currentCards.find((c) => c.id === 'docs') ?? defaultDocs;
  if (!original) return cards;

  restoreSystemCardProtectedFields(
    existing as unknown as Record<string, unknown>,
    original as unknown as Record<string, unknown>,
  );
  return cards;
}

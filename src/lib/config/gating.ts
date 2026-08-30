/**
 * Gating de features en el guardado, como funciones puras.
 *
 * Es la mitad del save que más importa auditar: decide qué campos se
 * persisten según los flags, y es defense-in-depth — un PUT con `pinned:
 * true` sin la feature activa se guarda igual, pero apagado. Al no tocar
 * disco ni cache, cada regla se puede testear sola.
 */
import type { Card, Config } from '../schema';

type FeatureMap = Record<string, Record<string, unknown>>;

const isOn = (features: FeatureMap, name: string): boolean =>
  (features[name] as { enabled?: boolean } | undefined)?.enabled === true;

/**
 * Merge de los flags: el cliente manda sólo lo que cambió, así que cada
 * feature se mergea contra la actual para no pisar a las demás.
 */
export function mergeFeatures(current: unknown, update: unknown): FeatureMap {
  const currentFeatures = (current ?? {}) as FeatureMap;
  const updateFeatures = (update ?? {}) as FeatureMap;
  const merged: FeatureMap = { ...currentFeatures };
  for (const [key, partialUpdate] of Object.entries(updateFeatures)) {
    merged[key] = { ...(currentFeatures[key] ?? {}), ...partialUpdate };
  }
  return merged;
}

/**
 * Recorta cada tarjeta a lo que las features habilitadas permiten:
 * markdown decide el formato y el largo de la descripción, tags decide si
 * el array se persiste, y pinned decide si el flag puede quedar en true.
 */
export function gateCards(cards: Card[], features: FeatureMap): Card[] {
  const markdownOn = isOn(features, 'markdown');
  const tagsOn = isOn(features, 'tags');
  const pinnedOn = isOn(features, 'pinned');
  return cards.map((c) => {
    const description = typeof c.description === 'string' ? c.description : '';
    const baseCard = { ...c };
    if (!markdownOn) {
      baseCard.description = description.slice(0, 200);
      baseCard.descriptionFormat = 'plain' as const;
    } else {
      const limit = c.descriptionFormat === 'markdown' ? 1000 : 200;
      baseCard.description = description.slice(0, limit);
      baseCard.descriptionFormat = c.descriptionFormat === 'markdown' ? ('markdown' as const) : ('plain' as const);
    }
    if (!tagsOn) {
      delete (baseCard as { tags?: string[] }).tags;
    }
    if (!pinnedOn) {
      baseCard.pinned = false;
    }
    return baseCard;
  });
}

/** Con la feature apagada las ventanas no se persisten. */
export function gateMaintenanceWindows(
  current: Config['maintenanceWindows'],
  update: Config['maintenanceWindows'],
  features: FeatureMap,
): NonNullable<Config['maintenanceWindows']> {
  const base = current ?? { items: [] };
  if (!isOn(features, 'maintenanceWindows')) return { items: [] };
  return update ? { ...base, ...update } : base;
}

/**
 * De `auth` sólo son editables `users` y `singlePasswordEnabled`. El hash del
 * super-admin, el CSRF y el authEpoch se manejan en sus propios flujos (POST
 * /api/password, login), así que un PUT no puede pisarlos ni aunque el
 * cliente los mande — que es lo que permite no serializarlos en el HTML del
 * dashboard.
 */
export function gateAuth(
  current: Config['auth'],
  incoming: { users?: NonNullable<Config['auth']>['users']; singlePasswordEnabled?: boolean } | undefined,
  features: FeatureMap,
): NonNullable<Config['auth']> {
  const base = current ?? { passwordHash: '', csrfToken: '', authEpoch: 0, users: [], singlePasswordEnabled: true };
  if (!isOn(features, 'multiUser')) {
    return { ...base, users: [], singlePasswordEnabled: true };
  }
  if (!incoming) return base;
  return {
    ...base,
    ...(incoming.users !== undefined ? { users: incoming.users } : {}),
    ...(incoming.singlePasswordEnabled !== undefined
      ? { singlePasswordEnabled: incoming.singlePasswordEnabled }
      : {}),
  };
}

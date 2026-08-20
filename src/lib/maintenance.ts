/**
 * Maintenance windows helpers.
 *
 * Lógica compartida entre el render de la portada (mostrar badge ámbar),
 * el endpoint /api/status (suprimir webhooks en ventanas activas) y la UI
 * admin (mostrar lista de ventanas activas / próximas / pasadas).
 *
 * Performance: el filter es O(n) sobre windows × cardIds. Para un
 * deployment típico (decenas de cards, ventanas contadas), está bien.
 * Si crece a miles, podemos indexar por cardId.
 */

import type { Config, MaintenanceWindow } from './schema';
import { isFeatureEnabled } from './features';
import { getConfig } from './config';

export interface ActiveWindow {
  window: MaintenanceWindow;
  reason: string;
  remainingMs: number;
}

/** Devuelve la lista de windows activas AHORA que aplican a una card
 *  específica. Si el array está vacío, la card no está en mantenimiento.
 *
 *  Una window aplica si:
 *  - está habilitada
 *  - startsAt <= now <= endsAt
 *  - cardIds incluye '*' o el id de la card
 *
 *  Devuelve un array porque teóricamente puede haber windows solapadas
 *  (ej: una general + una específica). El caller decide qué mostrar. */
export async function getActiveWindowsForCard(cardId: string): Promise<MaintenanceWindow[]> {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'maintenanceWindows')) return [];
  const windows = (cfg.maintenanceWindows?.items ?? []).filter((w) => w.enabled);
  return windows.filter((w) => isWindowActive(w) && (w.cardIds.includes('*') || w.cardIds.includes(cardId)));
}

/** ¿La window está activa AHORA? Compara contra `now` (o `at` para tests). */
export function isWindowActive(w: MaintenanceWindow, at: number = Date.now()): boolean {
  if (!w.enabled) return false;
  const start = new Date(w.startsAt).getTime();
  const end = new Date(w.endsAt).getTime();
  return at >= start && at <= end;
}

/** Info agregada: cuántas cards están en mantenimiento AHORA, y la lista
 *  resumida de windows activas. Útil para el dashboard del admin. */
export async function getMaintenanceSummary(): Promise<{
  enabled: boolean;
  activeWindows: ActiveWindow[];
  upcoming: ActiveWindow[];
  expiredCount: number;
}> {
  const cfg = await getConfig();
  const enabled = isFeatureEnabled(cfg, 'maintenanceWindows');
  const all = cfg.maintenanceWindows?.items ?? [];
  const now = Date.now();
  const upcomingThreshold = now + 24 * 60 * 60 * 1000; // próximas 24h
  const expiredThreshold = now - 24 * 60 * 60 * 1000; // pasadas hace > 24h

  const active: ActiveWindow[] = [];
  const upcoming: ActiveWindow[] = [];
  let expired = 0;
  for (const w of all) {
    const start = new Date(w.startsAt).getTime();
    const end = new Date(w.endsAt).getTime();
    if (end < expiredThreshold) expired++;
    else if (w.enabled && isWindowActive(w, now)) {
      active.push({ window: w, reason: w.reason, remainingMs: end - now });
    } else if (w.enabled && start > now && start <= upcomingThreshold) {
      upcoming.push({ window: w, reason: w.reason, remainingMs: end - now });
    }
  }
  return { enabled, activeWindows: active, upcoming, expiredCount: expired };
}

/** Helper de UI: humaniza el remainingMs a "2h 13m" / "45m" / "<1m" / "expirado". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expirado';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}
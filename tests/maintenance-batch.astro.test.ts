import { describe, test, expect } from 'vitest';
import { getActiveWindowsForCards, isWindowActive } from '~/lib/maintenance';
import type { MaintenanceWindow } from '~/lib/schema';

/**
 * Corre con vitest y no con `node --test` porque `lib/maintenance.ts` importa
 * con especificadores sin extensión y con el alias `~`, que sólo resuelve el
 * pipeline de Vite.
 */
function makeWindow(over: Partial<MaintenanceWindow> = {}): MaintenanceWindow {
  return {
    id: 'mw-1',
    enabled: true,
    reason: 'Ventana de prueba',
    cardIds: ['*'],
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-01-02T00:00:00.000Z',
    ...over,
  } as MaintenanceWindow;
}

describe('ventanas de mantenimiento por lote', () => {
  test('isWindowActive compara contra el instante que se le pasa', () => {
    const w = makeWindow();
    expect(isWindowActive(w, Date.parse('2026-01-01T12:00:00Z'))).toBe(true);
    expect(isWindowActive(w, Date.parse('2026-02-01T00:00:00Z'))).toBe(false);
  });

  test('una ventana deshabilitada nunca está activa', () => {
    expect(isWindowActive(makeWindow({ enabled: false }), Date.parse('2026-01-01T12:00:00Z'))).toBe(false);
  });

  test('con una lista vacía no hay lectura de config ni resultado', async () => {
    const res = await getActiveWindowsForCards([]);
    expect(res.size).toBe(0);
  });

  test('devuelve un Map, que es lo que las páginas le pasan a Card', async () => {
    const res = await getActiveWindowsForCards(['no-existe']);
    expect(res).toBeInstanceOf(Map);
    expect(res.has('no-existe')).toBe(false);
  });
});

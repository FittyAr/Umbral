import type { AdminFragment, FeatureListItem, AdminMaintenanceWindow } from "./types";
import { newId } from '~/lib/ids';
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio maintenance.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createMaintenanceState(): AdminFragment {
  return {
    // Maintenance windows (opt-in: features.maintenanceWindows).
    // El server valida + sanitiza via Zod al guardar; nosotros sólo
    // construimos el objeto y manejamos active/remaining en el cliente.
    maintenanceWindowsEnabled: window.__featureList?.find?.((f: FeatureListItem) => f.name === 'maintenanceWindows')?.enabled === true,
    // maintenanceTitle(), maintenanceIntro() y maintenanceAddLabel() salen
    // de ADMIN_LABELS (src/lib/admin-labels.ts).
    newMaintenance: { cardMode: 'all', cardIds: [], startsAt: '', endsAt: '', reason: '' },
    isMaintenanceActive(mw: AdminMaintenanceWindow) {
      if (!mw.enabled) return false;
      const now = Date.now();
      return now >= new Date(mw.startsAt).getTime() && now <= new Date(mw.endsAt).getTime();
    },
    formatMwTime(iso: string) {
      // Render ISO UTC en formato local del admin. Si el admin vive
      // en GMT-3 y la window es 2026-08-20T02:00:00Z, le muestra
      // 2026-08-19 23:00 hora local — útil para entender en qué
      // momento del día local dispara.
      try { return new Date(iso).toLocaleString(); } catch { return iso; }
    },
    formatMwRemaining(iso: string) {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) return this.l('msgMaintenanceExpired');
      const m = Math.floor(ms / 60_000);
      if (m < 60) return this.l('msgMaintenanceRemainingM', { m });
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0
        ? this.l('msgMaintenanceRemainingHM', { h, m: rem })
        : this.l('msgMaintenanceRemainingH', { h });
    },
    addMaintenance() {
      if (!this.cfg.maintenanceWindows) this.cfg.maintenanceWindows = { items: [] };
      if (!Array.isArray(this.cfg.maintenanceWindows.items)) this.cfg.maintenanceWindows.items = [];
      const w = this.newMaintenance;
      if (!w.startsAt || !w.endsAt) {
        window.umbralAdmin.toast(this.l('msgMaintenanceStartEndRequired'), 'error');
        return;
      }
      // datetime-local devuelve "YYYY-MM-DDTHH:mm" sin zona. Lo
      // interpretamos como UTC explícitamente para consistencia
      // con el server (que valida ISO con offset).
      const startIso = new Date(w.startsAt + ':00Z').toISOString();
      const endIso = new Date(w.endsAt + ':00Z').toISOString();
      if (new Date(endIso) <= new Date(startIso)) {
        window.umbralAdmin.toast(this.l('msgMaintenanceEndAfterStart'), 'error');
        return;
      }
      const cardIds = w.cardMode === 'all' ? ['*'] : (Array.isArray(w.cardIds) ? w.cardIds : []);
      if (cardIds.length === 0) {
        window.umbralAdmin.toast(this.l('msgMaintenanceSelectCard'), 'error');
        return;
      }
      this.cfg.maintenanceWindows.items.push({
        id: newId('mw'),
        cardIds,
        startsAt: startIso,
        endsAt: endIso,
        reason: w.reason.trim(),
        enabled: true,
      });
      this.newMaintenance = { cardMode: 'all', cardIds: [], startsAt: '', endsAt: '', reason: '' };
      this.markDirty();
    },
    removeMaintenance(idx: number) {
      if (!this.cfg.maintenanceWindows?.items?.[idx]) return;
      if (!confirmAction(this.l('msgMaintenanceConfirmDelete'))) return;
      this.cfg.maintenanceWindows.items.splice(idx, 1);
      this.markDirty();
    },
  };
}

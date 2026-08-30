import type { AdminFragment } from "./types";

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
    maintenanceWindowsEnabled: window.__featureList?.find?.((f) => f.name === 'maintenanceWindows')?.enabled === true,
    maintenanceTitle() { return this.i18n?.maintenance?.title || 'Mantenimiento'; },
    maintenanceIntro() { return this.i18n?.maintenance?.intro || 'Programa ventanas donde una (o todas) las cards están en mantenimiento.'; },
    maintenanceAddLabel() { return this.i18n?.maintenance?.add || 'Programar'; },
    newMaintenance: { cardMode: 'all', cardIds: [], startsAt: '', endsAt: '', reason: '' },
    isMaintenanceActive(mw) {
      if (!mw.enabled) return false;
      const now = Date.now();
      return now >= new Date(mw.startsAt).getTime() && now <= new Date(mw.endsAt).getTime();
    },
    formatMwTime(iso) {
      // Render ISO UTC en formato local del admin. Si el admin vive
      // en GMT-3 y la window es 2026-08-20T02:00:00Z, le muestra
      // 2026-08-19 23:00 hora local — útil para entender en qué
      // momento del día local dispara.
      try { return new Date(iso).toLocaleString(); } catch { return iso; }
    },
    formatMwRemaining(iso) {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) return 'expirado';
      const m = Math.floor(ms / 60_000);
      if (m < 60) return `${m}m restantes`;
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}m restantes` : `${h}h restantes`;
    },
    addMaintenance() {
      if (!this.cfg.maintenanceWindows) this.cfg.maintenanceWindows = { items: [] };
      if (!Array.isArray(this.cfg.maintenanceWindows.items)) this.cfg.maintenanceWindows.items = [];
      const w = this.newMaintenance;
      if (!w.startsAt || !w.endsAt) {
        window.umbralAdmin.toast('Inicio y fin son requeridos', 'error');
        return;
      }
      // datetime-local devuelve "YYYY-MM-DDTHH:mm" sin zona. Lo
      // interpretamos como UTC explícitamente para consistencia
      // con el server (que valida ISO con offset).
      const startIso = new Date(w.startsAt + ':00Z').toISOString();
      const endIso = new Date(w.endsAt + ':00Z').toISOString();
      if (new Date(endIso) <= new Date(startIso)) {
        window.umbralAdmin.toast('El fin debe ser posterior al inicio', 'error');
        return;
      }
      const cardIds = w.cardMode === 'all' ? ['*'] : (Array.isArray(w.cardIds) ? w.cardIds : []);
      if (cardIds.length === 0) {
        window.umbralAdmin.toast('Seleccioná al menos una card', 'error');
        return;
      }
      this.cfg.maintenanceWindows.items.push({
        id: 'mw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        cardIds,
        startsAt: startIso,
        endsAt: endIso,
        reason: w.reason.trim(),
        enabled: true,
      });
      this.newMaintenance = { cardMode: 'all', cardIds: [], startsAt: '', endsAt: '', reason: '' };
      this.markDirty();
    },
    removeMaintenance(idx) {
      if (!this.cfg.maintenanceWindows?.items?.[idx]) return;
      if (!confirm('¿Borrar esta ventana de mantenimiento?')) return;
      this.cfg.maintenanceWindows.items.splice(idx, 1);
      this.markDirty();
    },
  };
}

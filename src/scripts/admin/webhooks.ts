import { errMsg, type AdminFragment, type FeatureListItem, type AdminWebhook } from "./types";
import { newId } from '~/lib/ids';
import { confirmAction } from './confirm.ts';

/**
 * Fragmento del objeto Alpine del admin: dominio webhooks.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createWebhooksState(): AdminFragment {
  return {
    // Webhooks (opt-in: features.webhooks). Engine se ejecuta en
    // server; acá solo manejamos la UI de la lista + form de alta.
    webhooksEnabled: window.__featureList?.find?.((f: FeatureListItem) => f.name === 'webhooks')?.enabled === true,
    // webhooksTitle(), webhooksIntro(), webhooksAddLabel() y
    // webhookTestNewLabel() salen de ADMIN_LABELS (src/lib/admin-labels.ts).
    newWebhook: { name: '', url: '', preset: 'custom', eventFail: true, eventRecover: false, minFailures: 3, cooldownMin: 30 },
    webhookTesting: null,
    // ── Webhooks helpers (opt-in: features.webhooks) ─────────────
    // La lista vive en cfg.webhooks.items. La UI la muestra directamente
    // via x-for + Alpine bindings. Acá manejamos add/remove/test.
    // El server valida + sanitiza via Zod al guardar; nosotros sólo
    // construimos el objeto.
    addWebhook() {
      if (!this.cfg.webhooks) this.cfg.webhooks = { items: [] };
      if (!Array.isArray(this.cfg.webhooks.items)) this.cfg.webhooks.items = [];
      const w = this.newWebhook;
      if (!w.name.trim() || !w.url.trim()) {
        window.umbralAdmin.toast(this.l('msgWebhooksRequired'), 'error');
        return;
      }
      const events = [];
      if (w.eventFail) events.push('health_fail');
      if (w.eventRecover) events.push('health_recover');
      if (events.length === 0) {
        window.umbralAdmin.toast(this.l('msgWebhooksEventRequired'), 'error');
        return;
      }
      this.cfg.webhooks.items.push({
        id: newId('wh'),
        name: w.name.trim(),
        url: w.url.trim(),
        events,
        minFailures: w.minFailures,
        cooldownMin: w.cooldownMin,
        enabled: true,
        preset: w.preset || 'custom',
      });
      // Reset form
      this.newWebhook = { name: '', url: '', preset: 'custom', eventFail: true, eventRecover: false, minFailures: 3, cooldownMin: 30 };
      this.markDirty();
    },
    removeWebhook(idx: number) {
      if (!this.cfg.webhooks?.items?.[idx]) return;
      if (!confirmAction(this.l('msgWebhooksConfirmDelete'))) return;
      this.cfg.webhooks.items.splice(idx, 1);
      this.markDirty();
    },
    async testWebhook(wh: AdminWebhook) {
      this.webhookTesting = wh.id;
      try {
        const r = await window.umbralAdmin.api('POST', '/api/webhooks/test', { url: wh.url, preset: wh.preset || 'custom' });
        window.umbralAdmin.toast(
          r.ok
            ? this.l('msgWebhooksTestOk', { status: r.status })
            : this.l('msgWebhooksTestFailed', { error: r.error || r.status || '?' }),
          r.ok ? 'success' : 'error',
        );
      } catch (e: unknown) {
        window.umbralAdmin.toast(this.l('toastError', { message: errMsg(e) }), 'error');
      } finally {
        this.webhookTesting = null;
      }
    },
    async testNewWebhook() {
      this.webhookTesting = 'new';
      try {
        const r = await window.umbralAdmin.api('POST', '/api/webhooks/test', { url: this.newWebhook.url, preset: this.newWebhook.preset || 'custom' });
        window.umbralAdmin.toast(
          r.ok
            ? this.l('msgWebhooksTestOk', { status: r.status })
            : this.l('msgWebhooksTestFailed', { error: r.error || r.status || '?' }),
          r.ok ? 'success' : 'error',
        );
      } catch (e: unknown) {
        window.umbralAdmin.toast(this.l('toastError', { message: errMsg(e) }), 'error');
      } finally {
        this.webhookTesting = null;
      }
    },
    webhookTestLabel(id: string) {
      return this.webhookTesting === id ? this.l('msgWebhooksTesting') : this.l('msgWebhooksTest');
    },

  };
}

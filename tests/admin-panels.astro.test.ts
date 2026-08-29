import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import AdvancedPanel from '../src/components/admin/advanced/AdvancedPanel.astro';
import AiPanel from '../src/components/admin/ai/AiPanel.astro';
import AssetsPanel from '../src/components/admin/assets/AssetsPanel.astro';
import AuditPanel from '../src/components/admin/audit/AuditPanel.astro';
import BrandingPanel from '../src/components/admin/branding/BrandingPanel.astro';
import CardsPanel from '../src/components/admin/cards/CardsPanel.astro';
import CategoriesPanel from '../src/components/admin/categories/CategoriesPanel.astro';
import HardeningPanel from '../src/components/admin/hardening/HardeningPanel.astro';
import IconPacksPanel from '../src/components/admin/iconpacks/IconPacksPanel.astro';
import MaintenancePanel from '../src/components/admin/maintenance/MaintenancePanel.astro';
import MetricsPanel from '../src/components/admin/metrics/MetricsPanel.astro';
import OidcPanel from '../src/components/admin/oidc/OidcPanel.astro';
import PortalsPanel from '../src/components/admin/portals/PortalsPanel.astro';
import SecurityPanel from '../src/components/admin/security/SecurityPanel.astro';
import StatusPanel from '../src/components/admin/status/StatusPanel.astro';
import TokensPanel from '../src/components/admin/tokens/TokensPanel.astro';
import WebhooksPanel from '../src/components/admin/webhooks/WebhooksPanel.astro';

/**
 * Los paneles salieron de dashboard.astro con un corte por líneas, así que el
 * riesgo real es un bloque mal cortado: marcado incompleto, un `</div>` de más
 * o el binding del tab perdido. Renderizar los 17 lo detecta, porque un panel
 * mal cerrado no compila y uno cortado de más pierde su contenido.
 */
const PANELS: Array<{ tab: string; component: unknown; contains: string[] }> = [
  { tab: 'branding', component: BrandingPanel, contains: ['cfg.branding.companyName', 'branding.favicon'] },
  { tab: 'categories', component: CategoriesPanel, contains: ['category.order'] },
  { tab: 'cards', component: CardsPanel, contains: ['cards-drop-filler'] },
  { tab: 'assets', component: AssetsPanel, contains: ['assets'] },
  { tab: 'status', component: StatusPanel, contains: ['checkAllStatus()', 'statusResults'] },
  { tab: 'hardening', component: HardeningPanel, contains: ['cfg.security'] },
  { tab: 'security', component: SecurityPanel, contains: ['pwForm.next', 'multiUserEnabled'] },
  { tab: 'ai', component: AiPanel, contains: ['cfg.ai'] },
  { tab: 'webhooks', component: WebhooksPanel, contains: ['cfg.webhooks'] },
  { tab: 'maintenance', component: MaintenancePanel, contains: ['cfg.maintenance'] },
  { tab: 'audit', component: AuditPanel, contains: ['audit'] },
  { tab: 'metrics', component: MetricsPanel, contains: ['metrics'] },
  { tab: 'oidc', component: OidcPanel, contains: ['cfg.oidc'] },
  { tab: 'tokens', component: TokensPanel, contains: ['token'] },
  { tab: 'portals', component: PortalsPanel, contains: ['portal'] },
  { tab: 'iconpacks', component: IconPacksPanel, contains: ['iconPacks'] },
  { tab: 'advanced', component: AdvancedPanel, contains: ['advanced.reset'] },
];

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const renderPanel = (component: unknown) =>
  container.renderToString(component as never, {
    props: { useI18n: false, tr: (key: string) => key },
  } as never);

describe('paneles del admin extraidos de dashboard.astro', () => {
  for (const panel of PANELS) {
    it(`el panel ${panel.tab} renderiza con su binding de tab`, async () => {
      const html = await renderPanel(panel.component);

      expect(html).toContain(`:class="tab==='${panel.tab}' &amp;&amp; 'active'"`);
      expect(html).toContain('class="panel"');
      for (const needle of panel.contains) {
        expect(html).toContain(needle);
      }
      // Un bloque cortado de menos deja el panel casi vacío.
      expect(html.length).toBeGreaterThan(400);
    });
  }

  it('cada panel abre y cierra la misma cantidad de divs', async () => {
    for (const panel of PANELS) {
      const html = await renderPanel(panel.component);

      const opens = html.match(/<div\b/g)?.length ?? 0;
      const closes = html.match(/<\/div>/g)?.length ?? 0;
      expect(closes, `${panel.tab}: divs desbalanceados`).toBe(opens);
    }
  });
});

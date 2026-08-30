import type { AdminFragment } from "./types";
import { getLayoutClient, loadLayoutClient } from "./lazy-clients.ts";

/**
 * Fragmento del objeto Alpine del admin: dominio layout.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 *
 * El cliente de layout se carga on-demand (ver lazy-clients.ts); mientras no
 * esté, los getters devuelven un valor neutro y la bandera reactiva
 * `_layoutClientReady` los hace volver a correr cuando llega.
 */
export function createLayoutState(): AdminFragment {
  return {
    layoutBreakpoint: 'desktop',
    layoutPreviewViewport: 'desktop',
    _layoutClientReady: false,
    /** Devuelve el módulo o `null`, disparando la carga la primera vez. */
    layoutClient() {
      const mod = getLayoutClient();
      // Leer la bandera registra la dependencia reactiva del getter que llama.
      if (this._layoutClientReady && mod) return mod;
      if (mod) {
        this._layoutClientReady = true;
        return mod;
      }
      loadLayoutClient().then(() => { this._layoutClientReady = true; });
      return null;
    },
    layoutPreviewFrameStyle() {
      const c = this.layoutClient();
      if (!c) return '';
      return c.layoutPreviewFrameStyle(this.cfg.layout, this.layoutPreviewViewport);
    },
    layoutPreviewPageStyle() {
      const c = this.layoutClient();
      if (!c) return '';
      return c.layoutPreviewPageStyle(this.cfg.layout, this.layoutPreviewViewport);
    },
    layoutPreviewGroups() {
      const c = this.layoutClient();
      if (!c) return [];
      const cols = c.getPreviewColumns(this.cfg.layout, this.layoutPreviewViewport);
      return c.layoutPreviewSampleGroups(Boolean(this.cfg.layout.showDescriptions), cols);
    },
    layoutPreviewMetaLabel() {
      const c = this.layoutClient();
      if (!c) return '';
      const cols = c.getPreviewColumns(this.cfg.layout, this.layoutPreviewViewport);
      const vp = this.layoutPreviewViewport;
      const vpLabel =
        vp === 'mobile' ? this.layoutPreviewMobile()
        : vp === 'tablet' ? this.layoutPreviewTablet()
        : this.layoutPreviewDesktop();
      const align = this.cfg.layout.gridAlign === 'left'
        ? this.l('layoutGridAlignLeft')
        : this.l('layoutGridAlignCenter');
      return `${vpLabel} · ${cols} col · ${this.cfg.layout.maxWidth}px · ${align}`;
    },
    setLayoutPreviewViewport(viewport) {
      this.layoutPreviewViewport = viewport;
      this.layoutBreakpoint = viewport;
    },
    setLayoutBreakpoint(breakpoint) {
      this.layoutBreakpoint = breakpoint;
      this.layoutPreviewViewport = breakpoint;
    },
  };
}

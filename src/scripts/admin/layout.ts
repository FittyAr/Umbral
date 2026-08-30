import type { AdminFragment } from "./types";
import * as layoutClient from "~/lib/layout-admin-client";

/**
 * Fragmento del objeto Alpine del admin: dominio layout.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createLayoutState(): AdminFragment {
  return {
    layoutBreakpoint: 'desktop',
    layoutPreviewViewport: 'desktop',
    layoutPreviewFrameStyle() {
      return layoutClient.layoutPreviewFrameStyle(
        this.cfg.layout,
        this.layoutPreviewViewport,
      );
    },
    layoutPreviewPageStyle() {
      return layoutClient.layoutPreviewPageStyle(
        this.cfg.layout,
        this.layoutPreviewViewport,
      );
    },
    layoutPreviewGroups() {
      const cols = layoutClient.getPreviewColumns(this.cfg.layout, this.layoutPreviewViewport);
      return layoutClient.layoutPreviewSampleGroups(
        Boolean(this.cfg.layout.showDescriptions),
        cols,
      );
    },
    layoutPreviewMetaLabel() {
      const cols = layoutClient.getPreviewColumns(this.cfg.layout, this.layoutPreviewViewport);
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

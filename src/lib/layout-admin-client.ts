import type { Layout } from './schema';

export type LayoutPreviewViewport = 'mobile' | 'tablet' | 'desktop';

/** CSS custom properties consumed by `.page-wrap` and `.grid` on the public site. */
export function buildLayoutCssVars(layout: Layout): Record<string, string> {
  return {
    '--cols-mobile': String(layout.columnsMobile),
    '--cols-tablet': String(layout.columnsTablet),
    '--cols-desktop': String(layout.columnsDesktop),
    '--grid-gap': `${layout.gap}rem`,
    '--content-max-width': `${layout.maxWidth}px`,
    '--card-radius': `${layout.cardRadius}px`,
  };
}

export function layoutCssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

export function getPreviewColumns(layout: Layout, viewport: LayoutPreviewViewport): number {
  switch (viewport) {
    case 'mobile':
      return layout.columnsMobile;
    case 'tablet':
      return layout.columnsTablet;
    default:
      return layout.columnsDesktop;
  }
}

/** Reference "browser" width used to scale maxWidth inside the preview panel. */
export function getPreviewViewportRef(viewport: LayoutPreviewViewport): number {
  switch (viewport) {
    case 'mobile':
      return 390;
    case 'tablet':
      return 820;
    default:
      return 1440;
  }
}

/**
 * Outer frame fills the preview panel (like ThemePreview).
 * Column count + gap + radius live as CSS vars; maxWidth/align apply to the inner page.
 */
export function layoutPreviewFrameStyle(
  layout: Layout,
  viewport: LayoutPreviewViewport,
  _containerWidth = 320,
): string {
  const cols = getPreviewColumns(layout, viewport);
  return [
    `--preview-cols:${cols}`,
    `--grid-gap:${layout.gap}rem`,
    `--card-radius:${layout.cardRadius}px`,
    'width:100%',
    'max-width:100%',
  ].join(';');
}

/** Inner content box: simulates `.page-wrap` max-width + alignment. */
export function layoutPreviewPageStyle(
  layout: Layout,
  viewport: LayoutPreviewViewport,
): string {
  const ref = getPreviewViewportRef(viewport);
  const ratio = Math.min(1, layout.maxWidth / ref);
  const widthPct = Math.round(ratio * 1000) / 10;
  const margin =
    layout.gridAlign === 'left' ? 'margin-inline:0 auto' : 'margin-inline:auto';
  return [
    `width:${widthPct}%`,
    `max-width:100%`,
    margin,
    `--preview-cols:${getPreviewColumns(layout, viewport)}`,
    `--grid-gap:${layout.gap}rem`,
    `--card-radius:${layout.cardRadius}px`,
  ].join(';');
}

const SAMPLE_CARD_POOL = [
  { title: 'App', description: 'Servicio principal' },
  { title: 'Docs', description: 'Documentación' },
  { title: 'Admin', description: 'Panel interno' },
  { title: 'Status', description: 'Monitoreo' },
  { title: 'Wiki', description: 'Base de conocimiento' },
  { title: 'Git', description: 'Repositorios' },
  { title: 'VPN', description: 'Acceso remoto' },
  { title: 'Mail', description: 'Correo interno' },
  { title: 'CI', description: 'Pipelines' },
  { title: 'DB', description: 'Bases de datos' },
  { title: 'Logs', description: 'Observabilidad' },
  { title: 'Chat', description: 'Mensajería' },
];

/** One full row of cards for the given column count. */
export function layoutPreviewSampleCards(showDescriptions: boolean, columns = 3) {
  const count = Math.max(1, columns);
  return Array.from({ length: count }, (_, i) => {
    const base = SAMPLE_CARD_POOL[i % SAMPLE_CARD_POOL.length];
    return {
      title: base.title,
      description: showDescriptions ? base.description : '',
    };
  });
}

/** Two category groups, each with a full row of cards (fills all columns). */
export function layoutPreviewSampleGroups(showDescriptions: boolean, columns = 3) {
  return [
    {
      id: 'preview-a',
      name: 'Productividad',
      cards: layoutPreviewSampleCards(showDescriptions, columns),
    },
    {
      id: 'preview-b',
      name: 'Infraestructura',
      cards: layoutPreviewSampleCards(showDescriptions, columns).map((c, i) => ({
        ...c,
        title: SAMPLE_CARD_POOL[(i + 6) % SAMPLE_CARD_POOL.length].title,
        description: showDescriptions
          ? SAMPLE_CARD_POOL[(i + 6) % SAMPLE_CARD_POOL.length].description
          : '',
      })),
    },
  ];
}

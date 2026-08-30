import type { Config } from '../schema';

/** Defaults used to seed a brand-new config.json. */
export function defaultConfig(): Config {
  return {
    version: 1,
    branding: {
      companyName: 'Mi Empresa',
      logo: null,
      favicon: null,
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000',
      },
      cardStyle: 'glass',
      accentColor: '#60a5fa',
      textColor: '#f1f5f9',
      fontFamily: 'Inter',
      fontWeight: '400',
      fontUrl: '',
      useGoogleFonts: false,
      colorMode: 'auto',
      autoStrategy: 'system',
      groupLayout: 'vertical',
      showClock: false,
      showRefresh: false,
      showStatusBar: false,
      showModeToggle: true,
      clockPosition: 'header-right',
      clockFormat: '24h',
      headerOpacity: 1,
      footerOpacity: 1,
      customPresets: [],
    },
    layout: {
      columnsDesktop: 4,
      columnsTablet: 3,
      columnsMobile: 2,
      cardSize: 'medium',
      showDescriptions: true,
      healthCheckInterval: 60,
    },
    security: {
      session: {
        ttlHours: 24,
        cookieSameSite: 'Lax',
        cookieSecure: 'auto',
        rotateCsrfOnLogin: false,
      },
      auth: {
        minPasswordLength: 0,
        rateLimitMax: 30,
        rateLimitWindowSec: 60,
        csrfPolicy: 'mutations',
      },
      uploads: {
        maxBytesLogo: 1 * 1024 * 1024,
        maxBytesFavicon: 256 * 1024,
        maxBytesIcon: 512 * 1024,
        maxBytesBackground: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'],
        allowSvg: true,
        sanitizeSvg: true,
        processImages: true,
      },
      network: {
        trustForwardedFor: false,
        trustedProxies: [],
        cookieDomain: null,
        allowInternalHosts: true,
      },
      headers: {
        csp:
          "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
        xFrameOptions: 'DENY',
        referrerPolicy: 'no-referrer',
        permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
        hsts: 'auto',
        hstsMaxAge: 31536000,
        hstsIncludeSubDomains: false,
        hstsPreload: false,
      },
    },
    ai: {
      enabled: false,
      provider: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      systemPrompt: '',
      language: 'es',
    },
    // External search (Brave / Tavily / SearXNG). Sin keys por default —
    // el auto-completar usa sólo Wikipedia + DuckDuckGo (sin auth).
    // Si el user carga keys acá, /api/fetch-card-info los usa primero.
    externalSearch: {
      braveApiKey: '',
      tavilyApiKey: '',
    },
    // Features flags (ver src/lib/features.ts). Default vacío → todas las
    // features nuevas arrancan apagadas, manteniendo compat 100% con v1.x.
    // El admin activa cada una desde /admin → Avanzado → Features.
    features: {
      markdown: { enabled: false },
      tags: { enabled: false },
      pinned: { enabled: false },
      i18n: { enabled: false, locale: 'es' },
      presets: { enabled: true },
      auditLogViewer: { enabled: true },
      webhooks: { enabled: false },
      maintenanceWindows: { enabled: false },
      metrics: { enabled: false, persistToDisk: false, retentionHours: 24 },
      qr: { enabled: false },
      multiUser: { enabled: false },
      totp2fa: { enabled: false },
      oidc: { enabled: false },
      apiTokens: { enabled: false },
      multiPortal: { enabled: false },
      status: { enabled: false },
      ai: { enabled: false },
      iconPacks: { enabled: false },
    },
    portals: { defaultPortal: 'default', items: [] },
    oidc: { providers: [] },
    apiTokens: { items: [] },
    categories: [
      { id: 'com', name: 'Comunicación', icon: 'lucide/message-circle', isLocked: false, password: '', isSubpage: false, isGhost: false },
      { id: 'prod', name: 'Productividad', icon: 'lucide/briefcase', isLocked: false, password: '', isSubpage: false, isGhost: false },
      { id: 'dev', name: 'Desarrollo', icon: 'lucide/code', isLocked: false, password: '', isSubpage: false, isGhost: false },
    ],
    cards: [
      // Tarjeta default que apunta a la documentación del sistema.
      {
        id: 'docs',
        title: 'Documentación',
        kind: 'link',
        description: 'Cómo instalar, configurar y usar Umbral',
        descriptionFormat: 'plain',
        url: '/docs',
        icon: 'system/docs',
        category: 'dev',
        openInNewTab: false,
        color: '#10b981',
        order: 0,
        enabled: true,
        healthCheck: false,
        latencyThresholdMs: 0,
        pinned: false,
        tags: [],
      },
    ],
    _meta: { createdAt: null, updatedAt: null },
  };
}

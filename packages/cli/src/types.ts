/**
 * Tipos del CLI. Sacados del config de Umbral (no duplicamos la
 * definición — el CLI los deriva del config que recibe del server).
 */

export interface Branding {
  companyName: string;
  logo: string | null;
  favicon: string | null;
}
export interface Theme {
  background: { type: 'image' | 'color' | 'gradient'; value: string; blur: number; overlay: number; overlayColor: string };
  cardStyle: 'flat' | 'glass' | 'outlined';
  accentColor: string;
  textColor: string;
  fontFamily: string;
  fontUrl: string;
  colorMode: 'light' | 'dark' | 'auto';
  groupLayout: 'vertical' | 'horizontal';
  showClock: boolean;
  showRefresh: boolean;
  showStatusBar: boolean;
}
export interface Card {
  id: string;
  title: string;
  kind: 'link' | 'note';
  description: string;
  descriptionFormat: 'plain' | 'markdown';
  url: string;
  icon: string;
  category: string;
  openInNewTab: boolean;
  color: string;
  order: number;
  enabled: boolean;
  healthCheck: boolean;
  pinned: boolean;
  tags: string[];
  latencyThresholdMs: number;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  isLocked: boolean;
  password: string;
  isSubpage: boolean;
}
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  minFailures: number;
  cooldownMin: number;
  enabled: boolean;
}
export interface MaintenanceWindow {
  id: string;
  cardIds: string[];
  startsAt: string;
  endsAt: string;
  reason: string;
  enabled: boolean;
}
export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'viewer';
  userEpoch: number;
  createdAt: string | null;
  lastLoginAt: string | null;
}
export interface ApiToken {
  id: string;
  name: string;
  tokenHash: string;
  scope: 'read' | 'write';
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  tokenLast4: string;
  revoked: boolean;
}
export interface Config {
  version: 1;
  branding: Branding;
  theme: Theme;
  layout: unknown;
  security: unknown;
  cards: Card[];
  categories: Category[];
  features: Record<string, { enabled: boolean }>;
  auth?: {
    passwordHash: string;
    csrfToken: string;
    authEpoch: number;
    users: User[];
    singlePasswordEnabled: boolean;
  };
  webhooks?: { items: Webhook[] };
  maintenanceWindows?: { items: MaintenanceWindow[] };
  apiTokens?: { items: ApiToken[] };
  oidc?: unknown;
  ports?: unknown;
  _meta?: { createdAt: string | null; updatedAt: string | null };
}
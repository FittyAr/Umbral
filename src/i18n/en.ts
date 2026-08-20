/**
 * Diccionario inglés.
 *
 * Estructura idéntica a es.ts. Las keys que faltan en este archivo
 * caen al español (default) automáticamente vía el fallback de t().
 */
export const en = {
  // ── Common ────────────────────────────────────────────────────────
  'common.brandPrefix': 'Umbral',
  'common.save': 'Save changes',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.yes': 'Yes',
  'common.no': 'No',

  // ── Home ──────────────────────────────────────────────────────────
  'home.searchPlaceholder': 'Search… (press /)',
  'home.searchAria': 'Search app',
  'home.refresh': 'Reload configuration',
  'home.refreshTitle': 'Reload configuration',
  'home.modeToggle': 'Toggle light/dark mode',
  'home.modeToggleTitle': 'Toggle light/dark mode',
  'home.modeToggleToLight': 'Switch to light mode',
  'home.modeToggleToDark': 'Switch to dark mode',
  'home.empty.title': 'No apps yet',
  'home.empty.body': 'Ask the administrator to add some from the panel.',
  'home.clock.aria': 'Current time',
  'home.subpage.back': 'Main page',
  'home.subpage.empty.title': 'No cards on this subpage',
  'home.subpage.empty.body': 'You can assign cards to this category from the admin panel.',
  'home.meta.description': 'Quick access — {companyName}',
  'home.meta.ogDescription': 'Internal access panel',
  'home.cards': '{n, plural, one {# app} other {# apps}}',
  'home.health.checking': 'Checking…',
  'home.health.ok': 'Service OK ({latency}ms)',
  'home.health.bad': 'HTTP {status}',
  'home.health.fetchError': 'Error querying /api/status',
  'home.locked.badge': 'Locked',
  'home.locked.relock': 'Lock',
  'home.locked.title': 'Locked category',
  'home.locked.subtitle': 'Enter the password to view the links',
  'home.locked.unlockPlaceholder': 'Password…',
  'home.locked.unlockButton': 'Unlock',
  'home.locked.unlockError': 'Wrong password',
  'home.locked.relockTitle': 'Lock this category again',

  // ── Language switcher ────────────────────────────────────────────
  'home.language.switcher.aria': 'Change language',
  'home.language.switcher.title': 'Language',

  // ── Admin layout / nav ───────────────────────────────────────────
  'admin.nav.home': 'View home',
  'admin.nav.divider': '',
  'admin.nav.title': 'Admin',
  'admin.nav.modeToggle': 'Toggle light/dark mode',
  'admin.nav.logout': 'Log out',

  // ── Admin: Dashboard ─────────────────────────────────────────────
  'admin.dashboard.title': 'Settings panel',
  'admin.dashboard.dirty': '● Unsaved changes',
  'admin.dashboard.reload': 'Reload',
  'admin.dashboard.saved': 'Settings saved',
  'admin.dashboard.savedClamped': 'Settings saved ({n, plural, one {# description} other {# descriptions}} truncated to 200 chars)',
  'admin.dashboard.reloaded': 'Reloaded',
  'admin.dashboard.error': 'Error: {message}',

  // ── Admin: tabs ──────────────────────────────────────────────────
  'admin.tab.branding': 'Branding',
  'admin.tab.theme': 'Theme',
  'admin.tab.layout': 'Layout',
  'admin.tab.categories': 'Categories',
  'admin.tab.cards': 'Cards',
  'admin.tab.assets': 'Assets',
  'admin.tab.status': 'Status',
  'admin.tab.hardening': 'Hardening',
  'admin.tab.password': 'Password',
  'admin.tab.ai': 'AI',
  'admin.tab.advanced': 'Advanced',

  // ── Admin: Features (opt-in) ─────────────────────────────────────
  'admin.features.title': 'Features (opt-in)',
  'admin.features.help': 'What does this do?',
  'admin.features.intro': 'Every new feature starts <strong>off</strong> by default. If you don\'t enable it, it doesn\'t run, doesn\'t load its dependency, and doesn\'t appear in the UI. Turn on what you need.',
  'admin.features.wave': 'Wave {n}',

  // ── Admin: Audit log viewer ─────────────────────────────────────
  'admin.audit.title': 'Audit',
  'admin.audit.reset': 'Clear filters',
  'admin.audit.download': 'Download full log',
  'admin.audit.loading': 'Loading…',
  'admin.audit.empty': 'No entries match these filters.',
  'admin.audit.downloadError': 'Error downloading log: {message}',

  // ── Admin: Webhooks (opt-in) ─────────────────────────────────────
  'admin.webhooks.title': 'Webhooks',
  'admin.webhooks.intro': 'Notify external URLs when a health-checked card changes state (healthy → failing or vice versa).',
  'admin.webhooks.add': 'Add',

  // ── Admin: Maintenance windows (opt-in) ─────────────────────────
  'admin.maintenance.title': 'Maintenance',
  'admin.maintenance.intro': 'Schedule windows where one (or all) cards are under maintenance. During the window, cards show an amber badge and do NOT fire health_fail webhooks.',
  'admin.maintenance.add': 'Schedule',

  // ── Admin: Metrics (opt-in) ─────────────────────────────────────
  'admin.metrics.title': 'Metrics',
  'admin.metrics.intro': 'Sparklines + summary (avg, p95, max) per health-checked card. In-memory data (last 100 samples = ~1.5h at 60s check interval).',
  'admin.metrics.reload': 'Refresh',
  'admin.metrics.loading': 'Loading…',

  // ── Admin: Multi-user (opt-in) ──────────────────────────────────
  'admin.users.intro': 'Create users with roles (admin/editor/viewer) and login via username. The single password remains valid as a rescue path.',
  'admin.users.accessModeHelp': 'Three modes: single password only, password + users, or users only.',

  // ── Admin: 404 / 500 ─────────────────────────────────────────────
  'admin.errorPage.title': 'Error',

  // ── Admin: Login ─────────────────────────────────────────────────
  'admin.login.title': 'Sign in',
  'admin.login.password': 'Password',
  'admin.login.submit': 'Sign in',
  'admin.login.error': 'Wrong password',
  'admin.login.csrfError': 'Session expired, please reload the page',

  // ── Admin: Card editor ───────────────────────────────────────────
  'admin.card.edit': 'Edit card',
  'admin.card.new': 'New card',
  'admin.card.markdown': 'Markdown',
  'admin.card.refreshPreview': 'Refresh preview',
  'admin.card.previewLabel': 'Preview',
  'admin.card.tags': 'Tags',
  'admin.card.tagsPlaceholder': 'add tag…',
  'admin.card.tagsHelp': 'Kebab-case tags (frontend, urgent, legacy…). Press Enter, comma, or space to add. Backspace removes the last one.',
  'admin.card.tagsAdd': '+ add',
  'admin.card.pinned': 'Pinned',
  'admin.card.title': 'Title',
  'admin.card.kind': 'Type',
  'admin.card.kind.link': 'Link (clickable)',
  'admin.card.kind.note': 'Note (informational, no link)',
  'admin.card.kindHelp': '"Link" goes to a URL. "Note" is informational only (announcements, tips, etc.).',
  'admin.card.url': 'URL',
  'admin.card.urlRequired': '*',
  'admin.card.urlHelp': 'Site URL or internal path',
  'admin.card.icon': 'Icon',
  'admin.card.description': 'Description',
  'admin.card.category': 'Category',
  'admin.card.openInNewTab': 'Open in new tab',
  'admin.card.color': 'Accent color',
  'admin.card.enabled': 'Visible on the home page',
  'admin.card.healthCheck': 'Monitor status (health check)',
  'admin.card.systemBadge': 'System',
  'admin.card.deleteConfirm': 'Delete this card?',
  'admin.card.autofill': 'Auto-fill',
  'admin.card.autofillBusy': 'Searching…',
  'admin.card.improveAI': 'Improve with AI',
  'admin.card.descTruncated': 'Description truncated to 200 chars on save',
};
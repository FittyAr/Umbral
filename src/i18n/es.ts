/**
 * Diccionario español (default histórico).
 *
 * Convención: nombres planos en dot-notation (no anidados). Las keys
 * se organizan por pantalla / área:
 *
 *   common.*        → strings reusables (botones, errores genéricos)
 *   home.*          → portada pública
 *   home.lock.*     → flujo de categorías con password
 *   admin.*         → panel admin
 *   admin.tabs.*    → nombre de cada tab
 *
 * Las strings del UI que NO se traducen (porque son datos del user):
 *  - Card.title / Card.description (data del user)
 *  - Category.name (data del user)
 *  - Mensajes de error de los endpoints (internos)
 *  - Logs
 */
export const es = {
  // ── Common ────────────────────────────────────────────────────────
  'common.brandPrefix': 'Umbral',
  'common.save': 'Guardar cambios',
  'common.saving': 'Guardando…',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.delete': 'Borrar',
  'common.edit': 'Editar',
  'common.create': 'Crear',
  'common.close': 'Cerrar',
  'common.back': 'Volver',
  'common.loading': 'Cargando…',
  'common.error': 'Error',
  'common.success': 'Éxito',
  'common.yes': 'Sí',
  'common.no': 'No',

  // ── Home (portada pública) ───────────────────────────────────────
  'home.searchPlaceholder': 'Buscar… (presioná /)',
  'home.searchAria': 'Buscar aplicación',
  'home.refresh': 'Recargar configuración',
  'home.refreshTitle': 'Recargar configuración',
  'home.modeToggle': 'Cambiar modo claro/oscuro',
  'home.modeToggleTitle': 'Cambiar modo claro/oscuro',
  'home.modeToggleToLight': 'Cambiar a modo claro',
  'home.modeToggleToDark': 'Cambiar a modo oscuro',
  'home.empty.title': 'No hay aplicaciones todavía',
  'home.empty.body': 'Pedile al administrador que agregue algunas desde el panel.',
  'home.clock.aria': 'Hora actual',
  'home.subpage.back': 'Portada principal',
  'home.subpage.empty.title': 'No hay tarjetas en esta subpágina',
  'home.subpage.empty.body': 'Podés asignar tarjetas a esta categoría desde el panel de administración.',
  'home.meta.description': 'Inicio rápido — {companyName}',
  'home.meta.ogDescription': 'Panel de accesos internos',
  'home.cards': '{n, plural, one {# aplicación} other {# aplicaciones}}',
  'home.health.checking': 'Verificando…',
  'home.health.ok': 'Servicio OK ({latency}ms)',
  'home.health.bad': 'HTTP {status}',
  'home.health.fetchError': 'Error al consultar /api/status',
  'home.locked.badge': 'Protegida',
  'home.locked.relock': 'Bloquear',
  'home.locked.title': 'Categoría bloqueada',
  'home.locked.subtitle': 'Ingresá la contraseña para ver los enlaces',
  'home.locked.unlockPlaceholder': 'Contraseña…',
  'home.locked.unlockButton': 'Desbloquear',
  'home.locked.unlockError': 'Contraseña incorrecta',
  'home.locked.relockTitle': 'Volver a bloquear categoría',

  // ── Language switcher ────────────────────────────────────────────
  'home.language.switcher.aria': 'Cambiar idioma',
  'home.language.switcher.title': 'Idioma',

  // ── Admin layout / nav ───────────────────────────────────────────
  'admin.nav.home': 'Ver portada',
  'admin.nav.divider': '',
  'admin.nav.title': 'Admin',
  'admin.nav.modeToggle': 'Cambiar modo claro/oscuro',
  'admin.nav.logout': 'Cerrar sesión',

  // ── Admin: Dashboard ─────────────────────────────────────────────
  'admin.dashboard.title': 'Panel de configuración',
  'admin.dashboard.dirty': '● Cambios sin guardar',
  'admin.dashboard.reload': 'Recargar',
  'admin.dashboard.save': 'Guardar cambios',
  'admin.dashboard.saving': 'Guardando…',
  'admin.dashboard.saved': 'Configuración guardada',
  'admin.dashboard.savedClamped': 'Configuración guardada ({n, plural, one {# descripción truncada} other {# descripciones truncadas}} a 200 chars)',
  'admin.dashboard.reloaded': 'Recargado',
  'admin.dashboard.error': 'Error: {message}',

  // ── Admin: tabs ──────────────────────────────────────────────────
  'admin.tab.branding': 'Branding',
  'admin.tab.theme': 'Tema',
  'admin.tab.layout': 'Layout',
  'admin.tab.categories': 'Categorías',
  'admin.tab.cards': 'Tarjetas',
  'admin.tab.assets': 'Assets',
  'admin.tab.status': 'Status',
  'admin.tab.hardening': 'Hardening',
  'admin.tab.password': 'Password',
  'admin.tab.ai': 'IA',
  'admin.tab.webhooks': 'Webhooks',
  'admin.tab.maintenance': 'Mantenimiento',
  'admin.tab.audit': 'Auditoría',
  'admin.tab.metrics': 'Métricas',
  'admin.tab.oidc': 'OIDC / SSO',
  'admin.tab.tokens': 'Tokens API',
  'admin.tab.portals': 'Multi-Portal',
  'admin.tab.iconPacks': 'Íconos Git',
  'admin.tab.advanced': 'Avanzado',

  // ── Admin: Features (opt-in) ─────────────────────────────────────
  'admin.features.title': 'Features (opt-in)',
  'admin.features.help': '¿Qué hace esto?',
  'admin.features.intro': 'Cada feature nueva arranca <strong>apagada</strong> por default. Si no la activás, ni se ejecuta, ni se carga su dependencia, ni aparece en la UI. Prendé las que necesitás.',
  'admin.features.wave': 'Ola {n}',

  // ── Admin: Audit log viewer ─────────────────────────────────────
  'admin.audit.title': 'Auditoría',
  'admin.audit.reset': 'Limpiar',
  'admin.audit.download': 'Descargar log completo',
  'admin.audit.loading': 'Cargando…',
  'admin.audit.empty': 'No hay entradas que coincidan con los filtros.',
  'admin.audit.downloadError': 'Error al descargar el log: {message}',

  // ── Admin: Webhooks (opt-in) ─────────────────────────────────────
  'admin.webhooks.title': 'Webhooks',
  'admin.webhooks.intro': 'Notifica a URLs externas cuando una card con health-check cambia de estado (de healthy → failing o vice versa).',
  'admin.webhooks.add': 'Agregar',
  'admin.webhooks.testNew': 'Probar antes de guardar',

  // ── Admin: Maintenance windows (opt-in) ─────────────────────────
  'admin.maintenance.title': 'Mantenimiento',
  'admin.maintenance.intro': 'Programa ventanas donde una (o todas) las cards están en mantenimiento. Durante la ventana, las cards muestran badge ámbar y NO disparan webhooks de health_fail.',
  'admin.maintenance.add': 'Programar',

  // ── Admin: Métricas (opt-in) ─────────────────────────────────────
  'admin.metrics.title': 'Métricas',
  'admin.metrics.intro': 'Sparklines + resumen (avg, p95, max) por card con health-check. Datos en memoria (últimas 100 muestras = ~1.5h con check cada 60s).',
  'admin.metrics.reload': 'Recargar',
  'admin.metrics.loading': 'Cargando…',

  // ── Admin: Multi-user (opt-in) ──────────────────────────────────
  'admin.users.intro': 'Crea usuarios con roles (admin/editor/viewer) y login con username. El password único sigue siendo válido como rescue path.',
  'admin.users.accessModeHelp': 'Tres modos: solo password unico, password + usuarios, o solo usuarios.',

  // ── Admin: 404 / 500 ─────────────────────────────────────────────
  'admin.errorPage.title': 'Error',

  // ── Admin: Login ─────────────────────────────────────────────────
  'admin.login.title': 'Iniciar sesión',
  'admin.login.password': 'Contraseña',
  'admin.login.submit': 'Entrar',
  'admin.login.error': 'Contraseña incorrecta',
  'admin.login.csrfError': 'Sesión expirada, recargá la página',

  // ── Admin: Card editor ───────────────────────────────────────────
  'admin.card.edit': 'Editar tarjeta',
  'admin.card.new': 'Nueva tarjeta',
  'admin.card.markdown': 'Markdown',
  'admin.card.refreshPreview': 'Actualizar preview',
  'admin.card.previewLabel': 'Vista previa',
  'admin.card.tags': 'Tags',
  'admin.card.tagsPlaceholder': 'agregar tag…',
  'admin.card.tagsHelp': 'Tags kebab-case (frontend, urgent, legacy…). Enter, coma o espacio para agregar. Backspace borra el último.',
  'admin.card.tagsAdd': '+ agregar',
  'admin.card.pinned': 'Fijada',
  'admin.card.title': 'Título',
  'admin.card.kind': 'Tipo',
  'admin.card.kind.link': 'Link (clickeable)',
  'admin.card.kind.note': 'Nota (informativa, sin link)',
  'admin.card.kindHelp': '"Link" lleva a una URL. "Nota" es solo informativa (anuncios, tips, etc.).',
  'admin.card.url': 'URL',
  'admin.card.urlRequired': '*',
  'admin.card.urlHelp': 'URL del sitio o path interno',
  'admin.card.icon': 'Ícono',
  'admin.card.description': 'Descripción',
  'admin.card.category': 'Categoría',
  'admin.card.openInNewTab': 'Abrir en nueva pestaña',
  'admin.card.color': 'Color de acento',
  'admin.card.enabled': 'Visible en la portada',
  'admin.card.healthCheck': 'Monitorear estado (health check)',
  'admin.card.systemBadge': 'Sistema',
  'admin.card.deleteConfirm': '¿Borrar esta tarjeta?',
  'admin.card.autofill': 'Auto-completar',
  'admin.card.autofillBusy': 'Buscando…',
  'admin.card.improveAI': 'Mejorar con IA',
  'admin.card.descTruncated': 'Descripción truncada a 200 chars al guardar',
};

export type EsDict = typeof es;
/**
 * Diccionario portugués (Brasil).
 *
 * Estructura idéntica a es.ts. Las keys que faltan caen al español
 * (default) vía el fallback de t().
 */
export const pt = {
  // ── Common ────────────────────────────────────────────────────────
  'common.brandPrefix': 'Umbral',
  'common.save': 'Salvar alterações',
  'common.saving': 'Salvando…',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.delete': 'Excluir',
  'common.edit': 'Editar',
  'common.create': 'Criar',
  'common.close': 'Fechar',
  'common.back': 'Voltar',
  'common.loading': 'Carregando…',
  'common.error': 'Erro',
  'common.success': 'Sucesso',
  'common.yes': 'Sim',
  'common.no': 'Não',

  // ── Home ──────────────────────────────────────────────────────────
  'home.searchPlaceholder': 'Buscar… (pressione /)',
  'home.searchAria': 'Buscar aplicativo',
  'home.refresh': 'Recarregar configuração',
  'home.refreshTitle': 'Recarregar configuração',
  'home.modeToggle': 'Alternar modo claro/escuro',
  'home.modeToggleTitle': 'Alternar modo claro/escuro',
  'home.modeToggleToLight': 'Mudar para modo claro',
  'home.modeToggleToDark': 'Mudar para modo escuro',
  'home.empty.title': 'Ainda não há aplicativos',
  'home.empty.body': 'Peça ao administrador para adicionar alguns pelo painel.',
  'home.clock.aria': 'Hora atual',
  'home.subpage.back': 'Página principal',
  'home.subpage.empty.title': 'Não há cartões nesta subpágina',
  'home.subpage.empty.body': 'Você pode atribuir cartões a esta categoria pelo painel de administração.',
  'home.meta.description': 'Acesso rápido — {companyName}',
  'home.meta.ogDescription': 'Painel de acessos internos',
  'home.cards': '{n, plural, one {# aplicativo} other {# aplicativos}}',
  'home.health.checking': 'Verificando…',
  'home.health.ok': 'Serviço OK ({latency}ms)',
  'home.health.bad': 'HTTP {status}',
  'home.health.fetchError': 'Erro ao consultar /api/status',
  'home.locked.badge': 'Protegida',
  'home.locked.relock': 'Bloquear',
  'home.locked.title': 'Categoria bloqueada',
  'home.locked.subtitle': 'Digite a senha para ver os links',
  'home.locked.unlockPlaceholder': 'Senha…',
  'home.locked.unlockButton': 'Desbloquear',
  'home.locked.unlockError': 'Senha incorreta',
  'home.locked.relockTitle': 'Bloquear esta categoria novamente',

  // ── Language switcher ────────────────────────────────────────────
  'home.language.switcher.aria': 'Mudar idioma',
  'home.language.switcher.title': 'Idioma',

  // ── Admin layout / nav ───────────────────────────────────────────
  'admin.nav.home': 'Ver página inicial',
  'admin.nav.divider': '',
  'admin.nav.title': 'Admin',
  'admin.nav.modeToggle': 'Alternar modo claro/escuro',
  'admin.nav.logout': 'Sair',

  // ── Admin: Dashboard ─────────────────────────────────────────────
  'admin.dashboard.title': 'Painel de configuração',
  'admin.dashboard.dirty': '● Alterações não salvas',
  'admin.dashboard.reload': 'Recarregar',
  'admin.dashboard.save': 'Salvar alterações',
  'admin.dashboard.saving': 'Salvando…',
  'admin.dashboard.saved': 'Configuração salva',
  'admin.dashboard.savedClamped': 'Configuração salva ({n, plural, one {# descrição truncada} other {# descrições truncadas}} para 200 chars)',
  'admin.dashboard.reloaded': 'Recarregado',
  'admin.dashboard.error': 'Erro: {message}',

  // ── Admin: tabs ──────────────────────────────────────────────────
  'admin.tab.branding': 'Marca',
  'admin.tab.theme': 'Tema',
  'admin.tab.layout': 'Layout',
  'admin.tab.categories': 'Categorias',
  'admin.tab.cards': 'Cartões',
  'admin.tab.assets': 'Recursos',
  'admin.tab.status': 'Status',
  'admin.tab.hardening': 'Hardening',
  'admin.tab.password': 'Senha',
  'admin.tab.ai': 'IA',
  'admin.tab.webhooks': 'Webhooks',
  'admin.tab.maintenance': 'Manutenção',
  'admin.tab.audit': 'Auditoria',
  'admin.tab.metrics': 'Métricas',
  'admin.tab.oidc': 'OIDC / SSO',
  'admin.tab.tokens': 'Tokens de API',
  'admin.tab.portals': 'Multi-Portal',
  'admin.tab.iconPacks': 'Ícones Git',
  'admin.tab.advanced': 'Avançado',

  // ── Admin: Features (opt-in) ─────────────────────────────────────
  'admin.features.title': 'Features (opt-in)',
  'admin.features.help': 'O que isso faz?',
  'admin.features.intro': 'Cada nova funcionalidade começa <strong>desligada</strong> por padrão. Se você não ativar, ela não roda, não carrega dependência e não aparece na UI. Ligue o que precisar.',
  'admin.features.wave': 'Onda {n}',

  // ── Admin: Audit log viewer ─────────────────────────────────────
  'admin.audit.title': 'Auditoria',
  'admin.audit.reset': 'Limpar filtros',
  'admin.audit.download': 'Baixar log completo',
  'admin.audit.loading': 'Carregando…',
  'admin.audit.empty': 'Nenhuma entrada corresponde a esses filtros.',
  'admin.audit.downloadError': 'Erro ao baixar o log: {message}',

  // ── Admin: Webhooks (opt-in) ─────────────────────────────────────
  'admin.webhooks.title': 'Webhooks',
  'admin.webhooks.intro': 'Notifica URLs externas quando um card monitorado muda de estado (healthy → failing ou vice-versa).',
  'admin.webhooks.add': 'Adicionar',
  'admin.webhooks.testNew': 'Testar antes de salvar',

  // ── Admin: Maintenance windows (opt-in) ─────────────────────────
  'admin.maintenance.title': 'Manutenção',
  'admin.maintenance.intro': 'Programe janelas onde um (ou todos) os cartões estão em manutenção. Durante a janela, os cartões mostram um selo âmbar e NÃO disparam webhooks de health_fail.',
  'admin.maintenance.add': 'Programar',

  // ── Admin: Métricas (opt-in) ─────────────────────────────────────
  'admin.metrics.title': 'Métricas',
  'admin.metrics.intro': 'Sparklines + resumo (avg, p95, max) por cartão com health-check. Dados em memória (últimas 100 amostras = ~1.5h com check a cada 60s).',
  'admin.metrics.reload': 'Recarregar',
  'admin.metrics.loading': 'Carregando…',

  // ── Admin: Multi-user (opt-in) ──────────────────────────────────
  'admin.users.intro': 'Crie usuários com papéis (admin/editor/viewer) e login via username. O password único continua válido como caminho de resgate.',
  'admin.users.accessModeHelp': 'Três modos: apenas password único, password + usuários, ou apenas usuários.',

  // ── Admin: 404 / 500 ─────────────────────────────────────────────
  'admin.errorPage.title': 'Erro',

  // ── Admin: Login ─────────────────────────────────────────────────
  'admin.login.title': 'Entrar',
  'admin.login.password': 'Senha',
  'admin.login.submit': 'Entrar',
  'admin.login.error': 'Senha incorreta',
  'admin.login.csrfError': 'Sessão expirada, recarregue a página',

  // ── Admin: Card editor ───────────────────────────────────────────
  'admin.card.edit': 'Editar cartão',
  'admin.card.new': 'Novo cartão',
  'admin.card.markdown': 'Markdown',
  'admin.card.refreshPreview': 'Atualizar preview',
  'admin.card.previewLabel': 'Pré-visualização',
  'admin.card.tags': 'Tags',
  'admin.card.tagsPlaceholder': 'adicionar tag…',
  'admin.card.tagsHelp': 'Tags em kebab-case (frontend, urgente, legado…). Enter, vírgula ou espaço para adicionar. Backspace remove a última.',
  'admin.card.tagsAdd': '+ adicionar',
  'admin.card.pinned': 'Fixada',
  'admin.card.title': 'Título',
  'admin.card.kind': 'Tipo',
  'admin.card.kind.link': 'Link (clicável)',
  'admin.card.kind.note': 'Nota (informativa, sem link)',
  'admin.card.kindHelp': '"Link" leva a uma URL. "Nota" é apenas informativa (avisos, dicas, etc.).',
  'admin.card.url': 'URL',
  'admin.card.urlRequired': '*',
  'admin.card.urlHelp': 'URL do site ou caminho interno',
  'admin.card.icon': 'Ícone',
  'admin.card.description': 'Descrição',
  'admin.card.category': 'Categoria',
  'admin.card.openInNewTab': 'Abrir em nova aba',
  'admin.card.color': 'Cor de destaque',
  'admin.card.enabled': 'Visível na página inicial',
  'admin.card.healthCheck': 'Monitorar status (health check)',
  'admin.card.systemBadge': 'Sistema',
  'admin.card.deleteConfirm': 'Excluir este cartão?',
  'admin.card.autofill': 'Preencher automaticamente',
  'admin.card.autofillBusy': 'Buscando…',
  'admin.card.improveAI': 'Melhorar com IA',
  'admin.card.descTruncated': 'Descrição truncada para 200 chars ao salvar',
};
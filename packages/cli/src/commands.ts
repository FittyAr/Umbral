/**
 * Comandos de alto nivel sobre el UmbralClient. Cada comando es una
 * función que toma args y devuelve un exit code (0 = ok, 1 = error).
 */

import type { UmbralClient } from './client.js';
import type { Config, Card, ApiToken, Webhook, MaintenanceWindow, User } from './types.js';

export async function cmdConfigGet(client: UmbralClient, args: string[]): Promise<number> {
  const format = args.includes('--json') ? 'json' : 'pretty';
  const cfg = await client.get<Config>('/api/config');
  if (format === 'json') {
    console.log(JSON.stringify(cfg, null, 2));
  } else {
    // Pretty print: mostar brand + theme + cards count
    console.log(`Branding: ${cfg.branding.companyName}`);
    console.log(`Cards: ${cfg.cards.length}`);
    console.log(`Categories: ${cfg.categories.length}`);
    console.log(`Webhooks: ${(cfg.webhooks?.items ?? []).length}`);
    console.log(`Maintenance windows: ${(cfg.maintenanceWindows?.items ?? []).length}`);
    console.log(`API tokens: ${(cfg.apiTokens?.items ?? []).length}`);
    console.log(`Users: ${(cfg.auth?.users ?? []).length}`);
    console.log(`Single password enabled: ${cfg.auth?.singlePasswordEnabled ?? true}`);
  }
  return 0;
}

export async function cmdConfigBackup(client: UmbralClient, _args: string[]): Promise<number> {
  const cfg = await client.get<Config>('/api/config');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `umbral-config-${stamp}.json`;
  console.log(JSON.stringify(cfg, null, 2));
  console.error(`\n# Para guardar en archivo, redirigí a:`);
  console.error(`#   umbral config get > ${filename}`);
  return 0;
}

export async function cmdCardsList(client: UmbralClient, args: string[]): Promise<number> {
  const filterCategory = args.find((a) => a.startsWith('--category='))?.split('=')[1];
  const cfg = await client.get<Config>('/api/config');
  let cards = cfg.cards;
  if (filterCategory) cards = cards.filter((c) => c.category === filterCategory);
  const fmt = args.includes('--json') ? 'json' : 'pretty';
  if (fmt === 'json') {
    console.log(JSON.stringify(cards, null, 2));
  } else {
    for (const c of cards) {
      console.log(`[${c.id}] ${c.title} (${c.kind}) — ${c.url || '(no url)'}`);
    }
  }
  return 0;
}

export async function cmdCardsAdd(client: UmbralClient, args: string[]): Promise<number> {
  const opts = parseArgs(args, ['--title=', '--url=', '--category=', '--icon=', '--description=']);
  if (!opts.title || !opts.url || !opts.category) {
    console.error('Faltan args. Requerido: --title=X --url=Y --category=Z [--icon=...] [--description=...]');
    return 1;
  }
  const id = 'card-' + Date.now().toString(36);
  const cfg = await client.get<Config>('/api/config');
  const newCard: Card = {
    id,
    title: opts.title,
    kind: 'link',
    description: opts.description || '',
    descriptionFormat: 'plain',
    url: opts.url,
    icon: opts.icon || 'globe',
    category: opts.category,
    openInNewTab: true,
    color: cfg.theme.accentColor,
    order: cfg.cards.length,
    enabled: true,
    healthCheck: false,
    pinned: false,
    tags: [],
  };
  await client.put('/api/config', { cards: [...cfg.cards, newCard] });
  console.log(`Card creada: ${id} (${newCard.title})`);
  return 0;
}

export async function cmdUsersList(client: UmbralClient, args: string[]): Promise<number> {
  const cfg = await client.get<Config>('/api/config');
  const users = cfg.auth?.users ?? [];
  const fmt = args.includes('--json') ? 'json' : 'pretty';
  if (fmt === 'json') {
    console.log(JSON.stringify(users, null, 2));
  } else {
    for (const u of users) {
      console.log(`[${u.username}] ${u.displayName} (${u.role}) — epoch=${u.userEpoch}`);
    }
  }
  return 0;
}

export async function cmdTokensList(client: UmbralClient, args: string[]): Promise<number> {
  const cfg = await client.get<Config>('/api/config');
  const tokens = cfg.apiTokens?.items ?? [];
  const fmt = args.includes('--json') ? 'json' : 'pretty';
  if (fmt === 'json') {
    console.log(JSON.stringify(tokens, null, 2));
  } else {
    for (const t of tokens) {
      console.log(`[${t.tokenLast4}] ${t.name} (${t.scope}) ${t.revoked ? 'REVOKED' : 'active'} — last used ${t.lastUsedAt ?? 'never'}`);
    }
  }
  return 0;
}

export async function cmdHealth(client: UmbralClient, _args: string[]): Promise<number> {
  try {
    const res = await client.get<{ status: string; uptime: number }>('/api/health');
    console.log(JSON.stringify(res, null, 2));
    return 0;
  } catch (e) {
    console.error('Error:', (e as Error).message);
    return 1;
  }
}

function parseArgs(args: string[], patterns: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of args) {
    for (const p of patterns) {
      if (arg.startsWith(p)) {
        out[p.slice(2).replace('=', '')] = arg.slice(p.length);
        break;
      }
    }
  }
  return out;
}
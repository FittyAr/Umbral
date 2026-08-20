#!/usr/bin/env -S npx tsx
/**
 * Umbral CLI — entrypoint.
 *
 * Uso:
 *   umbral --url <url> --token <token> <command> [args...]
 *   UMBRAL_URL=https://umbral.internal UMBRAL_TOKEN=umb_xxx umbral <command>
 *
 * Comandos:
 *   config get [--json]
 *   config backup
 *   cards list [--category=X] [--json]
 *   cards add --title=X --url=Y --category=Z [--icon=...] [--description=...]
 *   users list [--json]
 *   tokens list [--json]
 *   health
 *
 * Requisitos: Node 20+, tsx (auto-instalado via npx).
 * Auth: API token con scope 'read' o 'write'. Crear en /admin → Avanzado → API tokens.
 */

import { loadConfig } from './config.js';
import { UmbralClient } from './client.js';
import { cmdConfigGet, cmdConfigBackup, cmdCardsList, cmdCardsAdd, cmdUsersList, cmdTokensList, cmdHealth } from './commands.js';

const HELP = `Umbral CLI v0.1.0

Uso:
  umbral [global options] <command> [command options]

Opciones globales:
  --url <url>          URL del portal Umbral (default: env UMBRAL_URL)
  --token <token>      API token (default: env UMBRAL_TOKEN)
  --config <path>      Archivo de config alternativo (no implementado)

Comandos:
  config get [--json]            Muestra el config completo
  config backup                   Dump JSON a stdout (redirigir a archivo)
  cards list [--category=X] [--json]   Lista cards
  cards add --title=X --url=Y --category=Z [--icon=...] [--description=...]
  users list [--json]             Lista users (multi-user)
  tokens list [--json]            Lista API tokens
  health                          Ping al server

Variables de entorno:
  UMBRAL_URL    Default --url
  UMBRAL_TOKEN  Default --token
`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  // Parse global options
  let url: string | undefined;
  let token: string | undefined;
  const filteredArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url') { url = args[++i]; continue; }
    if (a === '--token') { token = args[++i]; continue; }
    if (a.startsWith('--url=')) { url = a.slice('--url='.length); continue; }
    if (a.startsWith('--token=')) { token = a.slice('--token='.length); continue; }
    filteredArgs.push(a);
  }
  if (filteredArgs.length === 0) {
    console.log(HELP);
    return 0;
  }
  const cfg = loadConfig({ url, token });
  const client = new UmbralClient(cfg);
  const [cmd, sub, ...rest] = filteredArgs;
  try {
    switch (cmd) {
      case 'config':
        if (sub === 'get') return await cmdConfigGet(client, rest);
        if (sub === 'backup') return await cmdConfigBackup(client, rest);
        break;
      case 'cards':
        if (sub === 'list') return await cmdCardsList(client, rest);
        if (sub === 'add') return await cmdCardsAdd(client, rest);
        break;
      case 'users':
        if (sub === 'list') return await cmdUsersList(client, rest);
        break;
      case 'tokens':
        if (sub === 'list') return await cmdTokensList(client, rest);
        break;
      case 'health':
        return await cmdHealth(client, rest);
    }
  } catch (e) {
    console.error('Error:', (e as Error).message);
    return 1;
  }
  console.log(HELP);
  return 1;
}

main().then((code) => process.exit(code));
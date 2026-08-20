/**
 * Config del CLI. Lee de variables de entorno o de un archivo .env
 * (dotenv no se incluye para mantener cero deps — el user puede setear
 * las env vars directamente). Si falta UMBRAL_URL, falla con error claro.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface CliConfig {
  url: string;
  token: string;
}

export function loadConfig(opts: { url?: string; token?: string } = {}): CliConfig {
  const url = opts.url || process.env.UMBRAL_URL || readEnvFile('UMBRAL_URL');
  const token = opts.token || process.env.UMBRAL_TOKEN || readEnvFile('UMBRAL_TOKEN');
  if (!url) {
    throw new Error(
      'Falta UMBRAL_URL. Pasá --url o exportá la variable de entorno. ' +
      'Ej: --url https://umbral.internal o export UMBRAL_URL=https://umbral.internal',
    );
  }
  if (!token) {
    throw new Error(
      'Falta UMBRAL_TOKEN. Pasá --token o exportá la variable de entorno. ' +
      'Consejo: creá un token desde /admin → Avanzado → API tokens.',
    );
  }
  return { url: url.replace(/\/$/, ''), token };
}

function readEnvFile(key: string): string | null {
  const candidates = ['.env', '.umbral.env'];
  for (const c of candidates) {
    const p = resolve(c);
    if (!existsSync(p)) continue;
    try {
      const content = readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (!m) continue;
        if (m[1] === key) return m[2].replace(/^["'](.*)["']$/, '$1');
      }
    } catch {
      continue;
    }
  }
  return null;
}
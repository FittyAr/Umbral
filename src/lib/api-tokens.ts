/**
 * API token verification (opt-in: features.apiTokens).
 *
 * Verifica el header `Authorization: Bearer umb_xxx` contra la lista de
 * tokens guardados en cfg.apiTokens.items. El token plain nunca se guarda.
 *
 * Hash: los tokens nuevos se guardan como `sha256:<hex>`. El token son 256
 * bits aleatorios, así que un hash lento no agrega nada y sí costaba caro:
 * cualquier request con un `Bearer umb_...` inventado (sin autenticar)
 * disparaba un bcrypt por token configurado. Los tokens viejos (bcrypt)
 * siguen funcionando, con un presupuesto global de verificaciones lentas.
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';
import { isFeatureEnabled } from './features';
import { audit } from './config';
import { checkRateLimit } from './rate-limit';
import type { ApiToken } from './schema';

const SHA_PREFIX = 'sha256:';

/** Hash a guardar para un token nuevo. */
export function hashApiToken(plain: string): string {
  return SHA_PREFIX + crypto.createHash('sha256').update(plain).digest('hex');
}

function matchesSha(presented: string, stored: string): boolean {
  const expected = Buffer.from(stored.slice(SHA_PREFIX.length), 'hex');
  const actual = crypto.createHash('sha256').update(presented).digest();
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export interface ApiTokenAuthContext {
  valid: boolean;
  token: ApiToken | null;
  reason?: 'no_header' | 'bad_format' | 'feature_disabled' | 'not_found' | 'revoked' | 'expired' | 'no_match';
}

/**
 * Uso de tokens en el audit log, con ventana de silencio por token.
 *
 * Antes cada request con token escribía una línea. Un monitor que pollea
 * `/api/health` cada 10 s son ~8.600 líneas por día por token, todas
 * idénticas: llenaban el log (que rota a los 10 MB, así que también se
 * comían el historial útil) y serializaban cada request detrás de la lock de
 * escritura del audit. Con la ventana queda el dato que importa —qué token se
 * está usando y desde cuándo— sin el ruido.
 */
const USAGE_WINDOW_MS = 5 * 60 * 1000;
const lastLogged = new Map<string, number>();

async function noteUsage(token: ApiToken): Promise<void> {
  const now = Date.now();
  const previous = lastLogged.get(token.id) ?? 0;
  if (now - previous < USAGE_WINDOW_MS) return;
  lastLogged.set(token.id, now);
  await audit('api_token_used', `id=${token.id} name=${token.name} scope=${token.scope}`);
}

/**
 * Memo de verificaciones exitosas.
 *
 * `bcrypt.compare` con cost 12 son ~250 ms, y se corría una vez por token
 * configurado en CADA request autenticado por token: con cinco tokens, más de
 * un segundo de CPU antes de empezar a responder. Guardamos el sha-256 del
 * token presentado (no el token) y el id que matcheó, por 60 s.
 *
 * El precio es que una revocación puede tardar hasta 60 s en cortar: la
 * entrada memoizada igual se resuelve contra la lista actual de tokens, así
 * que un token revocado o vencido se rechaza en cuanto expira su entrada.
 */
const MATCH_TTL_MS = 60 * 1000;
const matchCache = new Map<string, { tokenId: string; expires: number }>();

function fingerprint(presented: string): string {
  return crypto.createHash('sha256').update(presented).digest('hex');
}

function rememberMatch(presented: string, tokenId: string): void {
  matchCache.set(fingerprint(presented), { tokenId, expires: Date.now() + MATCH_TTL_MS });
  if (matchCache.size > 256) {
    const now = Date.now();
    for (const [key, entry] of matchCache) if (entry.expires <= now) matchCache.delete(key);
  }
}

function recallMatch(presented: string): string | null {
  const hit = matchCache.get(fingerprint(presented));
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    matchCache.delete(fingerprint(presented));
    return null;
  }
  return hit.tokenId;
}

/** Olvida las verificaciones memoizadas. Lo llama el endpoint de tokens
 *  cuando se revoca o se borra uno, para que el corte sea inmediato. */
export function invalidateApiTokenCache(): void {
  matchCache.clear();
}

/** Verifica el header Authorization de un request. Devuelve el token
 *  matcheado (si válido) o razón del fallo. */
export async function verifyApiToken(request: Request): Promise<ApiTokenAuthContext> {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'apiTokens')) {
    return { valid: false, token: null, reason: 'feature_disabled' };
  }
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return { valid: false, token: null, reason: 'no_header' };
  const m = /^Bearer\s+(umb_[a-f0-9]{32,})$/i.exec(header);
  if (!m) return { valid: false, token: null, reason: 'bad_format' };
  const presented = m[1];
  const tokens = cfg.apiTokens?.items ?? [];

  const memoized = recallMatch(presented);
  if (memoized) {
    const t = tokens.find((x) => x.id === memoized);
    // El estado se relee siempre del config: la memo dice "este token es el
    // que matchea", no "este token sigue siendo válido".
    if (t && !t.revoked) {
      if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
        return { valid: false, token: t, reason: 'expired' };
      }
      await noteUsage(t);
      return { valid: true, token: t };
    }
  }

  // Primero los hashes sha256 (baratos), después los bcrypt legacy con un
  // presupuesto global para que tokens inventados no consuman CPU sin fin.
  let matched: ApiToken | null = null;
  for (const t of tokens) {
    if (!t.revoked && t.tokenHash.startsWith(SHA_PREFIX) && matchesSha(presented, t.tokenHash)) {
      matched = t;
      break;
    }
  }
  const legacy = tokens.filter((t) => !t.revoked && !t.tokenHash.startsWith(SHA_PREFIX));
  if (!matched && legacy.length > 0 && checkRateLimit('api-token-bcrypt', 60, 60).ok) {
    for (const t of legacy) {
      try {
        if (await bcrypt.compare(presented, t.tokenHash)) {
          matched = t;
          break;
        }
      } catch {
        continue;
      }
    }
  }
  for (const t of matched ? [matched] : []) {
    // Match! Validar expiración
    if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
      return { valid: false, token: t, reason: 'expired' };
    }
    rememberMatch(presented, t.id);
    await noteUsage(t);
    return { valid: true, token: t };
  }
  return { valid: false, token: null, reason: 'not_found' };
}

/** Genera un token nuevo (plain + hash para guardar). El plain se devuelve
 *  una sola vez al crear. */
export function generateApiTokenPlaintext(): string {
  // umb_ + 32 bytes hex = 36 chars total
  return 'umb_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
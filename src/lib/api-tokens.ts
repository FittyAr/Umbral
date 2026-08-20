/**
 * API token verification (opt-in: features.apiTokens).
 *
 * Verifica el header `Authorization: Bearer umb_xxx` contra la lista de
 * tokens guardados en cfg.auth (o más adelante cfg.apiTokens.items).
 * El token plain nunca se guarda — sólo su hash bcrypt. Verificación O(n)
 * sobre tokens (típicamente <10). Si crece a miles, podemos indexar
 * por hash prefix.
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getConfig } from './config';
import { isFeatureEnabled } from './features';
import { audit } from './config';
import type { ApiToken } from './schema';

export interface ApiTokenAuthContext {
  valid: boolean;
  token: ApiToken | null;
  reason?: 'no_header' | 'bad_format' | 'feature_disabled' | 'not_found' | 'revoked' | 'expired' | 'no_match';
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
  for (const t of tokens) {
    if (t.revoked) continue;
    let ok = false;
    try {
      ok = await bcrypt.compare(presented, t.tokenHash);
    } catch {
      continue;
    }
    if (!ok) continue;
    // Match! Validar expiración
    if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
      return { valid: false, token: t, reason: 'expired' };
    }
    // OK
    const updated = tokens.map((x) => x.id === t.id ? { ...x, lastUsedAt: new Date().toISOString() } : x);
    // No guardamos lastUsedAt en el save (sería 1 write por request,
    // excesiva). Lo dejamos en memoria. Si el admin quiere ver lastUsedAt
    // exacto, necesita una implementación con caching/rebatching.
    // Para esta v1, sólo logueamos audit.
    void updated; // ver nota arriba
    await audit('api_token_used', `id=${t.id} name=${t.name} scope=${t.scope}`);
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
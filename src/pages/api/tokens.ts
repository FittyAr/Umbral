/**
 * POST /api/tokens → Genera un nuevo API Token (devuelve plaintext 1 sola vez)
 * DELETE /api/tokens → Revoca un token existente por id
 *
 * Gating: solo admin autenticado y si features.apiTokens está activa.
 */
import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { generateApiTokenPlaintext } from '~/lib/api-tokens';
import { getConfig, saveConfig, audit } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import { json, error, readJson } from '~/lib/http';
import type { ApiToken } from '~/lib/schema';
import { newId } from '~/lib/ids';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth?.isAuthenticated || !auth?.isAdmin) {
    return error('No autorizado', 401);
  }

  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'apiTokens')) {
    return error('Feature apiTokens apagada', 403);
  }

  const body = await readJson<{ name?: string; scope?: 'read' | 'write'; expiresInDays?: number }>(request);
  const name = body.name?.trim();
  if (!name) return error('El nombre del token es requerido', 400);

  const scope = body.scope === 'write' ? 'write' : 'read';
  const plainToken = generateApiTokenPlaintext();
  const tokenHash = await bcrypt.hash(plainToken, 10);
  const tokenLast4 = plainToken.slice(-4);
  const id = newId('tok');
  const createdAt = new Date().toISOString();
  let expiresAt: string | null = null;
  if (body.expiresInDays && Number(body.expiresInDays) > 0) {
    expiresAt = new Date(Date.now() + Number(body.expiresInDays) * 86400 * 1000).toISOString();
  }

  const newToken: ApiToken = {
    id,
    name,
    tokenHash,
    tokenLast4,
    scope,
    createdAt,
    expiresAt,
    lastUsedAt: null,
    revoked: false,
  };

  const existingTokens = cfg.apiTokens?.items ?? [];
  const updatedTokens = [...existingTokens, newToken];

  await saveConfig({
    apiTokens: {
      items: updatedTokens,
    },
  });

  await audit('api_token_created', `name=${name} scope=${scope} actor=${auth.actor}`);

  return json({
    ok: true,
    token: plainToken,
    item: {
      id: newToken.id,
      name: newToken.name,
      scope: newToken.scope,
      tokenLast4: newToken.tokenLast4,
      createdAt: newToken.createdAt,
      expiresAt: newToken.expiresAt,
      revoked: false,
    },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth?.isAuthenticated || !auth?.isAdmin) {
    return error('No autorizado', 401);
  }

  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'apiTokens')) {
    return error('Feature apiTokens apagada', 403);
  }

  const body = await readJson<{ id?: string }>(request);
  const id = body.id?.trim();
  if (!id) return error('Falta id del token', 400);

  const existingTokens = cfg.apiTokens?.items ?? [];
  const found = existingTokens.find((t) => t.id === id);
  if (!found) return error('Token no encontrado', 404);

  const updatedTokens = existingTokens.filter((t) => t.id !== id);
  await saveConfig({
    apiTokens: {
      items: updatedTokens,
    },
  });

  await audit('api_token_revoked', `name=${found.name} actor=${auth.actor}`);
  return json({ ok: true });
};

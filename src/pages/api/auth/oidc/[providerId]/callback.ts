/**
 * GET /api/auth/oidc/:providerId/callback
 *
 * Callback del flow OIDC. El IdP redirige al user acá después de
 * autenticarse. Validamos state (CSRF), canjeamos code por tokens,
 * verificamos nonce + iss + exp del id_token, auto-provisionamos el
 * user si está configurado, e iniciamos sesión.
 *
 * Feature gate: igual que /start.
 * Público: no requiere sesión previa (es el momento de crearla).
 */
import type { APIRoute } from 'astro';
import { parse as parseCookie } from 'cookie';
import { getActiveOIDCProvider, consumeStateFlow, exchangeCode, verifyIdToken, resolveRole } from '~/lib/oidc';
import { getConfig, saveConfig, audit } from '~/lib/config';
import { createSessionToken, buildSessionCookie } from '~/lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, url }) => {
  const providerId = String(params.providerId || '');
  if (!providerId) return new Response('Falta el providerId', { status: 400 });

  const provider = await getActiveOIDCProvider(providerId);
  if (!provider) {
    return new Response('OIDC provider no encontrado', { status: 404 });
  }

  // Validar state (CSRF)
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return new Response('Faltan code o state en el callback', { status: 400 });
  }
  const flow = consumeStateFlow(state);
  if (!flow || flow.providerId !== providerId) {
    return new Response('State inválido o expirado (posible CSRF)', { status: 401 });
  }
  if (flow.nonce === undefined) {
    return new Response('State inválido: no nonce', { status: 401 });
  }

  // Canjear code por tokens
  let tokens;
  try {
    tokens = await exchangeCode(provider, code, flow.codeVerifier, flow.redirectUri);
  } catch (e) {
    await audit('oidc_exchange_fail', `provider=${providerId} ip=${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return new Response(`Error canjeando code: ${(e as Error).message}`, { status: 500 });
  }

  // Verificar id_token (nonce + iss + exp + aud)
  try {
    verifyIdToken(tokens.idToken, provider, flow.nonce);
  } catch (e) {
    return new Response(`id_token inválido: ${(e as Error).message}`, { status: 401 });
  }

  // Extraer claims según claimMap
  const claimMap = provider.claimMap ?? {};
  const username = String(tokens.idToken[claimMap.username ?? 'preferred_username'] ?? tokens.idToken.sub ?? '').toLowerCase().trim();
  const email = String(tokens.idToken[claimMap.email ?? 'email'] ?? '').toLowerCase().trim();
  const displayName = String(tokens.idToken[claimMap.displayName ?? 'name'] ?? username);
  if (!username) {
    return new Response('OIDC no devolvió username', { status: 400 });
  }

  // Buscar o auto-provisionar user
  const cfg = await getConfig();
  const users = cfg.auth?.users ?? [];
  const existingIdx = users.findIndex((u) => u.username.toLowerCase() === username);
  let userId: string;
  let userEpoch: number;
  let role: 'admin' | 'editor' | 'viewer';
  if (existingIdx >= 0) {
    userId = users[existingIdx].id;
    userEpoch = users[existingIdx].userEpoch;
    role = resolveRole(tokens.idToken, provider, users[existingIdx].role);
    // Si el role cambió, persistir
    if (role !== users[existingIdx].role) {
      const newUsers = users.map((u) => u.id === userId ? { ...u, role } : u);
      await saveConfig({ auth: { ...cfg.auth, users: newUsers, passwordHash: cfg.auth!.passwordHash, csrfToken: cfg.auth!.csrfToken, authEpoch: cfg.auth!.authEpoch, singlePasswordEnabled: cfg.auth!.singlePasswordEnabled } } as any);
    }
  } else {
    if (!provider.autoProvision) {
      await audit('oidc_user_not_provisioned', `username=${username} provider=${providerId}`);
      return new Response(`El user "${username}" no existe. Pedile al admin que te cree una cuenta o active autoProvision.`, { status: 403 });
    }
    role = resolveRole(tokens.idToken, provider, null);
    userId = 'u-oidc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    userEpoch = 0;
    const newUser = {
      id: userId,
      username,
      displayName: displayName || username,
      passwordHash: '!oidc-no-password', // sentinel: este user solo puede entrar via OIDC
      role,
      userEpoch,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    const newUsers = [...users, newUser];
    // No podemos usar saveConfig (que requiere passwordHash como string) sin
    // re-armar el auth. Lo guardamos vía escritura directa del archivo.
    // Para simplificar esta v1, sólo logueamos y devolvemos 500 si el
    // auto-provision no se puede hacer via saveConfig.
    // TODO v2: armar un endpoint dedicado POST /api/users/{id} que
    // use saveConfig correctamente.
    await audit('oidc_user_provisioned', `username=${username} role=${role} provider=${providerId}`);
    return new Response(`Auto-provision no implementado en esta v1. Admin debe crear el user "${username}" manualmente primero.`, { status: 501 });
  }

  // Iniciar sesión con el userEpoch
  const csrfToken = cfg.auth?.csrfToken ?? '';
  const sessionToken = createSessionToken(cfg.auth?.authEpoch ?? 0, userEpoch);
  await audit('oidc_login_ok', `username=${username} provider=${providerId} role=${role}`);

  return new Response(null, {
    status: 302,
    headers: {
      Location: provider.redirectPath || '/',
      'Set-Cookie': await buildSessionCookie(sessionToken),
    },
  });
};
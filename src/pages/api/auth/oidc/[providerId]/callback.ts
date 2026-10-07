/**
 * GET /api/auth/oidc/:providerId/callback
 *
 * Callback del flow OIDC. El IdP redirige al user acá después de
 * autenticarse. Validamos state (contra la cookie del navegador que empezó
 * el flow), canjeamos code por tokens, verificamos nonce + iss + exp del
 * id_token, vinculamos o auto-provisionamos el user, e iniciamos sesión.
 *
 * Feature gate: igual que /start.
 * Público: no requiere sesión previa (es el momento de crearla).
 */
import type { APIRoute } from 'astro';
import {
  getActiveOIDCProvider,
  consumeStateFlow,
  exchangeCode,
  verifyIdToken,
  resolveRole,
  isAllowedIssuer,
  safeRedirectPath,
  oidcSubjectOf,
  clearStateCookie,
  STATE_COOKIE,
} from '~/lib/oidc';
import { updateConfig, audit } from '~/lib/config';
import { OIDC_NO_PASSWORD } from '~/lib/config/gating';
import { createSessionToken, buildSessionCookie, parseCookie, safeEqual } from '~/lib/auth';
import { newId } from '~/lib/ids';
import type { Config } from '~/lib/schema';

export const prerender = false;

type User = NonNullable<Config['auth']>['users'][number];

function fail(message: string, status: number): Response {
  // El state ya se consumió (o no sirve): limpiar la cookie.
  return new Response(message, { status, headers: { 'Set-Cookie': clearStateCookie() } });
}

export const GET: APIRoute = async ({ params, request, url, locals }) => {
  const providerId = String(params.providerId || '');
  if (!providerId) return fail('Falta el providerId', 400);
  const ip = locals.clientIp || 'unknown';

  const provider = await getActiveOIDCProvider(providerId);
  if (!provider) return fail('OIDC provider no encontrado', 404);
  if (!isAllowedIssuer(provider.issuer)) return fail('El issuer OIDC tiene que ser https.', 500);

  // Validar state: tiene que coincidir con la cookie que /start dejó en ESTE
  // navegador. Sin ese chequeo, un atacante podía mandarle a la víctima su
  // propia URL de callback (code + state) y loguearla como el atacante.
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return fail('Faltan code o state en el callback', 400);
  const cookieState = parseCookie(request.headers.get('cookie') || '')[STATE_COOKIE];
  if (!safeEqual(cookieState, state)) {
    await audit('oidc_state_mismatch', `provider=${providerId} ip=${ip}`);
    return fail('State inválido (posible CSRF). Volvé a iniciar el login.', 401);
  }
  const flow = consumeStateFlow(state);
  if (!flow || flow.providerId !== providerId || flow.nonce === undefined) {
    return fail('State inválido o expirado. Volvé a iniciar el login.', 401);
  }

  // Canjear code por tokens
  let tokens;
  try {
    tokens = await exchangeCode(provider, code, flow.codeVerifier, flow.redirectUri);
  } catch (e) {
    console.error(`[umbral] OIDC exchange (${providerId}) falló:`, (e as Error).message);
    await audit('oidc_exchange_fail', `provider=${providerId} ip=${ip}`);
    return fail('No se pudo completar el login OIDC.', 502);
  }

  // Verificar id_token (nonce + iss + exp + aud)
  try {
    verifyIdToken(tokens.idToken, provider, flow.nonce);
  } catch (e) {
    console.error(`[umbral] OIDC id_token (${providerId}) inválido:`, (e as Error).message);
    return fail('id_token inválido.', 401);
  }

  const subject = oidcSubjectOf(provider, tokens.idToken);
  if (!subject) return fail('El id_token no trae sub.', 400);

  // Extraer claims según claimMap
  const claimMap = provider.claimMap ?? {};
  const username = String(tokens.idToken[claimMap.username ?? 'preferred_username'] ?? tokens.idToken.sub ?? '')
    .toLowerCase()
    .trim();
  const displayName = String(tokens.idToken[claimMap.displayName ?? 'name'] ?? username);
  if (!username) return fail('OIDC no devolvió username', 400);

  // Vincular o auto-provisionar dentro del lock del config: dos primeros
  // logins simultáneos ya no se pisan el users[].
  // Holder (y no `let`) porque se asigna dentro del mutator.
  const res: { user: User | null; outcome: 'linked' | 'existing' | 'provisioned' | 'not_provisioned' | 'conflict' } = {
    user: null,
    outcome: 'existing',
  };
  const cfg = await updateConfig((current) => {
    const users = current.auth?.users ?? [];
    const now = new Date().toISOString();
    let found = users.find((u) => u.oidcSubject === subject);
    if (!found) {
      // Vínculo inicial: sólo con un user OIDC sin vincular (creado por una
      // versión anterior). Un user local con password no se toma por
      // username: el preferred_username suele ser editable en el IdP.
      const candidate = users.find((u) => u.username.toLowerCase() === username);
      if (candidate && candidate.passwordHash === OIDC_NO_PASSWORD && !candidate.oidcSubject) {
        found = candidate;
        res.outcome = 'linked';
      } else if (candidate) {
        res.outcome = 'conflict';
        return null;
      }
    }
    if (found) {
      const role = resolveRole(tokens.idToken, provider, found.role);
      res.user = { ...found, role, oidcSubject: subject, lastLoginAt: now };
      const updated = users.map((u) => (u.id === found!.id ? res.user! : u));
      return { auth: { ...current.auth!, users: updated } };
    }
    if (!provider.autoProvision) {
      res.outcome = 'not_provisioned';
      return null;
    }
    res.outcome = 'provisioned';
    res.user = {
      id: newId('u-oidc'),
      username,
      displayName: displayName || username,
      passwordHash: OIDC_NO_PASSWORD, // sentinel: este user solo puede entrar via OIDC
      role: resolveRole(tokens.idToken, provider, null),
      userEpoch: 0,
      createdAt: now,
      lastLoginAt: now,
      totpSecret: null,
      oidcSubject: subject,
    };
    return { auth: { ...current.auth!, users: [...users, res.user] } };
  });

  if (res.outcome === 'conflict') {
    await audit('oidc_username_conflict', `username=${username} provider=${providerId}`);
    return fail(`Ya existe un usuario local "${username}". Pedile al admin que lo vincule o lo renombre.`, 409);
  }
  if (res.outcome === 'not_provisioned' || !res.user) {
    await audit('oidc_user_not_provisioned', `username=${username} provider=${providerId}`);
    return fail(`El user "${username}" no existe. Pedile al admin que te cree una cuenta o active autoProvision.`, 403);
  }
  const u = res.user;
  if (res.outcome === 'provisioned') {
    await audit('oidc_user_provisioned', `username=${username} role=${u.role} provider=${providerId}`);
  }

  const sessionToken = createSessionToken({
    subject: u.id,
    authEpoch: cfg.auth?.authEpoch ?? 0,
    userEpoch: u.userEpoch,
  });
  await audit('oidc_login_ok', `username=${username} provider=${providerId} role=${u.role}`);

  const headers = new Headers({ Location: safeRedirectPath(provider.redirectPath) });
  headers.append('Set-Cookie', await buildSessionCookie(sessionToken));
  headers.append('Set-Cookie', clearStateCookie());
  return new Response(null, { status: 302, headers });
};

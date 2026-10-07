/**
 * GET /api/auth/oidc/:providerId/start
 *
 * Inicia el flow OIDC. Construye el authorization URL con PKCE S256,
 * genera state + nonce + code_verifier, los guarda en una cookie firmada
 * y en el map pendingFlows, y redirige al IdP.
 *
 * Feature gate: requiere `features.oidc.enabled === true` Y un provider
 * con el id dado que esté `enabled: true`. Si no, devuelve 404.
 *
 * Público: el endpoint es público (no requiere sesión — el user todavía
 * no está logueado, está intentando loguearse).
 */
import type { APIRoute } from 'astro';
import { getActiveOIDCProvider, buildAuthorizationUrl, signStateCookie, isAllowedIssuer } from '~/lib/oidc';
import { checkRateLimit } from '~/lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const providerId = String(params.providerId || '');
  if (!providerId) return new Response('Falta el providerId', { status: 400 });

  // Público y con estado en memoria: sin límite se podía llenar pendingFlows.
  const rl = checkRateLimit(`oidc-start:${locals.clientIp || 'unknown'}`, 20, 60);
  if (!rl.ok) return new Response('Demasiados intentos. Probá en un minuto.', { status: 429 });

  const provider = await getActiveOIDCProvider(providerId);
  if (!provider) {
    return new Response('OIDC provider no encontrado o feature apagada', { status: 404 });
  }
  if (!isAllowedIssuer(provider.issuer)) {
    return new Response('El issuer OIDC tiene que ser https.', { status: 500 });
  }

  // redirectUri: el callback debe ser esta misma URL con /callback.
  // Se deriva del request actual. En producción con reverse proxy,
  // BASE_URL debería estar seteado.
  const baseUrl = process.env.BASE_URL || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/auth/oidc/${providerId}/callback`;

  try {
    const { url, state, codeVerifier, nonce } = await buildAuthorizationUrl(provider, redirectUri);
    const cookie = signStateCookie(state, codeVerifier, nonce, providerId, redirectUri);
    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Set-Cookie': cookie },
    });
  } catch (e) {
    console.error(`[umbral] OIDC start (${providerId}) falló:`, (e as Error).message);
    return new Response('No se pudo iniciar el login OIDC.', { status: 502 });
  }
};
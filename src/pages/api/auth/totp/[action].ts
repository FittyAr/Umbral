/**
 * POST /api/auth/totp/:action
 * Action: 'setup' | 'verify' | 'disable'
 *
 * Gating: solo admin autenticado y si features.totp2fa está activa.
 */
import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { generateTotpSecret, getQrCodeUrl, verifyTotp, encryptTotpSecret } from '~/lib/totp';
import { getConfig, updateConfig, audit } from '~/lib/config';
import { isFeatureEnabled } from '~/lib/features';
import { json, error, readJson } from '~/lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const auth = locals.auth;
  if (!auth?.isAuthenticated || !auth?.isAdmin) {
    return error('No autorizado', 401);
  }

  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'totp2fa')) {
    return error('Feature totp2fa apagada', 403);
  }

  const action = String(params.action || '');
  const body = await readJson<{ userId?: string; secret?: string; code?: string }>(request);
  const userId = body.userId?.trim();
  if (!userId) return error('Falta userId', 400);

  const users = cfg.auth?.users ?? [];
  const user = users.find((u) => u.id === userId);
  if (!user) return error('Usuario no encontrado', 404);

  if (action === 'setup') {
    const secret = generateTotpSecret();
    const otpauthUrl = getQrCodeUrl(user.username, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 });
    return json({
      ok: true,
      secret,
      otpauthUrl,
      qrDataUrl,
    });
  }

  if (action === 'verify') {
    const secret = body.secret?.trim();
    const code = body.code?.trim();
    if (!secret || !code) return error('Faltan secret o code', 400);

    const valid = verifyTotp(secret, code);
    if (!valid) return error('Código incorrecto. Revisá la hora de tu dispositivo e intentá de nuevo.', 400);

    const encryptedSecret = encryptTotpSecret(secret);
    await setUserTotp(userId, encryptedSecret);
    await audit('totp_enabled', `user=${user.username} actor=${auth.actor}`);
    return json({ ok: true });
  }

  if (action === 'disable') {
    await setUserTotp(userId, null);
    await audit('totp_disabled', `user=${user.username} actor=${auth.actor}`);
    return json({ ok: true });
  }

  return error('Acción no soportada', 400);
};

/** Read-modify-write bajo el lock del config: sin él, activar 2FA mientras
 *  otro guardado estaba en curso podía perder uno de los dos cambios. */
function setUserTotp(userId: string, totpSecret: string | null) {
  return updateConfig((current) => {
    if (!current.auth) return null;
    const users = current.auth.users.map((u) => (u.id === userId ? { ...u, totpSecret } : u));
    return { auth: { ...current.auth, users } };
  });
}

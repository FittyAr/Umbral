import type { APIRoute } from 'astro';
import { isFeatureEnabled } from '~/lib/features';
import { isLocale, LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '~/i18n';
import { getConfig } from '~/lib/config';

export const prerender = false;

/**
 * POST /api/locale
 *
 * Body: { locale: string } (form-urlencoded o JSON).
 * Set cookie `umbral_locale` por 30 días, redirige a la página anterior.
 *
 * Gate: sólo funciona si `features.i18n.enabled === true`. Si la feature
 * está apagada, devuelve 404. El visitante no puede forzar i18n si el
 * admin no lo activó (principio 7).
 */
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const cfg = await getConfig();
  if (!isFeatureEnabled(cfg, 'i18n')) {
    return new Response('i18n no está habilitado en este portal', { status: 404 });
  }

  let locale: string | undefined;
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      locale = typeof body?.locale === 'string' ? body.locale : undefined;
    } else {
      // form-urlencoded (default del <form method="post">).
      const form = await request.formData();
      const v = form.get('locale');
      locale = typeof v === 'string' ? v : undefined;
    }
  } catch {
    return new Response('Body inválido', { status: 400 });
  }

  if (!locale || !isLocale(locale)) {
    return new Response(`Locale inválido (esperado: ${LOCALES.join(' | ')})`, { status: 400 });
  }

  cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    // No `secure` aquí: la cookie puede setearse por HTTP si el admin
    // corre el portal en LAN. El flag Secure lo maneja el flow de
    // sesión existente (ver security.session.cookieSecure).
  });

  // Redirigimos al referer para que el server re-renderice con el
  // locale nuevo. Si no hay referer, a la portada.
  const referer = request.headers.get('referer') || '/';
  // Sanity: sólo redirigimos a paths del mismo origin. Si el referer
  // apunta a otro dominio, caemos a '/'.
  let target = '/';
  try {
    const r = new URL(referer);
    const o = new URL(request.url);
    if (r.origin === o.origin) target = r.pathname + r.search;
  } catch {
    target = '/';
  }

  return redirect(target, 303);
};

/** GET → 405. La spec dice POST only. */
export const GET: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
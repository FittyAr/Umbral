# Seguridad — pasada de auditoría

> Notas sobre el hardening aplicado, bugs encontrados y arreglados, decisiones de diseño. **No** es marketing — es la lista honesta de qué se hizo y qué NO se hizo.

## TL;DR

- **4 rondas de find-bugs** completas (commits `1dba3be`, `dcf5b52`, `fd28209`, `2198b2d`, `e1fde7e`).
- **Todas las severidades arregladas** (no se dejaron bugs para "después").
- **Defaults permisivos**, endurecimiento explícito desde el panel admin.
- **Una sesión + un CSRF + un epoch = revocación inmediata** al cambiar la password.
- **Defensa en profundidad**: CSP, HSTS, rate limit, CSRF, body caps, sanitización SVG, MIME whitelist, SSRF protection.

## Modelo de amenaza

Asumimos:

- **El admin es semi-confiable.** Puede equivocarse, pero no es hostil. Por eso la sanitización SVG es opt-out (no opt-in), y el rate limit es permisivo (30/min).
- **Los usuarios son no-confiables.** Pueden intentar XSS, CSRF, SSRF, fuerza bruta. Todas estas cosas se mitigan.
- **El network no es confiable.** Todo el tráfico externo puede ser interceptado/modificado. HTTPS + HSTS obligatorio en prod.
- **El host es semi-confiable.** Asumimos que el filesystem está limpio al boot. No defendemos contra un server ya comprometido (eso es responsabilidad del OS / infra).
- **El reverse proxy es confiable.** Saneamos los headers que el cliente manda (`X-Forwarded-For`, `X-Forwarded-Proto`), pero confiamos en lo que el proxy nos pasa.

Lo que **no** defendemos:

- **Un admin comprometido.** Si el admin sube un SVG con XSS y desactiva la sanitización, es problema del admin.
- **Side channels** (timing attacks en bcrypt — bcrypt usa comparación constant-time, OK).
- **Ataques físicos** al host.
- **Comprometer Node 20 mismo** (no es responsabilidad nuestra).

## Bugs encontrados y arreglados

### Round 1 (`1dba3be`): Hardening panel base

- Schema de seguridad completo en `data/config.json`.
- UI del panel admin con todos los campos editables.
- Deep-merge de secciones de security.
- `cfg.security.uploads.allowedMimeTypes` acepta `text/html` y similares → **arreglado en round 2 con regex `^image/`**.
- `seedIfMissing` con race condition en primer boot → **arreglado en round 4**.
- `removeCategory` permite borrar la última categoría → **arreglado en round 4**.

### Round 1.5 (`dcf5b52`): XSS + SSRF + varios

- **XSS via `fontFamily`:** `<style set:html={...}>` con valor controlado por el admin. Bloqueado con regex `[\w\- ]{1,60}`.
- **XSS via background `value`:** mismo vector. Bloqueado con regex SAFE_CSS_VALUE (bloquea `<>'"\`{}`).
- **SSRF en `/api/status`:** el endpoint hacía HEAD a cualquier URL que el admin pusiera. Bloqueado:
  - IPs privadas (RFC 1918: 10/8, 172.16/12, 192.168/16).
  - Loopback (127/8, ::1).
  - Link-local (169.254/16, fe80::/10).
  - DNS resolution check antes de conectar (anti DNS rebinding).
  - `redirect: 'manual'` (no sigue redirects).
- **Varios:** getSecret() random por call → session token nunca verificaba después del segundo request. **Arreglado en round 2 con cache.**

### Round 2 (`fd28209`): auth epoch, HSTS, body cap, bcrypt bug

- **Auth epoch:** el session token ahora incluye `authEpoch` firmado. Al cambiar la password, todas las sesiones (menos la tuya) quedan inválidas al instante.
- **HSTS configurable:** `auto`/`always`/`never` con max-age, includeSubDomains, preload. Default `auto` así un deploy HTTPS queda hardened OOTB.
- **Body caps:** 1MB en `/api/config` y `/api/import`, 10MB en `/api/upload`. Verifica `Content-Length` antes de leer.
- **bcrypt import bug:** `await import('bcryptjs')` rompía en runtime. Cambiado a `import bcrypt from 'bcryptjs'`.
- **`clearSessionCookie` regresión:** había perdido el fallback a `NODE_ENV !== 'production'`. Restaurado.

### Round 3 (`2198b2d`): weak secret detection, import cap

- **`SESSION_SECRET` débil:** detecta los defaults comunes (`change-me-please...`, `admin`, `secret`, etc) y loguea FATAL. El server sigue funcionando, pero el admin sabe.
- **Import cap:** `/api/import` ahora valida el tamaño del body antes de parsear.

### Round 4 (`e1fde7e`): race conditions, validation, deep merge

- **`seedIfMissing` race:** dos requests concurrentes en el primer boot generaban configs distintos. Ahora se cachea la promise.
- **`audit()` race:** dos escrituras concurrentes del audit log no rotaban a la vez. Ahora con lock chain.
- **`loadFresh` merge shallow:** si el `config.json` tenía sólo `security.session`, el merge pisaba el resto de `security`. Deep-merge.
- **`allowedMimeTypes` schema:** aceptaba `text/html` → XSS via upload. Regex `^image\/` por elemento.
- **`rotateCsrfOnLogin` order:** rotábamos el CSRF después de crear el session token, así que el siguiente request fallaba con CSRF inválido. Ahora rotamos antes.
- **`deleteAsset` TOCTOU:** verificaba `usedBy` con cache, después borraba el asset. Entre el check y el delete, otra request podía referenciarlo. Ahora `_invalidate()` antes del check final.
- **X-Forwarded-Proto multi-hop:** `X-Forwarded-Proto: https,http` se splitea por `,` y se toma el primero.
- **`removeCategory` última categoría:** bloqueado.
- **`status.ts` body validation:** `ids` no validado que fuera array. Ahora `Array.isArray`.

## Decisiones deliberadas (no son bugs)

### `'unsafe-eval'` en CSP

Alpine.js 3 usa `new Function()` para evaluar directivas. Sin `'unsafe-eval'`, Alpine tira errores en consola y parte de la UI no funciona. Decisión: **dejar el default con `'unsafe-eval'`** y documentar.

Para endurecer realmente: usar el build CSP de Alpine (cambia el import) o nonces por request. Es trabajo no trivial — no se hizo por scope.

### `'unsafe-inline'` en `style-src`

El `<style is:inline set:html>` del PublicLayout emite CSS vars. Sacar `'unsafe-inline'` requiere extraerlo a un `.css` file con hash. Decisión: **dejar por simplicidad**, documentar.

### Default `cookieSameSite: 'Lax'` (no `'Strict'`)

`Strict` rompe links cross-site y formularios que en una intranet son razonables. `Lax` es el balance correcto para una umbral interna. Decisión: **default permisivo**, hardening disponible en el panel.

### Default `rateLimitMax: 30/min`

30 intentos de login por minuto por IP es muy permisivo. Pero una intranet puede tener NAT con muchos usuarios detrás de la misma IP. Decisión: **default permisivo**, ajustable desde el panel.

### Default `allowSvg: true` + `sanitizeSvg: true`

SVGs son comunes para logos e íconos. Sanitización via DOMPurify es razonablemente segura. Decisión: **permitir SVG por default con sanitización obligatoria**, opt-out disponible.

### No hay HSTS preload por default

HSTS preload es un commitment fuerte (el dominio queda en la lista de Chrome por años). Decisión: **opt-in explícito**.

### No hay multi-user

Un solo password compartido. Decisión consciente: este proyecto es para intranets chicas donde un solo admin alcanza. Para multi-user, SSO detrás del reverse proxy.

### Sin rate limit en `/api/config` y otros

Sólo `/api/login` tiene rate limit. Asumimos que el reverse proxy (Cloudflare, Caddy) hace rate limit general.

## Defensa en profundidad

| Capa | Qué defiende | Implementación |
|---|---|---|
| **Network** | HTTPS, HSTS | Caddy + `cfg.security.headers.hsts` |
| **Browser** | XSS | CSP (`default-src 'self'`), DOMPurify para SVG subido, regex SAFE_CSS_VALUE |
| **Browser** | Clickjacking | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |
| **Browser** | Privacidad | `Referrer-Policy: no-referrer`, `Permissions-Policy` |
| **Cookies** | Session hijacking | `HttpOnly`, `Secure` (auto), `SameSite` (configurable), `authEpoch` |
| **API** | CSRF | `x-csrf-token` en mutaciones, validación en middleware |
| **API** | Brute force | Rate limit en `/api/login` (configurable) |
| **API** | DoS via body | Body caps 1MB/10MB en middleware |
| **API** | Injection (path) | Path sanitization en `/api/assets/[name]` |
| **Uploads** | XSS via SVG | MIME whitelist `^image/`, DOMPurify, `svgNoScripts` stripper |
| **Uploads** | OOM | Body cap 10MB, `processImages: true` con sharp resize |
| **Status** | SSRF | Blocklist IPs privadas/loopback/link-local + DNS check + `redirect: 'manual'` |
| **Auth** | Stolen session | `authEpoch` en token + signature HMAC |
| **Auth** | Default secret | Known-weak detection (FATAL log) |
| **Storage** | Race conditions | Lock chain en `audit()`, cached promise en `seedIfMissing()`, atomic rename |
| **Storage** | TOCTOU | `_invalidate()` antes de check final en `deleteAsset` |
| **Container** | Privilege escalation | `cap_drop: ALL`, `no-new-privileges`, user no-root |
| **Container** | Write outside volume | tmpfs en /tmp, app dir read-only para runtime |
| **Observabilidad** | Forensic | Audit log append-only con rotación a 10MB |
| **Observabilidad** | Corruption | Atomic write (`.tmp` + rename) |

## Qué se puede endurecer más (no implementado)

1. **HSTS nonce-based CSP.** Sacar `'unsafe-eval'` y `'unsafe-inline'` con nonces por request. Trabajo: medio día.
2. **CSRF en GET.** Política `'all'`. Útil sólo si tu modelo de amenaza incluye XSS previo.
3. **CSP report-uri.** Reportar violaciones a un endpoint para análisis. Útil en deployments grandes.
4. **WebAuthn / 2FA.** Para reemplazar el password único. Trabajo: varios días.
5. **Audit log a syslog.** Para centralizar. Hoy es append-only en filesystem.
6. **Argon2id** en vez de bcrypt. Más moderno, mejor contra GPU attacks. Cambio chico.
7. **Lockout tras N intentos.** Hoy es rate limit (throttle), no lockout (bloqueo hasta intervención).
8. **Verificación del CSRF en respuestas JSON.** Hoy validamos header. Podríamos también validar en un cookie double-submit.

## Recursos

- [OWASP Top 10](https://owasp.org/Top10/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [HSTS Preload](https://hstspreload.org/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [DOMPurify XSS Cheat Sheet](https://github.com/cure53/DOMPurify/blob/main/tests/node-test-suite.js) — qué bloquea.

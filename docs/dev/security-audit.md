# Seguridad — pasada de auditoría

> Notas sobre el hardening aplicado, bugs encontrados y arreglados, decisiones de diseño. **No** es marketing — es la lista honesta de qué se hizo y qué NO se hizo.

## TL;DR

- **4 rondas de find-bugs** completas (commits `1dba3be`, `dcf5b52`, `fd28209`, `2198b2d`, `e1fde7e`), más una revisión posterior de auth, roles, SSRF e icon packs (ver Round 5).
- **Todas las severidades arregladas** (no se dejaron bugs para "después").
- **Defaults permisivos**, endurecimiento explícito desde el panel admin.
- **Sesión con sujeto + CSRF por sesión + epochs = revocación inmediata** al cambiar la password, y revocación puntual en el logout.
- **Roles aplicados en el server**: `viewer` lee, `editor` edita contenido, todo lo demás es `admin`.
- **Defensa en profundidad**: CSP, HSTS, rate limit, CSRF, body caps, sanitización SVG, MIME whitelist, SSRF protection.

## Modelo de amenaza

Asumimos:

- **El admin es semi-confiable.** Puede equivocarse, pero no es hostil. Por eso la sanitización SVG es opt-out (no opt-in), y el rate limit es permisivo (30/min).
- **Los usuarios son no-confiables.** Pueden intentar XSS, CSRF, SSRF, fuerza bruta. Todas estas cosas se mitigan.
- **El network no es confiable.** Todo el tráfico externo puede ser interceptado/modificado. HTTPS + HSTS obligatorio en prod.
- **El host es semi-confiable.** Asumimos que el filesystem está limpio al boot. No defendemos contra un server ya comprometido (eso es responsabilidad del OS / infra).
- **El reverse proxy es confiable.** Con `trustForwardedFor`, `X-Forwarded-For` se lee de derecha a izquierda: confiamos en la entrada que agregó nuestro proxy (o en los saltos de `trustedProxies`), nunca en la que puso el cliente.

Lo que **no** defendemos:

- **Un admin comprometido.** Un admin puede hacer todo lo que el panel permite. (La sanitización de SVG ya no se puede desactivar: `sanitizeSvg` quedó sin efecto y DOMPurify corre siempre.)
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

### Round 5: revisión de auth, roles y SSRF

**Sesiones y auth**

- **Cualquier usuario nuevo entraba como super-admin.** El token de sesión no decía de qué usuario era: se validaba probando el `userEpoch` de cada user, y como todo user nuevo arranca con `userEpoch` 0 —igual que el token legacy— validaba como legacy. Ahora el token firma el sujeto: `v2.<id>.<sujeto>.<iat>.<authEpoch>.<userEpoch>.<hmac>`. **Efecto en el upgrade: todas las sesiones existentes se invalidan.**
- **Expiración sólo del lado del navegador.** El `Max-Age` de la cookie era el único límite. Ahora el server rechaza tokens con `iat` más viejo que `ttlHours` (60 s de tolerancia por relojes).
- **Logout sin revocación.** Ahora el id de la sesión queda revocado en memoria hasta que vence.
- **CSRF global.** Un solo token para todas las sesiones. Ahora se deriva por sesión (`HMAC(id + CSRF base)`) y se compara en tiempo constante.
- **Roles sólo en la UI.** Un `viewer` podía hacer `PUT /api/config` con `auth.users` y volverse admin, crear API tokens, bajar el CSRF a `none` o importar un backup. Ahora el middleware aplica la tabla de `src/lib/authz.ts` (abajo); un `editor` que manda el config entero sólo modifica las secciones de contenido.
- **Secretos al panel.** `GET /api/config` devolvía el config crudo a cualquier sesión o token de lectura. Ahora sale saneado; los secretos que vuelven vacíos se reponen al guardar y los users se mergean por id.
- **Guardados que se pisaban.** `saveConfig`/`updateConfig` serializados con un lock, `If-Match` con `_meta.updatedAt` (`409` si otra pestaña guardó) y read-modify-write atómico en tokens, TOTP y OIDC.
- **Import que revivía sesiones.** Importar un backup viejo restauraba passwords y un `authEpoch` menor. Ahora la auth y los API tokens vigentes se conservan.
- **`X-Forwarded-For` de la izquierda.** El rate limit del login usaba la entrada que elige el cliente. Ahora se recorre desde la derecha respetando `trustedProxies`; el rate limit tiene tope de claves y límite por usuario.
- **OIDC:** state atado a la cookie del navegador, `pendingFlows` acotado y con rate limit, vínculo por `iss`+`sub` (antes por username, que suele ser editable en el IdP), claim de rol opt-in (`trustRoleClaim`), issuer `https` obligatorio y `redirectPath` local (era un open redirect). Los errores no exponen detalles internos.
- **TOTP:** un código no se acepta dos veces.
- **API tokens:** los nuevos se guardan con sha256; un `Bearer umb_...` inventado disparaba un bcrypt por token configurado. Los bcrypt viejos siguen valiendo con presupuesto global.
- **Login** con costo constante para usuarios inexistentes; el audit log escapa caracteres de control.
- **`SESSION_SECRET`:** el `docker-compose.yml` lo exige y el `.env.example` ya no trae un valor público. En producción, un secreto conocido ya no sólo loguea FATAL: **se ignora** y se usa uno aleatorio.

**SSRF, uploads e icon packs**

- **`safeFetch`** reemplaza el patrón "chequear la URL y después `fetch`": valida cada redirect y la IP con la que conecta (cierra DNS rebinding), con timeout que cubre el body y tope de bytes. Lo usan fetch-card-info, upload-from-url, `/api/status`, webhooks y la IA.
- **Rangos con `net.BlockList`:** faltaban `198.18/15`, `192.0.0/24`, NAT64, `fec0::/10` y las IPv4 mapeadas en IPv6. La metadata de la nube se chequea por IP resuelta y queda bloqueada siempre.
- **Webhooks:** `health_fail` no salía nunca con `minFailures >= 2`; ahora el umbral es por webhook, `health_recover` sólo después de un fail, cooldown por webhook+card, y respetan `allowInternalHosts`.
- **`/api/status`:** sólo cards con `healthCheck`, cache por card y rate limit por IP; las métricas y los webhooks sólo ven chequeos nuevos.
- **Icon packs:** `uninstall` valida el `packId` (`..` borraba `data/`), SVG sanitizados con DOMPurify, sólo repos `https`, topes de descarga y extracción (zip bomb), instalación en staging + swap, registro atómico, el recorrido del clone no sigue symlinks hacia afuera.
- **SVG servidos con CSP `sandbox`** en `/api/icons` y `/api/assets`; las subidas sanitizan siempre.
- **Bodies con tope de bytes** también para requests `chunked` (antes sólo se miraba `Content-Length`).
- **QR:** `?text=` sólo con sesión; el modal de 2FA ya no manda el secreto en una URL.
- **Markdown:** `rel=noopener` en links con `target`; con la feature apagada, una card marcada como markdown ya no pasa su descripción cruda a `set:html`.

**Roles por ruta** (`src/lib/authz.ts`; lo que no figura requiere `admin`):

| Ruta | Rol mínimo |
|---|---|
| `GET /api/config`, `/api/metrics`, `/api/icon-names`, `GET /api/assets`, `POST /api/logout` | `viewer` |
| `PUT /api/config` (sólo branding, theme, layout, categories, cards, maintenanceWindows) | `editor` |
| `POST /api/upload`, `/api/upload-from-url`, `DELETE /api/assets`, `GET /api/fetch-card-info`, `POST /api/markdown/render`, `POST /api/ai/format-card` | `editor` |
| `DELETE /api/config`, `/api/import`, `/api/audit`, `/api/password`, `/api/tokens`, `/api/auth/totp/*`, `/api/auth/hash-password`, `/api/auth/check-default-password`, `/api/icon-packs*`, `/api/webhooks/test` | `admin` |

## Decisiones deliberadas (no son bugs)

### `script-src` sin `'unsafe-inline'` ni `'unsafe-eval'`

Resuelto: el panel usa `@alpinejs/csp`, que interpreta las expresiones de los `x-*` con un parser propio en vez de `new Function()`. Ese parser no acepta arrow functions, template literals, `?.`, `??`, `new`, regex, varias sentencias ni globales (`window`, `Math`, `JSON`…): esa lógica vive en métodos del objeto Alpine (`src/scripts/admin/view-helpers.ts` y cada fragmento) y el markup sólo los llama. `x-html` está prohibido en ese build; el panel usa `x-trusted-html` (`src/scripts/admin/trusted-html.ts`), sólo con HTML que ya controla.

No hay scripts inline: los `define:vars` pasaron a bloques `<script type="application/json">` (componente `JsonData.astro`) que leen módulos, y los scripts clásicos que tienen que correr antes del primer paint (`boot.js`, `theme-mode.js`, `scroll-reveal.js`) son archivos de `public/js/`. `astro.config.mjs` impide que Astro inlinee los `<script>` chicos al compilar. `tests/csp.test.ts` falla si vuelve a aparecer un script inline, un `define:vars` o un `x-html`.

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

### Multi-user opt-in

Por default hay un solo password compartido (super-admin). Los usuarios con roles (`features.multiUser`) y OIDC son opt-in; el password único sigue siendo el rescue path.

### Rate limit sólo en endpoints puntuales

Tienen rate limit `/api/login` (por IP y por usuario), `/api/status` y el inicio del flow OIDC. El resto (`/api/config` y compañía) requiere sesión; asumimos que el reverse proxy (Cloudflare, Caddy) hace rate limit general. Los contadores son en memoria y por proceso.

## Defensa en profundidad

| Capa | Qué defiende | Implementación |
|---|---|---|
| **Network** | HTTPS, HSTS | Caddy + `cfg.security.headers.hsts` |
| **Browser** | XSS | CSP (`default-src 'self'`), DOMPurify para SVG subido, regex SAFE_CSS_VALUE |
| **Browser** | Clickjacking | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |
| **Browser** | Privacidad | `Referrer-Policy: no-referrer`, `Permissions-Policy` |
| **Cookies** | Session hijacking | `HttpOnly`, `Secure` (auto), `SameSite` (configurable), `authEpoch` |
| **API** | CSRF | `x-csrf-token` por sesión en mutaciones, comparación en tiempo constante en el middleware |
| **API** | Escalada de privilegios | Rol mínimo por ruta y método (`lib/authz.ts`), secciones de config por rol |
| **API** | Brute force | Rate limit en `/api/login` por IP y por usuario (configurable), IP real desde la derecha de `X-Forwarded-For` |
| **API** | DoS via body | Body caps 1MB/10MB contando bytes (también `chunked`) |
| **API** | Injection (path) | Path sanitization en `/api/assets/[name]` |
| **Uploads** | XSS via SVG | MIME whitelist `^image/`, DOMPurify siempre, CSP `sandbox` al servir SVG |
| **Uploads** | OOM | Body cap 10MB, `processImages: true` con sharp resize |
| **Fetch saliente** | SSRF | `safeFetch`: `net.BlockList` de rangos no públicos, IP validada en el `lookup` del socket, cada redirect validado, timeout total y tope de bytes; metadata de la nube bloqueada siempre |
| **Auth** | Stolen session | Token con sujeto, `iat`, `authEpoch`/`userEpoch` y HMAC; expiración en el server; revocación en el logout |
| **Auth** | Fuga de secretos | Config saneado en `GET`/`PUT /api/config` y dashboard; API tokens con sha256 |
| **Auth** | Default secret | Compose exige `SESSION_SECRET`; un secreto conocido se ignora en producción |
| **Storage** | Race conditions | Lock del config + `If-Match`, lock chain en `audit()`, cached promise en `seedIfMissing()`, escritura atómica serializada por archivo |
| **Storage** | TOCTOU | `_invalidate()` antes de check final en `deleteAsset` |
| **Container** | Privilege escalation | `cap_drop: ALL`, `no-new-privileges`, user no-root |
| **Container** | Write outside volume | tmpfs en /tmp, app dir read-only para runtime |
| **Observabilidad** | Forensic | Audit log append-only con rotación a 10MB |
| **Observabilidad** | Corruption | Atomic write (`.tmp` + rename) |

## Qué se puede endurecer más (no implementado)

1. **`style-src` sin `'unsafe-inline'`.** `script-src` ya no lo tiene; los estilos del tema siguen inline. Trabajo: medio día.
2. **CSRF en GET.** Política `'all'`. Útil sólo si tu modelo de amenaza incluye XSS previo.
3. **CSP report-uri.** Reportar violaciones a un endpoint para análisis. Útil en deployments grandes.
4. **WebAuthn.** Hoy hay TOTP para los usuarios de `users[]`, pero no para el password único. Trabajo: varios días.
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

# Guía de Hardening y Seguridad en Umbral

Umbral está diseñado bajo un modelo de **defensa en profundidad** para entornos de producción y autoalojados detrás de VPNs o expuestos a Internet. Casi todo lo que sigue se ajusta desde `/admin → Hardening` (sección `security` del `config.json`).

---

## 🛡️ Capas de Protección del Sistema

### 1. Autenticación y Control de Acceso
- **Hash de Contraseña Robusto:** contraseñas con **bcrypt** (coste 12). El login hace el mismo trabajo para un usuario inexistente que para uno real, así no se puede averiguar qué usuarios existen midiendo tiempos.
- **Época de invalidación de sesión (`authEpoch`):** cambiar la contraseña del super-admin incrementa la época e invalida al instante todas las sesiones. Cada usuario tiene además su propio `userEpoch` (resetear su password cierra sólo sus sesiones).
- **Modo Multi-Usuario con Roles**, aplicados **en el server** (middleware + `src/lib/authz.ts`), no sólo en la UI:
  - `viewer`: sólo lectura (config saneado, métricas, nombres de íconos, assets).
  - `editor`: además edita contenido: branding, tema, layout, categorías, tarjetas y ventanas de mantenimiento; sube y borra assets; usa el autocompletar, el render de markdown y la IA.
  - `admin`: todo lo demás (usuarios, Hardening, features, tokens, TOTP, OIDC, webhooks, icon packs, import, audit log).
  - El password único (super-admin) es siempre `admin`. Un API token `write` es `admin`; uno `read`, `viewer`.
  - Ver la tabla completa por endpoint en [Referencia de API](../usage/api.md#roles-por-endpoint). **Una ruta que no está en la tabla requiere `admin`** (default seguro).
- **Autenticación de Dos Factores (2FA / TOTP):** TOTP estándar (RFC 6238) para los usuarios de `users[]`. El seed se guarda cifrado con una clave derivada de `SESSION_SECRET`, y un mismo código no se acepta dos veces.
- **Single Sign-On (OIDC):** login con proveedores OpenID Connect (Keycloak, Authentik, Google Workspace, Azure AD…) con aprovisionamiento opcional. Ver [Multi-portal y SSO](../usage/multi-portal-sso.md) para el vínculo por `iss`+`sub` y el claim de rol opt-in.

---

### 2. Sesiones y Protección contra CSRF
- **Formato del token:** `v2.<id>.<sujeto>.<iat>.<authEpoch>.<userEpoch>.<hmac>`, firmado con HMAC-SHA256 y `SESSION_SECRET`. El sujeto identifica al usuario (`legacy` para el password único, o el id del user), así que una sesión no puede "convertirse" en otro usuario.
- **Expiración en el server:** la sesión vence a las `security.session.ttlHours` (default 24) desde su emisión, aunque alguien conserve la cookie más tiempo.
- **Revocación en el logout:** `POST /api/logout` marca la sesión como revocada en memoria hasta que vence sola. También deja de valer si cambia el `authEpoch`, el `userEpoch` del usuario, si se borra el usuario o si se deshabilita el password único.
- **Atributos de Cookie Seguros:**
  - `HttpOnly`: la cookie no es accesible desde JavaScript.
  - `SameSite`: `Lax` por default; configurable a `Strict` o `None`.
  - `Secure`: `auto` (sólo si `BASE_URL` empieza con `https://`), `always` o `never`.
- **CSRF por sesión:** cada sesión tiene su propio token (`HMAC(id de sesión + CSRF base)`), comparado en tiempo constante. Se exige en el header `x-csrf-token` de todas las mutaciones (`POST`, `PUT`, `DELETE`, `PATCH`) con `csrfPolicy: mutations` (default); `all` lo exige también en `GET`. Rotar el CSRF base (cambio de password, `rotateCsrfOnLogin`) invalida los CSRF de todas las sesiones. Los API tokens no usan CSRF.

> **Al actualizar desde una versión anterior** todas las sesiones existentes se invalidan (cambió el formato del token) y hay que volver a loguearse.

---

### 3. Rate Limiting e IP del Cliente
- **Login:** `security.auth.rateLimitMax` intentos por `rateLimitWindowSec` (default 30 por 60 s), contados **por IP y también por usuario** cuando el request trae `username` (frena a quien rota IPs).
- **Otros límites:** `/api/status` (30 por minuto por IP), inicio del flow OIDC (20 por minuto por IP). Los contadores viven en memoria con un tope de claves, así un atacante que inventa IPs o usernames no hace crecer la memoria sin límite. Al ser por proceso, detrás de varias instancias conviene limitar también en el proxy.
- **IP real detrás de un proxy:** sin `security.network.trustForwardedFor` (o `TRUST_FORWARDED_FOR=true`) la IP es la del socket. Con la opción prendida, `X-Forwarded-For` se recorre **de derecha a izquierda**:
  - **Sin `trustedProxies`:** se confía en un solo salto, y la IP del cliente es la última entrada (la que agregó tu proxy). La entrada de más a la izquierda la puede inventar el cliente, por eso ya no se usa.
  - **Con `trustedProxies`** (IPs o CIDRs): si el socket no es uno de ellos, se usa el socket e `X-Forwarded-For` se ignora; si lo es, se saltean desde la derecha los proxies de la lista y el primer salto que no está es el cliente.
  - Sin `X-Forwarded-For`, se usa `X-Real-IP` o el socket.

---

### 4. Protección contra SSRF
Todos los fetch salientes (autocompletar de tarjetas, `upload-from-url`, `/api/status`, webhooks, llamadas a la IA) pasan por `safeFetch` (`src/lib/safe-fetch.ts`):
- **Cada redirect se valida** (un `302` de un host público a `10.0.0.5` ya no pasa) y la **IP se valida en el `lookup` del socket**, es decir la misma con la que se conecta: cierra el DNS rebinding.
- **Timeout total** que cubre conexión, redirects y lectura del body, y **tope de bytes** del body: un servidor que manda el body gota a gota no cuelga el request.
- Sólo `http:` y `https:`, sin credenciales en la URL.
- **Rangos bloqueados** (salvo con `security.network.allowInternalHosts`): `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`; en IPv6 `::`, `::1`, NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), `100::/64`, `2001:db8::/32`, `fc00::/7`, `fe80::/10`, `fec0::/10`, `ff00::/8`. Las IPv4 mapeadas en IPv6 (`::ffff:127.0.0.1`) se tratan como IPv4. `localhost` y `*.localhost` también se bloquean.
- **Metadata de la nube bloqueada siempre**, incluso con `allowInternalHosts`: `169.254.0.0/16`, `fd00:ec2::254`, `metadata.google.internal`, `metadata.goog`, `metadata.azure.internal`.
- `allowInternalHosts` es `true` por default (Umbral es un portal interno que monitorea servicios de la LAN). Si lo exponés a Internet, ponelo en `false`.

---

### 5. Seguridad en la Subida de Archivos (Assets)
- **Validación de Magic-Bytes:** no se confía en la extensión ni en el `Content-Type` del cliente; se inspecciona la firma binaria real. La whitelist de MIME sólo acepta `image/*`.
- **Sanitización de SVG siempre activa:** todo SVG (subido, descargado por URL o de un icon pack) pasa por **DOMPurify** sobre JSDOM, aunque `sanitizeSvg` esté apagado. `allowSvg: false` rechaza los SVG directamente.
- **CSP `sandbox` al servir SVG:** `/api/assets/*` y `/api/icons/*` sirven los SVG con `Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox`. Abrir el SVG directo en el navegador no ejecuta scripts aunque algo se escape de la sanitización.
- **Procesamiento con Sharp:** redimensiona y optimiza imágenes raster para frenar bombas de descompresión.
- **Topes de tamaño:** por tipo de asset (`maxBytesLogo`, `maxBytesFavicon`, `maxBytesIcon`, `maxBytesBackground`); los usa también `upload-from-url`.

---

### 6. Secretos fuera del navegador
- `GET /api/config`, `PUT /api/config` y el dashboard devuelven el config **saneado**: sin el hash del super-admin, el CSRF base, los hashes y seeds TOTP de los usuarios, los client secrets de OIDC, la API key de IA, las keys de búsqueda externa ni los hashes de los API tokens.
- Un secreto que vuelve vacío en un `PUT` se conserva; los API tokens no se aceptan por el `PUT` genérico (sólo por `/api/tokens`).
- Los API tokens nuevos se guardan como `sha256:<hex>`; los viejos con bcrypt siguen funcionando.

---

### 7. Cabeceras HTTP y Content Security Policy (CSP)
Umbral emite cabeceras de seguridad configurables en cada respuesta HTML y en los recursos públicos:
- **`Content-Security-Policy` (CSP):** default `default-src 'self'` con `'unsafe-inline'`/`'unsafe-eval'` en `script-src` (Alpine.js los necesita). Con `theme.useGoogleFonts` activo, se agregan `https://fonts.googleapis.com` a `style-src` y `https://fonts.gstatic.com` a `font-src`.
- **`Strict-Transport-Security` (HSTS):** `auto` / `always` / `never`, con `max-age`, `includeSubDomains` y `preload` configurables.
- **`X-Frame-Options`**, **`Referrer-Policy`** y **`Permissions-Policy`** configurables.

---

### 8. Límites de Tamaño de Body
- **JSON:** 1 MB (`/api/config`, `/api/import` y el resto de los endpoints JSON).
- **Uploads `multipart`:** 10 MB en `/api/upload`.
- El tope se aplica **contando los bytes que llegan**, no sólo mirando `Content-Length`: un request `chunked` sin `Content-Length` también se corta.

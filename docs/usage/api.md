# Referencia de API REST de Umbral

Esta guía detalla los endpoints HTTP expuestos por el servidor de Umbral para integraciones externas, automatización, CLI, monitoreo y consumo administrativo.

---

## 🔐 Autenticación y Cabeceras

### Esquemas de Autenticación Soportados
1. **Cookie de Sesión (`umbral_session`):** Obtenida al autenticarse en `POST /api/login` (o al volver del login OIDC). Vence a las `security.session.ttlHours` horas: la expiración la controla el server, no sólo el `Max-Age` de la cookie.
2. **Bearer Token (`Authorization: Bearer umb_...`):** Para scripts, GitHub Actions y el CLI de Umbral (requiere la feature `apiTokens`). Un token `write` actúa como `admin`; uno `read`, como `viewer`.

Sin sesión ni token, cualquier ruta de `/api/*` que no sea pública devuelve `401`. Las públicas son `/api/login`, `/api/health`, `/api/status`, `/api/locale`, `/api/assets/*`, `/api/icons/*`, `/api/qr/*` y el flow `/api/auth/oidc/*`. Los catálogos prerenderizados (`/api/help/<locale>.json`, `/api/presets.json`, `/api/ai-meta.json`, `/api/icon-pack-catalog.json`) se sirven como archivos estáticos.

### Roles por endpoint
Además de estar autenticado, cada ruta exige un rol mínimo según el método (tabla en `src/lib/authz.ts`). Si el rol no alcanza, la respuesta es `403 Permisos insuficientes para esta operación`. **Una ruta que no está en la tabla requiere `admin`.**

| Ruta | `viewer` | `editor` | `admin` |
|---|---|---|---|
| `GET /api/config`, `GET /api/metrics`, `GET /api/icon-names`, `POST /api/logout` | ✅ | ✅ | ✅ |
| `GET /api/assets` | ✅ | ✅ | ✅ |
| `PUT /api/config` | — | ✅ (sólo secciones de contenido) | ✅ |
| `DELETE /api/assets`, `POST /api/upload`, `POST /api/upload-from-url` | — | ✅ | ✅ |
| `GET /api/fetch-card-info`, `POST /api/markdown/render`, `POST /api/ai/format-card` | — | ✅ | ✅ |
| `DELETE /api/config`, `PUT /api/import`, `GET /api/audit`, `POST /api/password` | — | — | ✅ |
| `/api/tokens`, `/api/auth/totp/*`, `/api/auth/hash-password`, `/api/auth/check-default-password` | — | — | ✅ |
| `/api/icon-packs`, `/api/icon-packs/uninstall`, `POST /api/webhooks/test` | — | — | ✅ |

El password único (super-admin) es siempre `admin`.

### Protección Anti-CSRF
Toda petición de mutación (`POST`, `PUT`, `DELETE`, `PATCH`) autenticada mediante cookie debe incluir la cabecera:
```http
x-csrf-token: <CSRF_TOKEN>
```
El token CSRF es **propio de cada sesión** (se deriva del id de la sesión) y se entrega en la respuesta de `POST /api/login` y de `POST /api/password`. El panel lo recibe en el HTML del dashboard. `GET /api/config` **ya no lo incluye**. Con `security.auth.csrfPolicy: "all"` también se exige en los `GET`. Los requests con API token no llevan CSRF.

### Versión del config (`x-config-version`)
Toda respuesta de `/api/*` a una sesión con cookie trae la cabecera `x-config-version` con el `_meta.updatedAt` vigente. Mandala como `If-Match` en `PUT /api/config` para no pisar cambios de otra pestaña u otro usuario (ver abajo). Con API token la cabecera no viaja: leé `_meta.updatedAt` del body de `GET /api/config`.

### Tamaño de los bodies
Los bodies JSON se cortan a 1 MB y los `multipart` de `/api/upload` a 10 MB. El tope se aplica contando los bytes que llegan, así que también vale para requests `chunked` sin `Content-Length`. Si se pasa, la respuesta es `413` (o `400` desde el handler).

---

## 📋 Endpoints del Sistema

### 1. Salud y Estado

#### `GET /api/health`
Público. Utilizado para liveness probes de Kubernetes, Docker healthchecks y monitores externos. Además de "el proceso responde", verifica que el config se pueda leer.
- **Respuesta 200:**
  ```json
  {
    "status": "ok",
    "uptime": 86400,
    "ts": 1725000000000
  }
  ```
- **Respuesta 503:** `{ "status": "error", "reason": "config" }` si `config.json` no se puede leer (volumen sin permisos, archivo roto).

#### `POST /api/status`
Público (lo usa la portada para los puntos de salud). Chequea con un `HEAD` **sólo las tarjetas con `healthCheck: true`** (y `enabled`), como mucho 50.
- **Body (opcional):** `{ "ids": ["card-1", "card-2"] }` para limitar a esas tarjetas.
- **Cache:** cada tarjeta se vuelve a chequear como mucho una vez cada media `layout.healthCheckInterval` (entre 5 s y 150 s); mientras tanto se devuelve el último resultado. Las métricas y los webhooks sólo ven los chequeos nuevos.
- **Rate limit:** 30 requests por minuto por IP (`429` al pasarse).
- **SSRF:** el `HEAD` pasa por `safeFetch` sin seguir redirects. Un `3xx` cuenta como servicio arriba (`ok: true` si `status < 400`).
- **Respuesta 200:**
  ```json
  {
    "results": [
      { "id": "card-1", "url": "https://grafana.lan", "status": 200, "latencyMs": 18, "ok": true }
    ]
  }
  ```

---

### 2. Autenticación y Sesión

#### `POST /api/login`
- **Body:** `{ "password": "..." }` (password único) o `{ "username": "admin", "password": "..." }` (multi-user).
- **Respuesta 200:** Establece la cookie `umbral_session` y devuelve `{ "ok": true, "csrfToken": "..." }`.
- **2FA:** si el usuario tiene TOTP, la primera llamada devuelve `{ "requiresTotp": true, "partialToken": "..." }`; la segunda manda `{ "partialToken": "...", "totpCode": "123456" }`. Un mismo código no se acepta dos veces.
- **Errores:** `401 Unauthorized`, `429 Too Many Requests`. El rate limit cuenta por IP y, si mandás `username`, también por usuario (`security.auth.rateLimitMax` / `rateLimitWindowSec`).

#### `POST /api/logout`
- **Respuesta 200:** `{ "ok": true }`. Borra la cookie y **revoca la sesión en el server**: aunque alguien se haya copiado la cookie, deja de valer (la lista de revocadas vive en memoria hasta que la sesión vence sola).

#### `POST /api/password`
- **Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Respuesta 200:** `{ "ok": true, "csrfToken": "..." }`. Actualiza el hash, rota el CSRF base e incrementa `authEpoch`, invalidando todas las sesiones; quien hizo el cambio recibe una cookie nueva.

---

### 3. Configuración

#### `GET /api/config`
Devuelve la configuración del portal **saneada**. Nunca viajan el hash del super-admin, el CSRF base, los hashes de password ni los seeds TOTP de los usuarios, los client secrets de OIDC, la API key de IA, las keys de búsqueda externa ni los hashes de los API tokens: los campos de secretos llegan como `""`.
- **`viewer` / `editor` / token `read`:** sin la sección `auth`.
- **`admin`:** además `auth.users` (sin `passwordHash`; `totpSecret` viaja como `"active"` o `null`, y `oidcSubject` como `"linked"` o `null`) y `auth.singlePasswordEnabled`.

#### `PUT /api/config`
Actualiza parcialmente la configuración del portal.
- **Body:** Fragmento de configuración a modificar (ej. `{ "branding": { "companyName": "Nuevo Nombre" } }`). El panel manda el config entero.
- **Secretos vacíos:** como `GET` los devuelve en `""`, un secreto que llega vacío se **conserva** del config guardado (API key de IA, keys de búsqueda, `clientSecret` de cada provider OIDC por `id`). Para cambiarlo, mandá el valor nuevo.
- **`apiTokens` se ignora:** los tokens se administran sólo desde `/api/tokens`.
- **Editor:** sólo se aplican `branding`, `theme`, `layout`, `categories`, `cards` y `maintenanceWindows`. El resto de las secciones (auth, security, features, oidc, webhooks, ai…) se descarta en silencio y queda como está en disco, en vez de rechazar todo el guardado.
- **Concurrencia:** con `If-Match: <_meta.updatedAt>` (el valor de `x-config-version`), si otro guardó después de esa versión la respuesta es `409` con `{ "error": "...", "currentVersion": "..." }`. Releé el config y reintentá. Sin `If-Match` no hay control de concurrencia (último que guarda gana).
- **Respuesta 200:** el config guardado, saneado igual que en `GET`.

#### `DELETE /api/config`
Sólo admin. Vuelve el config a los defaults conservando la auth.

#### `PUT /api/import`
Sólo admin. Reemplaza el config entero con el JSON del body. **La auth y los API tokens vigentes se conservan**: lo que traiga el archivo en `auth` y `apiTokens` se ignora, así importar un backup viejo no restaura passwords anteriores ni revive sesiones cerradas. Los secretos que vengan vacíos se conservan del config actual, y a las tarjetas se les aplica el mismo gating de features que a un guardado normal.

---

### 4. Internacionalización

#### `POST /api/locale`
Establece la cookie `umbral_locale` (duración 30 días) para fijar el idioma del visitante.
- **Body:** `{ "locale": "es" | "en" | "pt" | "fr" | "de" | "it" | "zh" | "ja" | "ru" | "nl" | "pl" | "ko" | "tr" | "uk" | "sv" | "cs" | "da" | "fi" | "no" | "hu" | "ro" }`
- **Respuesta 302 / 200:** Redirige a la página previa o confirma el cambio.

#### `GET /api/help/<locale>.json`
Devuelve el catálogo de textos de ayuda interactiva para el idioma solicitado en formato estático prerenderizado. Sólo `es`, `en` y `pt` tienen catálogo propio; el resto de los idiomas sirve los textos en inglés (ver [i18n](./i18n.md)).

---

### 5. Gestión de Archivos y Assets

#### `GET /api/assets/[name]`
Público. Sirve imágenes desde `data/uploads/` con cabeceras de caché inmutable. Los SVG salen con una CSP `sandbox` propia (`default-src 'none'`), así que abrirlos directo en el navegador no ejecuta nada.

#### `POST /api/upload`
Sube un archivo mediante `multipart/form-data` (editor o admin).
- **Form Data:** `file` y `kind` (`"logo"` | `"favicon"` | `"icon"` | `"background"`).
- Los SVG pasan **siempre** por DOMPurify, aunque `security.uploads.sanitizeSvg` esté apagado.

#### `POST /api/upload-from-url`
Descarga una imagen desde una URL remota con `safeFetch` (guardas SSRF, timeout y tope de bytes según los límites de Hardening) y la guarda con el mismo camino que `/api/upload`. Devuelve `{ "ok": true, ... }`; si el origen responde 4xx, `{ "ok": false, "reason": "not_found" }`.

---

### 6. Asistente de IA y Auto-completado

#### `GET /api/fetch-card-info?url=<url>&name=<nombre>`
Scrapea una URL remota para extraer título, descripción y favicon con fallback a motores de búsqueda (Brave, Tavily, Wikipedia, SearXNG). Las descargas van por `safeFetch`.

#### `POST /api/ai/format-card`
Reescribe o sintetiza títulos y descripciones de tarjetas utilizando el proveedor LLM configurado.

---

### 7. Paquetes de Íconos (Git Icon Packs)

#### `GET /api/icon-pack-catalog.json`
Catálogo estático de los paquetes de íconos oficiales disponibles para descarga.

#### `GET /api/icon-packs` / `POST /api/icon-packs`
Sólo admin. Lista los packs instalados / instala uno desde un repositorio Git **https** en `data/icon-packs/<pack>/`. Ver [Icon packs](./icon-packs.md) para los límites.

#### `POST /api/icon-packs/uninstall`
Sólo admin. Body `{ "packId": "..." }`. El `packId` se valida: no se puede usar para borrar fuera de `data/icon-packs/`.

---

### 8. Auditoría y Métricas

#### `GET /api/audit`
Sólo admin (feature `auditLogViewer`). Consulta el registro de auditoría en `data/audit.log` con filtros por query: `limit` (máx. 1000), `action`, `detail` (substring), `from` / `to` (ISO). `?actions=1` devuelve la lista de acciones distintas.

#### `GET /api/metrics`
Devuelve las muestras de latencia recientes y resúmenes estadísticos (promedio, p95, máximo) por tarjeta.

---

### 9. Webhooks y Alertas

#### `POST /api/webhooks/test`
Sólo admin. Envía una notificación de prueba a la URL del webhook. Respeta `security.network.allowInternalHosts` igual que los envíos reales.

---

### 10. API Tokens

#### `POST /api/tokens`
Sólo admin. Genera un token nuevo.
- **Body:** `{ "name": "ci", "scope": "read" | "write", "expiresInDays": 90 }`
- **Respuesta 200:** `{ "ok": true, "token": "umb_...", "item": { "id", "name", "scope", "tokenLast4", "createdAt", "expiresAt", "revoked" } }`. El token en claro **se muestra una sola vez**.
- **Almacenamiento:** los tokens nuevos se guardan como `sha256:<hex>` (son 256 bits aleatorios: un hash lento no agrega nada y costaba un bcrypt por request). Los tokens viejos guardados con bcrypt siguen funcionando, con un presupuesto global de verificaciones lentas por minuto.

#### `DELETE /api/tokens`
Sólo admin. Body `{ "id": "..." }`. Revoca el token; el corte es inmediato.

La lista de tokens (sin hashes) viene en `apiTokens.items` de `GET /api/config`.

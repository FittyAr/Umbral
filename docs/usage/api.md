# API REST

> Endpoints HTTP que la app expone. Útil para integraciones, scripts, monitoring.

## Base URL

```
https://tu-dominio
```

(o `http://localhost:3000` en dev).

## Auth

Todos los endpoints bajo `/api/` requieren **autenticación**, excepto:

- `POST /api/login` — para loguearse.
- `GET /api/health` — healthcheck (público).
- `GET /api/assets/<name>` — descargar un asset subido (público, sólo lectura).

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"tu-password"}' \
  -c cookies.txt
```

- **Body:** `{ "password": "..." }`.
- **200:** setea cookie `atajo_session` y devuelve `{ "ok": true, "csrfToken": "..." }`.
- **401:** password incorrecta.
- **429:** rate limit excedido (ver `cfg.security.auth.rateLimitMax`).

### Logout

```bash
curl -X POST http://localhost:3000/api/logout \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt
```

- **204:** sin contenido. La cookie se limpia.

### CSRF

Todas las mutaciones (POST/PUT/DELETE/PATCH) requieren el header:

```
x-csrf-token: <token>
```

El token lo obtuviste en el login o en `GET /api/config`. Sin él, la API responde 403.

---

## Endpoints

### `GET /api/health`

Público. Healthcheck.

```bash
curl http://localhost:3000/api/health
```

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "ts": 1711111111
}
```

Útil para monitoring (UptimeRobot, Prometheus blackbox, etc).

### `GET /api/config`

Devuelve la config completa (incluido `auth` y `_meta`).

```bash
curl -b cookies.txt http://localhost:3000/api/config
```

**Response 200:** objeto `Config`.

### `PUT /api/config`

Actualización parcial. Body: cualquier subset del schema (excepto `auth` y `_meta`, que se ignoran).

```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -d '{
    "branding": { "companyName": "Acme SA" },
    "theme": { "accentColor": "#ff5722" }
  }'
```

- **200:** devuelve la config completa actualizada.
- **400:** JSON inválido o no cumple el schema.
- **401:** no autenticado.
- **403:** CSRF inválido.
- **413:** body > 1 MB.

### `DELETE /api/config`

Reset a defaults. Preserva la auth actual.

```bash
curl -X DELETE http://localhost:3000/api/config \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt
```

### `POST /api/import`

Importar una config completa (reemplazo total, no merge).

```bash
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -d @config-backup.json
```

- **200:** devuelve la config importada.
- **400:** no cumple el schema estricto.
- **413:** body > 1 MB.

### `POST /api/password`

Cambiar la password.

```bash
curl -X POST http://localhost:3000/api/password \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -d '{
    "currentPassword": "vieja",
    "newPassword": "nueva-mas-fuerte"
  }'
```

- **200:** `{ "ok": true, "csrfToken": "..." }` (el CSRF se rotó, usá el nuevo).
- **400:** nueva no cumple `minPasswordLength` o el body es inválido.
- **401:** currentPassword incorrecta.

> ⚠️ Cambiar la password **invalida todas las sesiones existentes** (excepto la tuya). El `csrfToken` se rota — actualizá tu header en el siguiente request.

### `POST /api/upload`

Subir un asset. Multipart.

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -F "file=@/path/to/logo.png" \
  -F "kind=logo"
```

- `kind`: `icon`, `logo`, `favicon`, `background`.
- **200:** `{ "storedName": "...", "bytes": 12345, "kind": "logo" }`.
- **400:** MIME no permitido o excede el tamaño.
- **413:** body > 10 MB.

### `GET /api/assets`

Listar assets subidos (público, sin auth).

```bash
curl http://localhost:3000/api/assets
```

**Response 200:**
```json
{
  "items": [
    {
      "name": "logo-20240322.png",
      "url": "/api/assets/logo-20240322.png",
      "bytes": 12345,
      "usedBy": ["branding.logo"]
    }
  ]
}
```

`usedBy` lista dónde se referencia: `branding.logo`, `branding.favicon`, `theme.background.value`, `categories[N].icon`, `cards[N].icon`.

### `DELETE /api/assets`

Borrar un asset.

```bash
curl -X DELETE http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -d '{"name":"logo-20240322.png"}'
```

- **204:** borrado.
- **400:** `usedBy` no está vacío (el asset está en uso).
- **404:** no existe.

### `POST /api/status`

Ping HEAD a las URLs de las tarjetas.

```bash
curl -X POST http://localhost:3000/api/status \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -b cookies.txt \
  -d '{"ids":["mattermost","excalidraw"]}'
```

- `ids` (array, requerido): IDs de las tarjetas a testear. Si está vacío, devuelve array vacío.
- **200:** `{ "results": [{ "id": "...", "ok": true, "status": 200, "latencyMs": 42 }, ...] }`.
- **SSRF protection:** URLs internas (privadas, loopback, link-local) son rechazadas.

---

## Errores

Todos los errores devuelven JSON:

```json
{ "error": "Mensaje legible" }
```

Códigos comunes:

| Código | Significado |
|---|---|
| 400 | Bad Request — JSON inválido, schema inválido, body mal formado. |
| 401 | No autorizado — no hay sesión o la password es incorrecta. |
| 403 | Forbidden — CSRF inválido. |
| 404 | No encontrado. |
| 413 | Payload Too Large — body > cap. |
| 429 | Too Many Requests — rate limit. |
| 500 | Error interno del server. |

## Script de ejemplo (bash)

```bash
#!/bin/bash
set -e
BASE="http://localhost:3000"
COOKIES="/tmp/atajo-cookies.txt"
PASSWORD="tu-password"

# 1. Login
LOGIN=$(curl -sS -c "$COOKIES" -X POST "$BASE/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}")
CSRF=$(echo "$LOGIN" | grep -oE '"csrfToken":"[^"]+"' | cut -d'"' -f4)
echo "Logged in. CSRF=${CSRF:0:16}..."

# 2. Read config
curl -sS -b "$COOKIES" "$BASE/api/config" | head -c 200
echo

# 3. Update branding
curl -sS -b "$COOKIES" -X PUT "$BASE/api/config" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"branding":{"companyName":"Acme SA"}}'
echo

# 4. Logout
curl -sS -b "$COOKIES" -X POST "$BASE/api/logout" \
  -H "x-csrf-token: $CSRF"
```

## Script de ejemplo (PowerShell)

```powershell
$base = "http://localhost:3000"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$password = "tu-password"

# 1. Login
$login = Invoke-RestMethod -Uri "$base/api/login" -Method Post `
  -ContentType "application/json" `
  -Body (@{ password = $password } | ConvertTo-Json) `
  -WebSession $session
$csrf = $login.csrfToken
Write-Host "Logged in. CSRF=$($csrf.Substring(0,16))..."

# 2. Read config
$config = Invoke-RestMethod -Uri "$base/api/config" -WebSession $session
$config.branding.companyName

# 3. Update branding
$body = @{ branding = @{ companyName = "Acme SA" } } | ConvertTo-Json -Depth 5
$updated = Invoke-RestMethod -Uri "$base/api/config" -Method Put `
  -ContentType "application/json" `
  -Headers @{ "x-csrf-token" = $csrf } `
  -Body $body `
  -WebSession $session
$updated.branding.companyName
```

## SDKs / OpenAPI

No hay SDK oficial. El schema es estable y simple — cualquier cliente HTTP (curl, fetch, requests, Axios) sirve.

Si querés generar un cliente:

```bash
# Si tenés un OpenAPI spec (no proveído, pero trivial de armar a partir de este doc):
npx openapi-typescript-codegen --input schema.yaml --output ./client
```

## Rate limit

Aplicado a `POST /api/login`. Default 30/min/IP. Configurable en `/admin` → Hardening → Login y CSRF.

Otros endpoints **no** tienen rate limit por la app — asumimos que están detrás de un reverse proxy que ya lo hace (Cloudflare, Caddy con plugin, etc).

## Webhooks

No hay webhooks salientes. Para integrar con monitoring externo, hacé polling a `/api/health` o `/api/status`.

## Versionado

La API no tiene versionado explícito (`/api/v1/...`). Los cambios breaking van a venir con un changelog major. Hoy todo está bajo `/api/`.

## Monitoreo

```bash
# Loop simple de healthcheck
while true; do
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" http://tu-dominio/api/health)
  echo "$(date)  $STATUS"
  sleep 30
done
```

Para Prometheus, [blackbox_exporter](https://github.com/prometheus/blackbox_exporter) con el endpoint `/api/health` y un `probe_http_status_code == 200` alerta.

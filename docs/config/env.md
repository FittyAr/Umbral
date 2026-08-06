# Variables de entorno

> Las **mínimas** que necesita la app. El resto de la configuración vive en `data/config.json` y se edita desde el panel admin.

## Resumen

| Variable | Default | Obligatoria en prod | Descripción |
|---|---|---|---|
| `SESSION_SECRET` | random en dev | **Sí** | Secreto HMAC para firmar cookies. 32+ chars. |
| `INITIAL_PASSWORD` | `admin` | Recomendado | Password del primer arranque. Cambiala ASAP desde `/admin`. |
| `BASE_URL` | `''` | Si usás HTTPS | URL base (ej: `https://home.example.com`). Usado para cookies Secure y HSTS. |
| `PORT` | `4321` | No | Puerto del proceso. En Docker compose, mapeado al host. |
| `HOST` | `0.0.0.0` | No | Bind address. `127.0.0.1` para sólo loopback. |
| `DATA_DIR` | `./data` | No | Carpeta persistente. Default: `data/` en el cwd. |
| `NODE_ENV` | `production` | No | Setear `development` para logs verbose. |
| `DOMAIN` | `home.example.internal` | Sólo Caddy | Dominio que Caddy sirve. Ignorado si no usás el servicio Caddy. |

## `SESSION_SECRET`

> **Crítica.** Secreto con el que se firman los tokens de sesión (HMAC-SHA256) y se encripta el CSRF token.

- **Default en dev:** random por proceso. Las sesiones **no sobreviven reinicios**.
- **Default conocido (`change-me-please-this-is-32-chars-or-more`):** la app loguea **FATAL** y rechaza operar en producción. Esto es deliberado: no queremos que nadie se olvide de cambiarlo.
- **Generar uno fuerte:**
  ```bash
  openssl rand -hex 32
  # → e.g. 5f4dcc3b5aa765d61d8327deb882cf99...
  ```
- **Cambiar el secret invalida todas las sesiones existentes.** Es lo correcto — un secret rotado es un secret "perdido", no se puede seguir firmando tokens viejos.

**En Docker compose**, pasalo vía `.env`:
```env
SESSION_SECRET=5f4dcc3b5aa765d61d8327deb882cf99...
```

**En systemd**, en el `EnvironmentFile=/opt/umbral/.env`.

## `INITIAL_PASSWORD`

- Password con la que se loguea el admin en el **primer arranque**.
- La app hashea con bcrypt (cost 12) y guarda en `data/config.json`.
- **En el primer arranque, si está vacío, usa `admin` y loguea un warning.** Cambiala desde `/admin` → Password.
- **En arranques subsiguientes se ignora** (la password ya está en `config.json`). Para resetear: borrar `data/config.json` y reiniciar (o usar el botón **Reset a defaults** del panel, que preserva la auth actual).

```env
INITIAL_PASSWORD=una-password-fuerte-para-el-primer-login
```

## `BASE_URL`

URL base pública de la app. La usa para:

- Marcar la cookie de sesión con flag `Secure` si empieza con `https://`.
- Detectar HTTPS para activar HSTS en modo `auto`.

Si estás detrás de un reverse proxy con TLS, **ponelo**:
```env
BASE_URL=https://home.example.com
```

Si vas sólo por HTTP en LAN, dejalo vacío.

**Importante:** No incluye path. Sólo `https://host[:port]`.

## `PORT`

Puerto en el que escucha el proceso Node.

- **Default:** `4321` (el default de Astro).
- **En Docker compose, el container expone 4321** y se mapea al host con `${PORT:-3000}:4321`. Cambiá `PORT` en el `.env` del host para cambiar el puerto externo.

```env
# En .env del host
PORT=8080   # → http://localhost:8080
```

## `HOST`

Bind address. `0.0.0.0` escucha en todas las interfaces (default, necesario en Docker). `127.0.0.1` para sólo loopback (más seguro si la app vive en el mismo host que el reverse proxy).

```env
HOST=127.0.0.1
```

## `DATA_DIR`

Dónde persiste la app sus archivos:

- `config.json` (la config)
- `uploads/` (logos, íconos, fondos)
- `audit.log` (log de eventos)

- **Default:** `./data` (relativo al cwd).
- **En Docker:** `/app/data` (el volumen `umbral-data` se monta ahí).
- **En systemd:** algo como `/opt/umbral/data`.

```env
DATA_DIR=/opt/umbral/data
```

El proceso necesita **escritura** en esta carpeta. Si lo corrés con un usuario no-root, dale ownership.

## `NODE_ENV`

- `production` (default): optimizaciones de Astro, logs concisos.
- `development`: logs verbose (cada request, cada save).

No setees `development` en prod — el ruido de logs te va a tapar lo importante.

## `DOMAIN` (sólo Caddy)

> Sólo se usa si activás el servicio `caddy` en `docker-compose.yml`.

Dominio que Caddy sirve. Si es público, Caddy pide cert de Let's Encrypt automáticamente.

```env
DOMAIN=home.example.com
```

## `.env.example`

El repo trae un `.env.example` con placeholders. Cópialo a `.env` y editá:

```bash
cp .env.example .env
$EDITOR .env
```

## Configuración runtime (todo lo demás)

**Casi todo** lo demás se configura desde el panel admin o editando `data/config.json`. Esto incluye:

- Tarjetas, categorías, branding
- Tema (colores, fondo, fuente, modo claro/oscuro)
- Layout (columnas, tamaño de card)
- Hardening (CSP, HSTS, rate limit, CSRF, MIME allowlist)
- Cambio de password
- Upload / delete de assets

Ver [Estructura del config.json](./structure.md) para el schema completo.

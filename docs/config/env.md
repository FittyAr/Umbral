# Variables de entorno

> Las **mínimas** que necesita la app. El resto de la configuración vive en `data/config.json` y se edita desde el panel admin.

## Resumen

| Variable | Default | Obligatoria en prod | Descripción |
|---|---|---|---|
| `SESSION_SECRET` | random si falta | **Sí** (el `docker-compose.yml` no arranca sin ella) | Secreto HMAC de las sesiones y del CSRF, y clave de cifrado de los seeds TOTP. 32+ chars. |
| `INITIAL_PASSWORD` | `admin` | Recomendado | Password del primer arranque. Cambiala ASAP desde `/admin`. |
| `BASE_URL` | `''` | Si usás HTTPS | URL base (ej: `https://home.example.com`). Usado para cookies Secure y HSTS. |
| `PORT` | `4321` | No | Puerto del proceso. En Docker compose, mapeado al host. |
| `HOST` | `0.0.0.0` | No | Bind address. `127.0.0.1` para sólo loopback. |
| `DATA_DIR` | `./data` | No | Carpeta persistente. Default: `data/` en el cwd. |
| `NODE_ENV` | `production` | No | Setear `development` para logs verbose. |
| `TRUST_FORWARDED_FOR` | `false` | No | `true` para tomar la IP del cliente de `X-Forwarded-For` / `X-Real-IP` (detrás de OpenResty, Nginx, Caddy, Traefik). Ver [más abajo](#trust_forwarded_for). |
| `DOMAIN` | `home.example.internal` | Sólo Caddy | Dominio que Caddy sirve. Ignorado si no usás el servicio Caddy. |

## `SESSION_SECRET`

> **Crítica.** Secreto con el que se firman los tokens de sesión (HMAC-SHA256), se deriva el CSRF de cada sesión y se cifran los seeds TOTP (AES-256-GCM con clave derivada por HKDF).

- **Si falta o tiene menos de 16 caracteres:** el server usa un secreto aleatorio por proceso y loguea un warning. Las sesiones **no sobreviven reinicios** y los seeds TOTP guardados dejan de descifrarse (los usuarios con 2FA tienen que volver a configurarlo). Sirve para probar, no para producción.
- **Valores públicos conocidos** (los que alguna vez estuvieron en `.env.example` o en el `docker-compose.yml`, como `change-me-please-this-is-32-chars-or-more`, o genéricos como `changeme` / `secret`): con `NODE_ENV=production` la app **los ignora**, loguea `[umbral FATAL]` y cae al secreto aleatorio. No se niega a arrancar, pero tampoco firma con un secreto que cualquiera con el repo podría usar para forjar sesiones.
- **`docker-compose.yml` la exige:** usa `${SESSION_SECRET:?...}`, así que `docker compose up` corta con un error si no está definida en `.env`. El `.env.example` ya no trae ningún valor por default.
- **Generar uno fuerte:**
  ```bash
  openssl rand -hex 32
  # → e.g. 5f4dcc3b5aa765d61d8327deb882cf99...
  ```
- **Cambiar el secret invalida todas las sesiones existentes** y los seeds TOTP. Es lo correcto — un secret rotado es un secret "perdido", no se puede seguir firmando tokens viejos.

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

## `TRUST_FORWARDED_FOR`

Equivale a prender `security.network.trustForwardedFor` en el panel (cualquiera de los dos alcanza; también se acepta `TRUST_PROXY=true`). Sin esto, la IP del cliente es la del socket: detrás de un reverse proxy, todos los requests parecen venir del proxy y el rate limit del login los cuenta como uno solo.

Con `true`, la IP se saca de `X-Forwarded-For` **recorriéndolo de derecha a izquierda**, porque Nginx, Traefik y OpenResty *agregan* al header lo que manda el cliente: la entrada de la izquierda la elige el atacante.

- **Sin `trustedProxies`** (`security.network.trustedProxies` vacío): se confía en un solo salto. La IP del cliente es la última entrada de `X-Forwarded-For` (la que agregó tu proxy). Es lo correcto con un único reverse proxy delante.
- **Con `trustedProxies`** (IPs o CIDRs, ej. `10.0.0.0/8`, `172.18.0.2`): si el socket no es un proxy de la lista, se usa la IP del socket e `X-Forwarded-For` se ignora; si lo es, se saltean desde la derecha todas las entradas que estén en la lista y la primera que no está es el cliente. Usalo cuando hay más de un proxy en la cadena (CDN + reverse proxy, por ejemplo).
- Si no hay `X-Forwarded-For`, se usa `X-Real-IP` (si es una IP válida) o el socket.

**No lo prendas si Umbral está expuesto directo**, sin proxy: cualquiera podría mandar el header que quiera.

```env
TRUST_FORWARDED_FOR=true
```

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

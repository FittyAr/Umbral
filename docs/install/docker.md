# Docker — Setup completo

Setup de producción con `docker-compose.yml`, variables de entorno, healthcheck y volúmenes persistentes.

## Prerequisitos

- Docker 20.10+ y Docker Compose v2
- Un directorio para el proyecto (ej: `~/atajo` o `/opt/umbral`)

## 1. Clonar / bajar los archivos

```bash
mkdir umbral && cd umbral
# Copiar los archivos del proyecto: Dockerfile, docker-compose.yml, Caddyfile, .env.example
```

Si tenés git:

```bash
git clone <repo-url> umbral
cd umbral
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env   # o vim, code, lo que uses
```

Mínimo viable en `.env`:

```env
SESSION_SECRET=<output de: openssl rand -hex 32>
INITIAL_PASSWORD=<una password fuerte para el primer login>
PORT=3000
```

Ver [Variables de entorno](../config/env.md) para la lista completa.

> ⚠️ **Importante:** cambiá `INITIAL_PASSWORD` apenas puedas desde `/admin` → Seguridad. El valor en `.env` sólo se usa en el primer arranque.

## 3. Build de la imagen

```bash
docker compose build
```

(La primera vez tarda unos minutos — baja Node alpine + deps + compila Astro.)

## 4. Levantar

```bash
docker compose up -d
docker compose logs -f umbral
```

Esperá a ver:
```
[umbral] Initial password set from INITIAL_PASSWORD env var.
```

Y luego:
```
astro v5.x.x ready in xxx ms
┃ Local    http://localhost:4321/
```

Ctrl+C para salir de los logs (el container sigue corriendo).

## 5. Verificar

```bash
# Healthcheck
curl http://localhost:3000/api/health
# → {"status":"ok","uptime":12,"ts":1234567890}

# Portada
curl -I http://localhost:3000/
# → HTTP/1.1 200 OK
```

## 6. Configurar HTTPS con Caddy (recomendado para producción)

[Ver setup completo de Caddy →](./caddy.md)

TL;DR:

1. Descomentar el servicio `caddy` en `docker-compose.yml`
2. Configurar `DOMAIN=home.example.internal` en `.env`
3. Descomentar `tls your-email@example.com` en `Caddyfile` (si tenés dominio público)
4. `docker compose up -d`

Caddy se encarga de:
- HTTPS automático con Let's Encrypt
- Headers `X-Forwarded-For`, `X-Real-IP` (la app los usa para rate limit)
- Redirección HTTP → HTTPS
- HTTP/2, compresión gzip/zstd

## docker-compose.yml completo

El que viene en el repo:

```yaml
services:
  atajo:
    build: .
    image: umbral:latest
    container_name: umbral
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:4321"
    environment:
      - NODE_ENV=production
      - PORT=4321
      - HOST=0.0.0.0
      - DATA_DIR=/app/data
      - SESSION_SECRET=${SESSION_SECRET}
      - INITIAL_PASSWORD=${INITIAL_PASSWORD:-}
      - BASE_URL=${BASE_URL:-}
    volumes:
      - umbral-data:/app/data
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://127.0.0.1:4321/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Descomentar para activar Caddy:
  # caddy:
  #   image: caddy:2-alpine
  #   ...

volumes:
  umbral-data:
```

### Highlights de seguridad

- **`cap_drop: ALL`** + **`no-new-privileges: true`** — el container no puede escalar privilegios ni cargar capabilities del kernel.
- **Usuario no-root** dentro del container (definido en el Dockerfile con `USER app`).
- **Healthcheck** que Docker usa para saber si el container está sano.
- **Volumen `atajo-data`** montado en `/app/data` — la única cosa que necesitás backupear.

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` (host) | `3000` | Puerto en tu máquina que mapea al 4321 del container |
| `NODE_ENV` | `production` | Setear `development` para logs verbose |
| `PORT` (container) | `4321` | Puerto interno del container |
| `HOST` | `0.0.0.0` | Bind address dentro del container |
| `DATA_DIR` | `/app/data` | Carpeta persistente dentro del container |
| `SESSION_SECRET` | random (dev) | Secreto para firmar cookies. **32+ chars en prod** |
| `INITIAL_PASSWORD` | `admin` | Password del primer arranque. **Cambiala ASAP.** |
| `BASE_URL` | — | Si vas detrás de HTTPS, poné `https://tu-dominio` |

Ver [Variables de entorno](../config/env.md) para más detalle.

## Volúmenes

```bash
# Ver el volumen
docker volume inspect umbral-data

# Backup
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/umbral-data-$(date +%F).tgz -C /data .

# Restore
docker compose down
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/umbral-data-XXX.tgz -C /data
docker compose up -d
```

También podés usar el botón **Export** del panel admin para bajar un `config.json` portable (sin los uploads).

## Actualizar

```bash
cd umbral
git pull   # o bajá la nueva versión
docker compose build
docker compose up -d
```

La `data/` se mantiene en el volumen, así que no perdés nada.

## Troubleshooting

**"port is already allocated"**
Cambiá `PORT` en `.env` a otro puerto (ej: `3001`).

**"permission denied" en /app/data**
El container corre como `app` (uid 1000). Si tu host tiene un usuario con otro uid montando el volumen, hay conflicto. Solución: dejar que Docker maneje el volumen (sin bind mount a un directorio del host).

**"SERVICE_SECRET not set" warning rojo en los logs**
Estás usando el default débil. Ver [Variables de entorno](../config/env.md).

Más en [Troubleshooting](../usage/troubleshooting.md).

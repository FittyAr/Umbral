# Nginx / Traefik — reverse proxies alternativos

> Si preferís no usar Caddy, Nginx y Traefik son las otras opciones mainstream. Nginx es el clásico; Traefik brilla cuando ya tenés Docker swarm / k8s.

---

## Nginx

### Setup básico con TLS auto-firmado (lab)

```nginx
upstream atajo {
    server 127.0.0.1:4321;
}

server {
    listen 80;
    server_name home.lan.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name home.lan.internal;

    ssl_certificate     /etc/nginx/ssl/home.crt;
    ssl_certificate_key /etc/nginx/ssl/home.key;

    # MODERNOS (TLS 1.3, curvas decentes)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Headers que la app espera (sólo si activás trustForwardedFor)
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Host $host;

    # Buffers para que no rompa con responses grandes
    proxy_buffering off;
    proxy_http_version 1.1;

    location / {
        proxy_pass http://atajo;
    }

    location /api/health {
        access_log off;  # no loguear el healthcheck
        proxy_pass http://atajo;
    }
}
```

Generar cert auto-firmado para probar:

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/home.key \
  -out /etc/nginx/ssl/home.crt \
  -subj "/CN=home.lan.internal"
```

### Let's Encrypt con certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d home.example.com
```

Certbot edita automáticamente el `server { }` block y agrega el cert y la renovación.

Renovación automática: certbot instala un timer systemd o un cron que corre `certbot renew` cada 12h. Verificá:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### Nginx + Docker (compose)

```yaml
services:
  atajo:
    build: .
    image: atajo:latest
    expose: ["4321"]   # sólo accesible desde otros containers
    ...

  nginx:
    image: nginx:1.27-alpine
    depends_on: [atajo]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/ssl:ro
    restart: unless-stopped
```

### HSTS en Nginx

Si querés que Nginx se encargue del HSTS (en vez de la app):

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Y en la app: `cfg.security.headers.hsts = 'never'` (porque ya viene en el header de Nginx).

### Activar trustForwardedFor en la app

Idem Caddy: `/admin` → **Hardening** → **Red** → ✓ **Confiar en X-Forwarded-For**.

---

## Traefik

Traefik autodetecta containers de Docker y se configura solo. Ideal para setups con varios servicios.

### docker-compose con Traefik

```yaml
services:
  traefik:
    image: traefik:v3.1
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-cert:/letsencrypt
    restart: unless-stopped

  atajo:
    build: .
    image: atajo:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.atajo.rule=Host(`home.example.com`)"
      - "traefik.http.routers.atajo.entrypoints=websecure"
      - "traefik.http.routers.atajo.tls.certresolver=letsencrypt"
      - "traefik.http.services.atajo.loadbalancer.server.port=4321"
      - "traefik.http.middlewares.atajo-headers.headers.forwardedHeaders=true"
      - "traefik.http.middlewares.atajo-headers.headers.customRequestHeaders.X-Forwarded-For=:remote_addr"
      - "traefik.http.middlewares.atajo-headers.headers.customRequestHeaders.X-Real-IP=:remote_addr"
      - "traefik.http.middlewares.atajo-headers.headers.customRequestHeaders.X-Forwarded-Proto=https"
      - "traefik.http.routers.atajo.middlewares=atajo-headers@docker"
    restart: unless-stopped

volumes:
  traefik-cert:
```

Traefik detecta los labels de `atajo`, configura el router y pide el cert automáticamente.

### Dashboard de Traefik

Útil para debug:

```yaml
labels:
  - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`)"
  - "traefik.http.routers.traefik.service=api@internal"
  - "traefik.http.routers.traefik.entrypoints=websecure"
  - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
```

(Protegelo con auth básico o IP allowlist antes de exponerlo.)

### Activar trustForwardedFor en la app

Mismo que con Caddy/Nginx: `/admin` → **Hardening** → **Red** → ✓ **Confiar en X-Forwarded-For**.

---

## Headers importantes que el reverse proxy debe propagar

| Header | Por qué | Default si falta |
|---|---|---|
| `X-Forwarded-For` | IP real del cliente (rate limit) | Todos los clientes tienen IP del proxy |
| `X-Real-IP` | Alternativa a XFF (algunos setups) | igual |
| `X-Forwarded-Proto` | Detecta HTTPS (HSTS) | app no manda HSTS aunque el cliente use HTTPS |
| `Host` | Identifica el sitio virtual | OK por default en Nginx/Traefik |

**Importante:** Saneá los headers entrantes en el edge (sólo agregar tu IP a XFF, no aceptar la del cliente). Nginx con `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` lo hace bien. Caddy con `{remote_host}` igual. Traefik con `forwardedHeaders=true` también.

---

## Cuál elegir

| Escenario | Recomendado |
|---|---|
| LAN privada, dominio público | Caddy |
| Cloud público, dominio en Cloudflare | Caddy + Cloudflare Tunnel (sin abrir puertos) |
| Cluster Docker / Swarm / k8s | Traefik |
| Ya tenés Nginx expertise | Nginx |
| Querés un setup "single binary" sin Docker | Caddy standalone |
| Múltiples servicios web detrás de un proxy | Caddy o Traefik (Nginx requiere config manual) |

Para más detalle sobre HTTPS interno, Let's Encrypt, o wildcards, ver [Caddy reverse proxy](./caddy.md) — los conceptos son los mismos, sólo cambia la sintaxis.

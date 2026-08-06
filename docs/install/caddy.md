# Caddy — reverse proxy con HTTPS automático

> **Recomendado** para deployments en producción. Caddy gestiona TLS solo, sin pelearse con certs.

## TL;DR

Si ya tenés un dominio público (ej: `home.example.com`) apuntando a tu server:

1. Editá `.env`:
   ```env
   DOMAIN=home.example.com
   ```
2. En `docker-compose.yml`, **descomentá** el servicio `caddy` (líneas 39-53 del compose).
3. En `Caddyfile`, **descomentá** la línea `tls your-email@example.com`.
4. `docker compose up -d`.
5. Listo: HTTPS con Let's Encrypt automático, renovación incluida.

## Setup detallado

### 1. Caddyfile incluido

El `Caddyfile` del repo:

```caddyfile
{$DOMAIN:home.example.internal} {
    # Si tenés un dominio público, descomentar para HTTPS automático:
    # tls your-email@example.com

    encode zstd gzip
    reverse_proxy umbral:4321 {
        header_up X-Forwarded-For {remote_host}
        header_up X-Real-IP {remote_host}
    }
}
```

Qué hace cada pieza:

- **`{$DOMAIN:home.example.internal}`** — el sitio que Caddy sirve. `{$VAR:default}` es la sintaxis de Caddy para placeholders de env vars con default.
- **`encode zstd gzip`** — compresión brotli-equivalente (zstd) + gzip, automático según Accept-Encoding del cliente.
- **`reverse_proxy umbral:4321`** — proxy al container de la app (nombre del servicio en `docker-compose.yml`).
- **`header_up X-Forwarded-For {remote_host}`** — pasa la IP real del cliente al upstream. La app la usa para rate limit **si activás** `cfg.security.network.trustForwardedFor = true` (recomendado cuando hay Caddy delante).

### 2. Tres modos de operación

#### A) HTTP en LAN privada (sin TLS)

El más simple. Útil cuando todo el tráfico está dentro de la VPN.

```caddyfile
home.lan.internal {
    encode zstd gzip
    reverse_proxy umbral:4321
}
```

- No requiere dominio público.
- No hay certs.
- La app detecta que no es HTTPS (no `BASE_URL=https://...`) y no manda HSTS.
- ⚠️ **Sólo para LAN aislada.** Si lo exponés a Internet sin TLS, las credenciales viajan en claro.

#### B) HTTPS automático con Let's Encrypt (dominio público)

Para cuando tenés un dominio real (ej: `home.example.com`) apuntando a tu server.

```caddyfile
home.example.com {
    tls your-email@example.com
    encode zstd gzip
    reverse_proxy umbral:4321 {
        header_up X-Forwarded-For {remote_host}
        header_up X-Real-IP {remote_host}
    }
}
```

Caddy:
- Pide el cert a Let's Encrypt vía ACME HTTP-01 challenge.
- Lo renueva solo antes de expirar.
- Redirige HTTP→HTTPS automáticamente.
- HSTS lo mete él por default (max-age=31536000, sin `includeSubDomains` — ajustable en el sitio).

**Requisitos:**
- Puerto **80** y **443** abiertos al Internet.
- DNS `A`/`AAAA` apuntando a tu server.
- Un email válido (Let's Encrypt manda avisos de expiración ahí).

#### C) HTTPS con dominio interno y CA propia

Si tu "dominio" es interno (`home.corp.internal`) pero querés HTTPS sin pagar certs públicos.

Opciones:

**Opción 1: Step-CA + DNS challenge**
[step-ca](https://smallstep.com/certificates/) corre una CA interna y Caddy puede usar la CA con un DNS plugin.

**Opción 2: mkcert + certs locales**
1. En cada máquina cliente, instalá [mkcert](https://github.com/FiloSottile/mkcert) y la CA root local.
2. Generá certs con `mkcert home.corp.internal`.
3. En Caddy:
   ```caddyfile
   home.corp.internal {
       tls /path/to/cert.pem /path/to/key.pem
       ...
   }
   ```
4. Distribuí la CA root a todos los clientes que se conectan.

**Opción 3: Cloudflare Tunnel**
Si tenés un dominio en Cloudflare, el [tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) te da HTTPS público sin abrir puertos:

```bash
cloudflared tunnel create umbral
cloudflared tunnel route dns umbral home.example.com
cloudflared tunnel run umbral
```

Y en Caddy cambiás el `reverse_proxy` para que apunte a `localhost:` donde corre `cloudflared`.

### 3. Activar trustForwardedFor en la app

Una vez que Caddy está en frente, activá en la app el flag para que el rate limit use la IP real del cliente:

1. `/admin` → tab **Hardening** → sección **Red**
2. ✓ **Confiar en X-Forwarded-For (sólo con reverse proxy)**
3. **Guardar cambios**.

Sin esto, **todos los clientes** que lleguen vía Caddy van a tener la misma IP (la del container) y el rate limit te puede bloquear a vos mismo.

### 4. BASE_URL para cookies Secure

Si vas por HTTPS, seteá `BASE_URL=https://home.example.com` en `.env`. La app usa ese valor para:

- Marcar la cookie de sesión con el flag `Secure`.
- Detectar HTTPS para HSTS (modo `auto`).

### 5. Healthcheck de Caddy

Caddy expone un endpoint `/health` nativo si lo activás. Para mantener compat con la app:

```caddyfile
home.example.com {
    ...
    @healthcheck path /api/health
    handle_response @healthcheck {
        respond * 200
    }
}
```

(O simplemente dejá que `/api/health` se proxee normal — la app ya devuelve JSON con el uptime.)

## Configuración avanzada

### Logs

Por default Caddy loguea a stdout (visible con `docker compose logs caddy`). Para logs más detallados:

```caddyfile
{
    debug
}
log {
    output file /data/access.log {
        roll_size 10MiB
        roll_keep 5
    }
}
```

### Múltiples dominios / subdominios

```caddyfile
home.example.com, status.example.com {
    tls your-email@example.com
    reverse_proxy umbral:4321
}
```

### Restringir por IP

```caddyfile
home.example.com {
    tls your-email@example.com
    @blocked not remote_ip 10.0.0.0/8 192.168.0.0/16
    handle @blocked {
        respond 403
    }
    reverse_proxy umbral:4321
}
```

### Rate limit propio de Caddy

Caddy no trae rate limit out-of-the-box, pero hay un plugin: [caddy-ratelimit](https://github.com/mholt/caddy-ratelimit).

Si lo necesitás, buildá una imagen custom de Caddy con el plugin. Para la mayoría de los deployments, el rate limit de la app (configurable en `/admin` → Hardening) es suficiente.

## Verificar que funciona

```bash
# 1. Caddy arrancó
docker compose logs caddy | grep -i "serving"
# → "serving HTTPS on :443"

# 2. Cert OK
docker compose exec caddy caddy list-certificates
# → tu dominio, sin "expired"

# 3. La app responde detrás del proxy
curl -I https://home.example.com/api/health
# → HTTP/2 200

# 4. HSTS presente
curl -I https://home.example.com/ | grep -i strict-transport
# → Strict-Transport-Security: max-age=31536000
```

## Troubleshooting

**"Caddy no arranca, port 80 already in use"**
Otro proceso usa el puerto 80. En Linux, muchas veces es Apache/Nginx viejo:
```bash
sudo ss -tlnp | grep :80
sudo systemctl stop apache2 nginx
```

**"ACME challenge failed"**
- DNS no apunta al server: `dig +short home.example.com` debería dar tu IP pública.
- Puerto 80 cerrado al Internet: `curl http://tu-ip-publica` debería responder.
- Caddy detrás de otro NAT/proxy: el ACME HTTP-01 challenge requiere que el request llegue a Caddy en el puerto 80.

**"HSTS no aparece"**
- `cfg.security.headers.hsts = 'never'` o no detectaste HTTPS. Ver [Hardening / seguridad](../config/security.md#hsts).
- `BASE_URL` no es `https://...` y `trustForwardedFor` es false.
- Estás haciendo `curl -I` sin `https://` y esperás ver HSTS — no, sólo se manda en respuestas HTTPS.

**"App pierde sesión al recargar"**
- La cookie de sesión tiene flag `Secure` y estás accediendo por HTTP.
- Solución: o accedés por HTTPS, o cambiás `cfg.security.session.cookieSecure = 'never'`.

**"Rate limit me bloquea a mí mismo"**
Olvidaste activar `trustForwardedFor` en la app y todos los requests llegan con la IP del container. Ver sección "Activar trustForwardedFor en la app" arriba.

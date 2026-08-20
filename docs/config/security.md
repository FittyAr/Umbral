# Hardening / seguridad

> Todo lo que el admin puede ajustar desde `/admin` → tab **Hardening**. Los defaults son permisivos para que la app "simplemente funcione"; endurecé lo que necesites.

## Filosofía

- **Permissive por default** → la app es accesible recién salida de la caja.
- **Endurecimiento explícito** → cada cambio es una decisión consciente del admin.
- **Sin secretos hardcoded** → `SESSION_SECRET` se valida y rechaza si es default.
- **Defensa en profundidad** → varias capas (CSP, HSTS, rate limit, CSRF, body caps, sanitización).

## `security.session` — Cookies y sesión

| Campo | Default | Opciones | Notas |
|---|---|---|---|
| `ttlHours` | `24` | 1-720 | Cuánto vive la cookie. Más bajo = más seguro, más molesto. |
| `cookieSameSite` | `'Lax'` | `Strict`, `Lax`, `None` | `Strict` es más seguro pero rompe links cross-site. `Lax` es el balance. `None` requiere Secure. |
| `cookieSecure` | `'auto'` | `auto`, `always`, `never` | `auto` = sólo manda `Secure` si `BASE_URL` es HTTPS. `always` fuerza. `never` desactiva. |
| `rotateCsrfOnLogin` | `false` | bool | Si true, rota el CSRF en cada login (más seguro, fuerza re-render del admin). |

**Recomendación para producción:**
```json
{
  "ttlHours": 8,
  "cookieSameSite": "Strict",
  "cookieSecure": "auto",
  "rotateCsrfOnLogin": true
}
```

## `security.auth` — Login y CSRF

| Campo | Default | Opciones | Notas |
|---|---|---|---|
| `minPasswordLength` | `0` | 0-128 | Mínimo al cambiar password. `0` = sin mínimo (legado). Para prod, 8-12 mínimo. |
| `rateLimitMax` | `30` | 1-10000 | Intentos de login por ventana. Default 30/min holgado para intranet. Endurecer si expuesto. |
| `rateLimitWindowSec` | `60` | 1-3600 | Ventana del rate limit. |
| `csrfPolicy` | `'mutations'` | `mutations`, `all`, `none` | `mutations` (default) = sólo POST/PUT/DELETE/PATCH requieren CSRF. `all` = también GET (paranoid). `none` = desactivado (NO recomendado). |

**Endurecer:**
```json
{
  "minPasswordLength": 12,
  "rateLimitMax": 5,
  "rateLimitWindowSec": 60,
  "csrfPolicy": "mutations"
}
```

## `security.uploads` — Subida de assets

| Campo | Default | Notas |
|---|---|---|
| `maxBytesLogo` | `1048576` (1MB) | Límite para uploads tipo "logo". |
| `maxBytesFavicon` | `262144` (256KB) | Para favicons. |
| `maxBytesIcon` | `524288` (512KB) | Para íconos de tarjeta. |
| `maxBytesBackground` | `5242880` (5MB) | Para fondos. |
| `allowedMimeTypes` | `[png, jpeg, webp, svg+xml, gif]` | **Whitelist.** Sólo se aceptan MIME que matcheen `image/*`. Bloquea upload de HTML, JS, etc. |
| `allowSvg` | `true` | Si false, rechaza SVGs. |
| `sanitizeSvg` | `true` | Si true, pasa SVGs por DOMPurify antes de guardar. **Mantené esto true.** |
| `processImages` | `true` | Si true, sharp redimensiona + convierte a WebP. Desactivar = archivos originales. |

**Endurecer:**
```json
{
  "allowedMimeTypes": ["image/png", "image/jpeg", "image/webp"],
  "allowSvg": false
}
```

Eso bloquea SVGs y GIFs. Útil si no necesitás íconos vectoriales.

## `security.network` — Red

| Campo | Default | Notas |
|---|---|---|
| `trustForwardedFor` | `false` | Confiar en `X-Forwarded-For` / `X-Real-IP` para rate limit. **Activar SÓLO si hay un reverse proxy en frente** (Caddy, Nginx, Traefik). Sin proxy, los clientes pueden falsificar su IP. |
| `trustedProxies` | `[]` | Lista informativa de IPs/CIDRs de proxies. Hoy no se usa para lógica. |
| `cookieDomain` | `null` | Dominio al que se emite la cookie. `null` = hostname del request. `.example.com` = compartir entre subdominios. |

## `security.headers` — Headers de seguridad

### `csp` — Content-Security-Policy

Default actual:
```
default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'
```

- `'unsafe-eval'` está porque **Alpine.js 3** usa `new Function()` para evaluar directivas. Sin él, Alpine tira errores en consola. Para endurecer realmente, usar el build CSP de Alpine (cambia el import) o nonces por request.
- `'unsafe-inline'` en `style-src` es para el CSS inline que el server emite (theme vars). Para sacarlo: extraer a un `.css` file con hash.
- `connect-src 'self'` limita XHR/fetch al propio origin.

**Para API-only deployments (sin UI), podés poner `null`** y la app no manda el header.

### `xFrameOptions`

Default `DENY` (anti-clickjacking). Opciones:
- `DENY` (recomendado): nadie puede embeber la app en un iframe.
- `SAMEORIGIN`: sólo mismo origin.
- `NONE`: desactivado (no recomendado salvo que necesites iframes).

### `referrerPolicy`

Default `no-referrer` (el browser no manda `Referer` header nunca). Opciones:
- `no-referrer` (más estricto, default).
- `same-origin`: sólo a mismo origin.
- `strict-origin-when-cross-origin`: manda sólo el origin en cross-origin.
- `no-referrer-when-downgrade`: manda siempre excepto HTTPS→HTTP.

### `permissionsPolicy`

Default `camera=(), microphone=(), geolocation=()` (cámara, mic y geo deshabilitados). Podés agregar otros features:

```
camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

### HSTS — `Strict-Transport-Security`

> ⚠️ **Cuidado:** HSTS es **sticky en el browser**. Una vez que un browser ve HSTS con `max-age=31536000`, lo recuerda por 1 año. Si después cambiás a HTTP, los usuarios no van a poder entrar hasta que expire.

| Campo | Default | Notas |
|---|---|---|
| `hsts` | `'auto'` | `auto` = activar si detectamos HTTPS (vía `BASE_URL` o `X-Forwarded-Proto` con `trustForwardedFor`). `always` = forzar. `never` = desactivar. |
| `hstsMaxAge` | `31536000` (1 año) | 0 desactiva. RFC 6797 recomienda >= 1 año. |
| `hstsIncludeSubDomains` | `false` | Si true, `Strict-Transport-Security: max-age=...; includeSubDomains`. Activar **SÓLO si todos los subdominios son HTTPS**. |
| `hstsPreload` | `false` | Si true, el dominio se puede enviar a [hstspreload.org](https://hstspreload.org). Requiere `includeSubDomains` y `max-age >= 1 año`. Es un commitment fuerte — remover de la lista tarda semanas. |

**Para producción con HTTPS:**
```json
{
  "hsts": "auto",
  "hstsMaxAge": 31536000,
  "hstsIncludeSubDomains": true,
  "hstsPreload": false
}
```

**Verificar que HSTS se manda:**
```bash
curl -I https://tu-dominio/ | grep -i strict-transport
# → Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## `SESSION_SECRET` (env var)

> No está en `security` porque es env var, no config.

- Default en dev: random por proceso (las sesiones no sobreviven reinicios).
- **En prod: OBLIGATORIO** un secret de 32+ chars.
- Generar uno:
  ```bash
  openssl rand -hex 32
  ```
- La app loguea **FATAL** si detecta un secret débil (default conocido, "change-me", etc).
- Si lo cambiás, **todas las sesiones existentes se invalidan** (es lo correcto).

## Body caps (hardcoded, no configurables)

Para evitar OOM si alguien manda un body gigante:

- `/api/config` y `/api/import`: 1 MB.
- `/api/upload`: 10 MB.

Más allá del cap, el servidor rechaza con `413 Payload Too Large` sin leer el body.

## SSRF protection en `/api/status`

El endpoint que pinguea URLs de las tarjetas (para el badge verde/rojo) tiene protecciones:

- Bloquea IPs privadas (RFC 1918: 10/8, 172.16/12, 192.168/16).
- Bloquea loopback (127/8, ::1).
- Bloquea link-local (169.254/16, fe80::/10).
- Resuelve DNS antes de conectar (evita DNS rebinding).
- `redirect: 'manual'` (no sigue redirects — sino un atacante podría apuntar a un servicio interno).

## Headers automáticos (no configurables)

La app siempre manda:

- `X-Content-Type-Options: nosniff`
- `Cache-Control` adecuado por endpoint (assets con hash: `immutable`; HTML: `no-store`)

## Audit log

Cada cambio importante (config_update, login, password_change, asset_delete, etc) se loguea a `data/audit.log` (append-only). Rotación automática a 10MB con 3 generaciones.

```bash
# Ver el log
docker exec umbral tail -f /app/data/audit.log
# → 2024-03-22T14:32:11.000Z  login  ok ip=10.0.0.5
# → 2024-03-22T14:35:02.000Z  config_update
# → 2024-03-22T14:36:11.000Z  password_change
```

## Checklist de hardening (orden sugerido)

1. ✅ Setear `SESSION_SECRET` de 32+ chars en `.env`.
2. ✅ Cambiar `INITIAL_PASSWORD` desde `/admin` → Password.
3. ✅ Activar HTTPS (Caddy) y setear `BASE_URL=https://...`.
4. ✅ Activar `trustForwardedFor` en `/admin` → Hardening → Red.
5. ✅ Endurecer CSP si tu setup lo permite (sacar `unsafe-eval` requiere cambios al build de Alpine).
6. ✅ Subir `minPasswordLength` a 8-12.
7. ✅ Ajustar `rateLimitMax` a 5-10 (si no es LAN).
8. ✅ HSTS: `max-age=31536000`, `includeSubDomains` si aplica.
9. ✅ Sacar SVGs si no los necesitás (`allowSvg: false`).
10. ✅ Restringir MIME types a los que realmente usás.
11. ✅ Backup regular de `data/`.
12. ✅ Logs de audit en algún sistema centralizado (si tenés > 1 instancia).

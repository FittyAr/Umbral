# Umbral

> El portal a tus herramientas internas. Self-hosted, single container, sin base de datos. Centraliza accesos a Mattermost, Excalidraw, etc. detrás de la VPN.

![Stack](https://img.shields.io/badge/Astro-5-FF5D01) ![Node](https://img.shields.io/badge/Node-20%2B-339933) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED) ![License](https://img.shields.io/badge/license-MIT-blue)

## ¿Qué es Umbral?

Un **portal interno** que lista tus herramientas con un click, editable desde el navegador, en un único container Docker de ~80 MB. **Sin base de datos**, todo en `data/config.json` + archivos subidos.

Pensado para intranets detrás de VPN, equipos chicos, sysadmins que prefieren **poseer** su infra.

## Características

- 🏠 **Portada pública** con tarjetas reordenables, búsqueda, modo claro/oscuro/auto
- 🎨 **Personalización total** desde el panel admin: branding, tema, layout, íconos, fondo
- 🔐 **Auth simple** con un solo password (bcrypt cost 12, sesión firmada con epoch, CSRF, rate limit)
- 🛡️ **Hardening configurable** desde el panel: CSP, HSTS, rate limit, MIME allowlist, body caps, headers
- 📁 **Sin base de datos** — todo en `data/config.json` + archivos subidos
- 🖼️ **Subida de assets** (logos, fondos, íconos) con validación magic-numbers, sharp processing y DOMPurify
- 🎯 **Set de íconos predefinidos** (Lucide) + íconos propios
- 📚 **Documentación completa** accesible desde la propia app en `/docs`
- 📱 **PWA instalable** + responsive
- 🐳 **Single container** con healthcheck, no-root, `cap_drop: ALL`
- 🔄 **Edición en caliente** — guardar recarga la portada sin reiniciar
- 💾 **Export / import** del config y reset a defaults

## Quick start (Docker)

```bash
docker run -d \
  --name umbral \
  -p 3000:4321 \
  -e INITIAL_PASSWORD=cambiame \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -v umbral-data:/app/data \
  --restart unless-stopped \
  umbral:latest
```

- **Portada:** <http://localhost:3000>
- **Admin:** <http://localhost:3000/admin> (login con `cambiame`, cambiala ya)
- **Docs:** <http://localhost:3000/docs> (auto-generadas desde `docs/`)

Si tenés `docker-compose`:

```bash
git clone https://github.com/FittyAr/Umbral.git umbral && cd umbral
cp .env.example .env   # editar SESSION_SECRET e INITIAL_PASSWORD
docker compose up -d
```

Ver [Quickstart Docker](./docs/install/quickstart.md) para el detalle.

## Quick start (sin Docker)

```bash
npm install
npm run gen:icons
INITIAL_PASSWORD=admin SESSION_SECRET=$(openssl rand -hex 32) npm run dev
# http://localhost:4321
```

Ver [Instalación manual](./docs/install/manual.md) para systemd, OpenRC, NSSM, etc.

## Documentación

Toda la documentación vive en [`docs/`](./docs/README.md) y se renderiza en la app en `/docs`. La sección **Desarrollo** de la portada incluye una tarjeta con link directo.

| | |
|---|---|
| [Quickstart Docker](./docs/install/quickstart.md) | Levantar en 2 minutos |
| [Docker completo](./docs/install/docker.md) | Setup de prod con compose |
| [Instalación manual](./docs/install/manual.md) | Bare-metal con Node + systemd |
| [Caddy reverse proxy](./docs/install/caddy.md) | HTTPS automático |
| [Nginx / Traefik](./docs/install/nginx.md) | Reverse proxies alternativos |
| [Configuración](./docs/config/structure.md) | Schema completo de `config.json` |
| [Hardening](./docs/config/security.md) | CSP, HSTS, rate limit, todo configurable |
| [Variables de entorno](./docs/config/env.md) | `SESSION_SECRET`, `BASE_URL`, etc |
| [Personalización visual](./docs/config/visual.md) | Tema, colores, fuentes, íconos |
| [Panel admin](./docs/usage/admin.md) | Tour por cada tab |
| [Backup y restore](./docs/usage/backup.md) | Backup de `data/` |
| [Troubleshooting](./docs/usage/troubleshooting.md) | Errores comunes |
| [API REST](./docs/usage/api.md) | Endpoints para integraciones |
| [Setup de desarrollo](./docs/dev/setup.md) | Cómo correr local |
| [Arquitectura](./docs/dev/architecture.md) | Cómo está organizado el código |
| [Seguridad — auditoría](./docs/dev/security-audit.md) | Bugs encontrados y arreglados |

## Panel de administración

Entrá a `/admin` y logueate. Tabs disponibles:

| Tab | Qué hace |
|---|---|
| **Branding** | Nombre, logo, favicon |
| **Tema** | Fondo (imagen/color/gradiente), blur, overlay, color acento, tipografía, modo claro/oscuro |
| **Layout** | Columnas por breakpoint, tamaño de card, descripciones |
| **Categorías** | CRUD de categorías con íconos predefinidos |
| **Tarjetas** | CRUD completo, drag-and-drop para reordenar, íconos predefinidos o subidos |
| **Assets** | Subida drag-and-drop (icono/logo/favicon/fondo), listado, borrado seguro |
| **Status** | Ping HEAD a todas las URLs, badge verde/rojo |
| **Hardening** | CSP, HSTS, rate limit, CSRF, MIME allowlist, body caps, todo configurable |
| **Password** | Cambio de contraseña (rota CSRF + invalida sesiones existentes) |
| **Avanzado** | Export/import del config, healthcheck, reset a defaults |

**Atajos de teclado en la portada:**
- `/` → enfoca la búsqueda
- `Esc` → limpia y desfoca la búsqueda

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `4321` | Puerto del container |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `./data` | Carpeta persistente |
| `SESSION_SECRET` | random (dev) | Secreto para firmar cookies. **32+ chars en prod** |
| `INITIAL_PASSWORD` | `admin` | Password del primer arranque (cambiala desde el panel) |
| `BASE_URL` | — | Si vas detrás de HTTPS, poné `https://tu-dominio` |
| `NODE_ENV` | `production` | Setear `development` para logs verbose |

Ver [Variables de entorno](./docs/config/env.md) para la lista completa y ejemplos.

## Detrás de un reverse proxy

### Caddy (recomendado)

El `docker-compose.yml` tiene un servicio `caddy` comentado. Para activarlo:

1. Descomentar el servicio y los volúmenes de Caddy en `docker-compose.yml`.
2. Configurar `DOMAIN=home.example.internal` en `.env`.
3. (Opcional) Descomentar `tls your-email@example.com` en `Caddyfile` para HTTPS automático con Let's Encrypt.
4. `docker compose up -d`.

Detalle completo en [Caddy reverse proxy](./docs/install/caddy.md).

### Nginx / Traefik

Headers a propagar al upstream: `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`. Ver [Nginx / Traefik](./docs/install/nginx.md).

## Seguridad

- Password hasheado con **bcrypt** (cost 12), nunca en texto claro
- Cookie de sesión **HttpOnly + SameSite** (configurable), Secure si `BASE_URL` es https
- **Auth epoch** en session token → cambiar password invalida todas las sesiones al instante
- **CSRF token** rotativo en cada mutación
- **Rate limit** en login (default 30/min/IP, configurable)
- Headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS
- **CSP** configurable (default permisivo para que Alpine funcione OOTB)
- Subidas: **whitelist MIME** (`image/*`) + magic-numbers + **DOMPurify** para SVG
- **Body caps** en middleware: 1MB para config, 10MB para upload
- **SSRF protection** en `/api/status` (blocklist de IPs privadas/loopback)
- Container: usuario **no-root**, `cap_drop: ALL`, `no-new-privileges`
- Audit log append-only en `data/audit.log` con rotación a 10MB

Ver [Hardening / seguridad](./docs/config/security.md) y [Seguridad — auditoría](./docs/dev/security-audit.md) para el detalle.

## Backups

La carpeta `data/` es lo único que necesitás backupear:

```bash
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/umbral-data-$(date +%F).tgz -C /data .
```

Ver [Backup y restore](./docs/usage/backup.md) para restore, automatización, off-site, etc.

## Estructura del proyecto

```
src/
├─ pages/                  # Rutas Astro
│  ├─ index.astro              # portada pública
│  ├─ docs/                    # documentación renderizada
│  ├─ admin/                   # login + dashboard
│  └─ api/                     # login, logout, config, upload, assets, etc.
├─ components/             # Card, Background, Logo, etc.
├─ layouts/                # PublicLayout, AdminLayout
├─ lib/                    # schema, config, auth, upload, assets, icons, http
├─ middleware.ts           # chequeo de auth + CSRF + body caps
└─ styles/
data/                      # volumen: config.json, uploads/, audit.log
public/                    # assets estáticos, íconos, manifest, sw
docs/                      # documentación en .md (se renderiza en /docs)
```

Ver [Arquitectura](./docs/dev/architecture.md) para detalle.

## Licencia

MIT

---

> **Hecho con cariño en Argentina** 🧉 — Astro + Alpine.js + Tailwind v4, sin frameworks pesados, sin base de datos, sin bullshit.

# Personalized Homepage

Un dashboard minimalista para centralizar los accesos a las herramientas internas de la empresa (Mattermost, Excalidraw, etc.) detrás de la VPN. Editable desde el navegador, **sin base de datos**, todo en un único container.

![Stack](https://img.shields.io/badge/Astro-5-FF5D01) ![Node](https://img.shields.io/badge/Node-20%2B-339933) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED) ![License](https://img.shields.io/badge/license-MIT-blue)

## Características

- 🏠 **Portada pública** con tarjetas reordenables, búsqueda, modo claro/oscuro/auto
- 🎨 **Personalización total** desde el panel admin: branding, tema, layout, íconos, fondo
- 🔐 **Auth simple** con un solo password (bcrypt, sesión firmada, CSRF)
- 📁 **Sin base de datos** — todo en `data/config.json` + archivos subidos
- 🖼️ **Subida de assets** (logos, fondos, íconos) con validación y procesamiento
- 🎯 **Set de íconos predefinidos** (Lucide) + íconos propios
- 📱 **PWA instalable** + responsive
- 🐳 **Single container** (~80 MB) con healthcheck, read-only, no-root
- 🔄 **Edición en caliente** — guardar recarga la portada sin reiniciar
- 💾 **Export / import** del config y reset a defaults

## Quick start (Docker)

```bash
# 1. Clonar / entrar al proyecto
cd personalized_homepage

# 2. Configurar variables (recomendado)
cp .env.example .env
# Editar .env y poner SESSION_SECRET de 32+ chars y INITIAL_PASSWORD

# 3. Levantar
docker compose up -d

# 4. Abrir
# http://localhost:3000        → portada pública
# http://localhost:3000/admin  → panel admin (login con INITIAL_PASSWORD)
```

## Quick start (sin Docker)

```bash
npm install
INITIAL_PASSWORD=admin SESSION_SECRET=$(openssl rand -hex 32) npm run dev
# http://localhost:4321
```

## Estructura

```
src/
├─ pages/
│  ├─ index.astro              # portada pública
│  ├─ admin/                   # login + dashboard
│  └─ api/                     # login, logout, config, upload, assets, etc.
├─ components/                 # Card, Background, Logo, etc.
├─ layouts/                    # PublicLayout, AdminLayout
├─ lib/                        # schema, config, auth, upload, assets, icons, http
├─ middleware.ts               # chequeo de auth + CSRF
└─ styles/
data/                          # volumen: config.json, uploads/, audit.log
public/                        # assets estáticos, íconos, manifest, sw
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `4321` | Puerto del container |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `./data` | Carpeta persistente |
| `SESSION_SECRET` | random (dev) | Secreto para firmar cookies. **32+ chars en prod** |
| `INITIAL_PASSWORD` | `admin` | Password del primer arranque (luego se puede cambiar) |
| `BASE_URL` | — | Si tu app vive detrás de un subdominio https, ponelo acá |
| `NODE_ENV` | `production` | Setear `development` para logs verbose |

## Panel de administración

Entrá a `/admin` y logueate. Tabs disponibles:

| Tab | Qué hace |
|---|---|
| **Branding** | Nombre, logo, favicon |
| **Tema** | Fondo (imagen/color/gradiente), blur, overlay, color acento, tipografía, modo claro/oscuro |
| **Layout** | Columnas por breakpoint, tamaño de card, descripciones |
| **Categorías** | CRUD de categorías con íconos predefinidos |
| **Tarjetas** | CRUD completo, drag-and-drop para reordenar, búsqueda, íconos predefinidos o subidos |
| **Assets** | Subida drag-and-drop (icono/logo/favicon/fondo), listado, borrado seguro |
| **Status** | Ping HEAD a todas las URLs, badge verde/rojo |
| **Seguridad** | Cambio de contraseña, ver CSRF token |
| **Avanzado** | Export/import del config, healthcheck, reset a defaults |

**Atajos de teclado en la portada:**
- `/` → enfoca la búsqueda
- `Esc` → limpia y desfoca la búsqueda

## Personalización del config.json

El archivo `data/config.json` se autogenera en el primer arranque. Estructura:

```json
{
  "version": 1,
  "branding": { "companyName": "...", "logo": null, "favicon": null },
  "theme": {
    "background": { "type": "gradient|color|image", "value": "...", "blur": 0, "overlay": 0, "overlayColor": "#000" },
    "cardStyle": "glass|flat|outlined",
    "accentColor": "#60a5fa",
    "textColor": "#f1f5f9",
    "fontFamily": "Inter",
    "fontUrl": "https://fonts.googleapis.com/...",
    "colorMode": "auto|light|dark"
  },
  "layout": {
    "columnsDesktop": 4, "columnsTablet": 3, "columnsMobile": 2,
    "cardSize": "small|medium|large",
    "showDescriptions": true
  },
  "categories": [{ "id": "com", "name": "Comunicación", "icon": "chat" }],
  "cards": [
    {
      "id": "unique-id",
      "title": "Mattermost",
      "description": "Chat interno",
      "url": "https://chat.example.internal",
      "icon": "chat",         // nombre Lucide o /api/assets/<file>
      "category": "com",
      "openInNewTab": true,
      "color": "#1e88e5",
      "order": 0,
      "enabled": true
    }
  ]
}
```

**Íconos predefinidos** (Lucide, ~60): `chat`, `briefcase`, `code`, `terminal`, `file`, `folder`, `image`, `mail`, `calendar`, `users`, `settings`, `search`, `bell`, `video`, `mic`, `lock`, `key`, `shield`, `cloud`, `database`, `server`, `git-branch`, `bar-chart`, `globe`, `link`, `home`, `star`, `heart`, `tag`, `zap`, `sun`, `moon`, `clock`, `map-pin`, `phone`, `layers`, `package`, `rocket`, `github`, `slack`, etc. (ver `public/icons/`).

## Detrás de un reverse proxy

### Caddy (recomendado, included)

El `docker-compose.yml` tiene un servicio `caddy` comentado. Para activarlo:

1. Descomentar el servicio y los volúmenes de Caddy en `docker-compose.yml`.
2. Configurar `DOMAIN=home.example.internal` en `.env`.
3. (Opcional) Descomentar `tls your-email@example.com` en `Caddyfile` para HTTPS automático con Let's Encrypt.

### Nginx / Traefik

Headers a propagar al upstream:
- `X-Forwarded-For`: IP real del cliente
- `X-Real-IP`: mismo
- (Opcional) `X-Forwarded-Proto`: esquema original

Y exponer el container en el puerto 4321 (default).

## Seguridad

- Password hasheado con **bcrypt** (cost 12), nunca en texto claro
- Cookie de sesión **HttpOnly + SameSite=Strict** (Secure si `BASE_URL` es https)
- **CSRF token** en cada mutación
- **Rate limit** en login (30/min/IP, holgado para una intranet)
- Headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`
- Subidas: **whitelist MIME + magic numbers** + tamaño máx por tipo + **DOMPurify** para SVG
- Container: usuario **no-root**, `cap_drop: ALL`, `no-new-privileges`
- Audit log append-only en `data/audit.log`

## Backups

La carpeta `data/` es lo único que necesitás backupear:

```bash
# Backup
docker run --rm -v homepage-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/homepage-data-$(date +%F).tgz -C /data .

# Restore
docker run --rm -v homepage-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/homepage-data-XXX.tgz -C /data
```

También podés usar el botón **Export** del panel admin para bajar un `config.json` portable.

## Troubleshooting

**"config.json está corrupto"**
El JSON se rompió (corte de luz mientras escribía, edición manual mal hecha). El container loguea el error exacto. Solución: restaurar de backup o borrar `data/config.json` para que se regenere con defaults (vas a perder cambios).

**"Auth no inicializado"**
El config no tiene `auth.passwordHash`. Pasó si editaste el JSON a mano. Solución: parar el container, setear `INITIAL_PASSWORD` y borrar `data/config.json` para que se regenere.

**El primer arranque quedó con password "admin"**
Cambialo desde `/admin` → Seguridad. O parás, setás `INITIAL_PASSWORD` en `.env`, y borrás `data/config.json`.

**Los íconos SVG no se ven**
Los SVGs subidos pasan por DOMPurify, que puede romper features complejas (`<use>`, filtros). Si necesitás íconos complejos, subilos como PNG/WebP.

## Licencia

MIT

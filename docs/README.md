# Atajo — Documentación

Self-hosted portal para herramientas internas. Single container, sin base de datos, configurable desde el navegador.

> **Atajo** — el shortcut a tus herramientas internas.

## Índice

### Instalación

| Doc | Para quién |
|---|---|
| [Quickstart Docker](./install/quickstart.md) | Probar en 2 minutos con un solo comando |
| [Docker (completo)](./install/docker.md) | Setup de producción con docker-compose |
| [Manual (sin Docker)](./install/manual.md) | Instalación bare-metal con Node.js |
| [Caddy reverse proxy](./install/caddy.md) | HTTPS automático con Let's Encrypt |
| [Nginx / Traefik](./install/nginx.md) | Reverse proxies alternativos |

### Configuración

| Doc | Para quién |
|---|---|
| [Estructura del config.json](./config/structure.md) | Referencia completa del schema |
| [Hardening / seguridad](./config/security.md) | CSP, HSTS, rate limit, CSRF — todo lo configurable |
| [Variables de entorno](./config/env.md) | `SESSION_SECRET`, `INITIAL_PASSWORD`, `BASE_URL` |
| [Personalización visual](./config/visual.md) | Temas, colores, fuentes, íconos |

### Uso

| Doc | Para quién |
|---|---|
| [Panel de administración](./usage/admin.md) | Tour por cada tab del dashboard |
| [Backup y restore](./usage/backup.md) | Cómo respaldar `data/` (lo único persistente) |
| [Troubleshooting](./usage/troubleshooting.md) | Errores comunes y soluciones |
| [API (avanzado)](./usage/api.md) | Endpoints REST para integraciones |

### Desarrollo

| Doc | Para quién |
|---|---|
| [Setup de desarrollo](./dev/setup.md) | Cómo correr el proyecto localmente |
| [Arquitectura](./dev/architecture.md) | Cómo está organizado el código |
| [Seguridad — pasada de auditoría](./dev/security-audit.md) | Notas sobre el hardening aplicado |

## TL;DR

Si querés probarlo ya:

```bash
docker run -d \
  --name atajo \
  -p 3000:4321 \
  -e INITIAL_PASSWORD=cambiame \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -v atajo-data:/app/data \
  --restart unless-stopped \
  ghcr.io/<user>/atajo:latest
```

Abre <http://localhost:3000>, andá a `/admin`, login con `cambiame`, y cambialo.

Para el setup completo con Caddy + HTTPS automático, seguí [Docker (completo)](./install/docker.md).

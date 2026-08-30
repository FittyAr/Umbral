# Umbral — Documentación Oficial

Portal self-hosted de alto rendimiento para herramientas y accesos internos. Single container, sin base de datos, editable desde el navegador y con soporte para 21 idiomas.

> **Umbral** — El acceso directo y elegante a toda tu infraestructura.

---

## 📚 Índice de Contenidos

### 🚀 Instalación y Despliegue

| Documento | Descripción |
|---|---|
| [Quickstart Docker](./install/quickstart.md) | Despliegue en 2 minutos con un solo comando `docker run` |
| [Docker Producción](./install/docker.md) | Setup completo para producción con `docker-compose` y volúmenes |
| [Instalación Manual](./install/manual.md) | Instalación bare-metal con Node.js y gestor de procesos (systemd/NSSM) |
| [Caddy Reverse Proxy](./install/caddy.md) | Configuración con Caddy para HTTPS automático y headers de seguridad |
| [Nginx / Traefik](./install/nginx.md) | Ejemplos de configuración para proxies inversos alternativos |

### ⚙️ Configuración del Sistema

| Documento | Descripción |
|---|---|
| [Estructura de `config.json`](./config/structure.md) | Referencia exhaustiva del esquema de configuración y todos sus campos |
| [Hardening y Seguridad](./config/security.md) | CSP, HSTS, Rate Limiting, CSRF, Magic-Bytes, SSRF Guard y mitigaciones |
| [Variables de Entorno](./config/env.md) | `SESSION_SECRET`, `INITIAL_PASSWORD`, `DATA_DIR`, `BASE_URL` y variables de IA |
| [Personalización Visual](./config/visual.md) | Temas, gradientes, modo claro/oscuro, tipografías, tokens CSS y animaciones |

### 📖 Guías de Uso y Funcionalidades

| Documento | Descripción |
|---|---|
| [Panel de Administración](./usage/admin.md) | Guía exhaustiva de las 19 pestañas y paneles de administración |
| [Internacionalización (i18n)](./usage/i18n.md) | Guía de los 21 idiomas soportados, cookies de sesión y catálogos de ayuda |
| [Paquetes de Íconos (Git Icon Packs)](./usage/icon-packs.md) | Descarga, instalación y uso de miles de íconos SVG desde Git |
| [Webhooks y Mantenimiento](./usage/webhooks-maintenance.md) | Notificaciones de alertas (Slack/Discord/ntfy/Gotify) y ventanas de mantenimiento |
| [Multi-Portal y Single Sign-On (OIDC)](./usage/multi-portal-sso.md) | Portales múltiples aislados, autenticación empresarial SSO y multi-usuario con 2FA |
| [Auto-completar Inteligente](./usage/auto-completar.md) | Extracción de metadatos web y fallback con buscadores externos |
| [Backup y Restauración](./usage/backup.md) | Respaldo y recuperación del directorio persistente `data/` |
| [Resolución de Problemas (Troubleshooting)](./usage/troubleshooting.md) | Diagnóstico y soluciones a problemas comunes |
| [Referencia de API REST](./usage/api.md) | Especificación completa de todos los endpoints HTTP del servidor |

### 🛠️ Desarrollo y Arquitectura

| Documento | Descripción |
|---|---|
| [Setup de Desarrollo](./dev/setup.md) | Cómo configurar y ejecutar el entorno de desarrollo local |
| [Arquitectura del Sistema](./dev/architecture.md) | Diseño técnico, Astro SSR, Alpine.js, Tailwind v4, ciclo de vida y schemas |
| [Auditoría de Seguridad](./dev/security-audit.md) | Historial de auditorías, vulnerabilidades mitigadas y hardening continuo |

---

## ⚡ Inicio Rápido (Docker)

```bash
docker run -d \
  --name umbral \
  -p 3000:4321 \
  -e INITIAL_PASSWORD=cambiame \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -v umbral-data:/app/data \
  --restart unless-stopped \
  ghcr.io/fittyar/umbral:latest
```

1. Accedé a la portada en <http://localhost:3000>.
2. Ingresá al panel administrativo en <http://localhost:3000/admin>.
3. Iniciá sesión con `cambiame` y personalizá tus credenciales y configuración.

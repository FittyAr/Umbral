# Referencia de API REST de Umbral

Esta guía detalla los endpoints HTTP expuestos por el servidor de Umbral para integraciones externas, automatización, CLI, monitoreo y consumo administrativo.

---

## 🔐 Autenticación y Cabeceras

### Esquemas de Autenticación Soportados
1. **Cookie de Sesión (`umbral_session`):** Obtenida al autenticarse en `POST /api/login`.
2. **Bearer Token (`Authorization: Bearer umb_...`):** Para scripts, GitHub Actions y el CLI de Umbral (requiere la feature `apiTokens`).

### Protección Anti-CSRF
Toda petición de mutación (`POST`, `PUT`, `DELETE`, `PATCH`) autenticada mediante cookie debe incluir la cabecera:
```http
x-csrf-token: <CSRF_TOKEN>
```
El token CSRF se entrega en la respuesta del login o en el objeto de configuración (`/api/config`).

---

## 📋 Endpoints del Sistema

### 1. Salud y Estado

#### `GET /api/health`
Público. Utilizado para liveness probes de Kubernetes, Docker healthchecks y monitores externos.
- **Respuesta 200:**
  ```json
  {
    "status": "ok",
    "uptime": 86400,
    "timestamp": 1725000000000
  }
  ```

#### `GET /api/status`
Ejecuta diagnósticos de conectividad HTTP en tiempo real sobre las tarjetas configuradas.
- **Respuesta 200:**
  ```json
  {
    "results": [
      {
        "id": "card-1",
        "status": 200,
        "latencyMs": 18,
        "ok": true
      }
    ]
  }
  ```

---

### 2. Autenticación y Sesión

#### `POST /api/login`
- **Body:** `{ "username": "admin", "password": "tu-password", "totpCode": "123456" }`
- **Respuesta 200:** Establece la cookie `umbral_session` y devuelve `{ "ok": true, "csrfToken": "..." }`.
- **Errores:** `401 Unauthorized`, `429 Too Many Requests` (Rate Limit).

#### `POST /api/logout`
- **Respuesta 204:** Invalida y elimina la cookie de sesión.

#### `POST /api/password`
- **Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Respuesta 200:** Actualiza el hash de contraseña e incrementa `authEpoch` invalidando sesiones previas.

---

### 3. Configuración

#### `GET /api/config`
Devuelve la configuración completa del portal actual.
- **Respuesta 200:** Objeto `Config` serializado.

#### `PUT /api/config`
Actualiza parcialmente la configuración del portal.
- **Body:** Fragmento de configuración a modificar (ej. `{ "branding": { "companyName": "Nuevo Nombre" } }`).
- **Respuesta 200:** `{ "ok": true, "config": { ... } }`.

#### `POST /api/import`
Importa una configuración completa en formato JSON reemplazando el estado actual.

---

### 4. Internacionalización

#### `POST /api/locale`
Establece la cookie `umbral_locale` (duración 30 días) para fijar el idioma del visitante.
- **Body:** `{ "locale": "es" | "en" | "pt" | "fr" | "de" | "it" | "zh" | "ja" | "ru" | "nl" | "pl" | "ko" | "tr" | "uk" | "sv" | "cs" | "da" | "fi" | "no" | "hu" | "ro" }`
- **Respuesta 302 / 200:** Redirige a la página previa o confirma el cambio.

#### `GET /api/help/<locale>.json`
Devuelve el catálogo de textos de ayuda interactiva para el idioma solicitado en formato estático prerenderizado.

---

### 5. Gestión de Archivos y Assets

#### `GET /api/assets/[...name]`
Público. Sirve imágenes y recursos multimedia desde `data/uploads/` con cabeceras de caché inmutable.

#### `POST /api/upload`
Sube un archivo mediante `multipart/form-data`.
- **Form Data:** `file` (Buffer) y `kind` (`"logo"` | `"favicon"` | `"icon"` | `"background"`).
- **Respuesta 200:** `{ "url": "/api/assets/nombre-optimizado.webp" }`.

#### `POST /api/upload-from-url`
Descarga un favicon o imagen desde una URL remota de forma segura.

---

### 6. Asistente de IA y Auto-completado

#### `POST /api/fetch-card-info`
Scrapea una URL remota para extraer título, descripción y favicon con fallback a motores de búsqueda (Brave, Tavily, Wikipedia, SearXNG).
- **Body:** `{ "url": "https://grafana.com" }`
- **Respuesta 200:** `{ "title": "Grafana", "description": "...", "icon": "..." }`.

#### `POST /api/ai/enrich`
Reescribe o sintetiza títulos y descripciones de tarjetas utilizando el proveedor LLM configurado.

---

### 7. Paquetes de Íconos (Git Icon Packs)

#### `GET /api/icon-pack-catalog.json`
Público. Lista los paquetes de íconos oficiales disponibles para descarga.

#### `POST /api/icon-packs/install`
Descarga y descomprime un paquete de íconos SVG desde un repositorio Git en `data/icon-packs/<pack>/`.

#### `POST /api/icon-packs/uninstall`
Elimina un paquete de íconos descargado.

---

### 8. Auditoría y Métricas

#### `GET /api/audit`
Consulta el registro de auditoría en `data/audit.log` con soporte para filtros por query (`?limit=50&action=config:save&actor=admin`).

#### `GET /api/metrics`
Devuelve las muestras de latencia recientes y resúmenes estadísticos (promedio, p95, máximo) por tarjeta.

---

### 9. Webhooks y Alertas

#### `POST /api/webhooks/test`
Envía una notificación de prueba a la URL del webhook configurado para verificar conectividad con Slack, Discord, Mattermost, ntfy o Gotify.

---

### 10. API Tokens

#### `GET /api/tokens`
Lista los tokens activos creados por el administrador (muestra solo metadatos y prefijo `umb_...`).

#### `POST /api/tokens`
Genera un nuevo token de acceso personal con scopes (`read`, `write`).
- **Respuesta 200:** `{ "token": "umb_sec_xxxxxxxxxxxx" }` *(solo se muestra una vez)*.

#### `DELETE /api/tokens`
Revoca un token existente por su identificador.

# Estructura de `data/config.json`

> Referencia completa del schema. El archivo se autogenera en el primer arranque; podés editarlo a mano o desde el panel admin (`/admin`).

## Ubicación

- **Container:** `/app/data/config.json` (default; configurable con `DATA_DIR`).
- **Host (Docker compose):** volumen `homepage-data:/app/data`.
- **Host (manual):** `<directorio-del-proyecto>/data/config.json`.

> ⚠️ **No edites el archivo mientras la app corre.** Los cambios a mano se pisan con la próxima escritura. Usá `/admin` o, si necesitás editar, pará la app primero.

## Top-level

```json
{
  "version": 1,
  "branding": { ... },
  "theme": { ... },
  "layout": { ... },
  "security": { ... },
  "categories": [ ... ],
  "cards": [ ... ],
  "auth": { ... },
  "_meta": { ... }
}
```

| Campo | Tipo | Editable | Descripción |
|---|---|---|---|
| `version` | literal `1` | no | Versión del schema. Si cambia, la app migra. |
| `branding` | object | sí | Nombre, logo, favicon. |
| `theme` | object | sí | Fondo, colores, fuente, modo claro/oscuro. |
| `layout` | object | sí | Columnas, tamaño de card, descripciones. |
| `security` | object | sí | Endurecimiento (CSP, HSTS, rate limit, etc). |
| `categories` | array | sí | Categorías para agrupar tarjetas. |
| `cards` | array | sí | Las tarjetas en sí. |
| `auth` | object | **no** | Password hash, CSRF token, auth epoch. Server-managed. |
| `_meta` | object | **no** | `createdAt` / `updatedAt`. Server-managed. |

## `branding`

```json
"branding": {
  "companyName": "Acme SA",
  "logo": "/api/assets/logo.png",   // o null
  "favicon": "/api/assets/favicon.ico"
}
```

- `companyName` (1-80 chars): título visible y `<title>` HTML.
- `logo` (string|null): URL de imagen subida o null. Si es null, se muestra la inicial del nombre.
- `favicon` (string|null): igual.

## `theme`

```json
"theme": {
  "background": {
    "type": "gradient",   // "image" | "color" | "gradient"
    "value": "linear-gradient(135deg, #0f172a, #1e3a8a)",
    "blur": 0,            // 0-40 px
    "overlay": 0,         // 0-1 (opacidad)
    "overlayColor": "#000000"
  },
  "cardStyle": "glass",   // "flat" | "glass" | "outlined"
  "accentColor": "#60a5fa",
  "textColor": "#f1f5f9",
  "fontFamily": "Inter",  // whitelist
  "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "colorMode": "auto"     // "auto" | "light" | "dark"
}
```

- `background.type`:
  - `gradient` (default): `value` es CSS válido (gradiente, color sólido, etc).
  - `color`: `value` es `#hex` o nombre CSS.
  - `image`: `value` es URL a un asset subido (`/api/assets/...`).
- `background.value`: max 200 chars. Validado contra regex de "CSS value safe" (bloquea `<>'"\`{` para prevenir XSS).
- `cardStyle`:
  - `glass`: blur + transparencia (default, look "glassmorphism").
  - `flat`: sólido sin bordes.
  - `outlined`: solo borde.
- `accentColor`, `textColor`: hex `#rgb` o `#rrggbb`. Aplicados como CSS vars.
- `fontFamily`: nombre de Google Font (Inter, Roboto, etc) o `system-ui`. Whitelist de caracteres seguros.
- `fontUrl`: opcional. Si está vacío, la app carga la URL default de Google Fonts para el `fontFamily` elegido. Si lo seteás manualmente, **tiene que venir de `fonts.googleapis.com`** (validado por regex).
- `colorMode`:
  - `auto`: claro si la hora local está entre 7 y 19, oscuro en otros rangos. Respeta `prefers-color-scheme` del OS como override.
  - `light` / `dark`: forzado.

Ver [Personalización visual](./visual.md) para más detalle.

## `layout`

```json
"layout": {
  "columnsDesktop": 4,   // 2-8
  "columnsTablet": 3,    // 2-6
  "columnsMobile": 2,    // 1-3
  "cardSize": "medium",  // "small" | "medium" | "large"
  "showDescriptions": true
}
```

- `columnsDesktop`: aplica a viewports > 1024px.
- `columnsTablet`: 640-1024px.
- `columnsMobile`: < 640px.
- `cardSize`:
  - `small`: padding chico, ícono 24px.
  - `medium`: balance (default).
  - `large`: padding generoso, ícono 48px.
- `showDescriptions`: si es `false`, oculta la línea de descripción debajo del título.

## `security`

Detalle completo en [Hardening / seguridad](./security.md). Resumen:

```json
"security": {
  "session": {
    "ttlHours": 24,
    "cookieSameSite": "Lax",
    "cookieSecure": "auto",
    "rotateCsrfOnLogin": false
  },
  "auth": {
    "minPasswordLength": 0,
    "rateLimitMax": 30,
    "rateLimitWindowSec": 60,
    "csrfPolicy": "mutations"
  },
  "uploads": {
    "maxBytesLogo": 1048576,
    "maxBytesFavicon": 262144,
    "maxBytesIcon": 524288,
    "maxBytesBackground": 5242880,
    "allowedMimeTypes": ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
    "allowSvg": true,
    "sanitizeSvg": true,
    "processImages": true
  },
  "network": {
    "trustForwardedFor": false,
    "trustedProxies": [],
    "cookieDomain": null
  },
  "headers": {
    "csp": "default-src 'self'; ...",
    "xFrameOptions": "DENY",
    "referrerPolicy": "no-referrer",
    "permissionsPolicy": "camera=(), microphone=(), geolocation=()",
    "hsts": "auto",
    "hstsMaxAge": 31536000,
    "hstsIncludeSubDomains": false,
    "hstsPreload": false
  }
}
```

## `categories`

```json
"categories": [
  {
    "id": "com",
    "name": "Comunicación",
    "icon": "message-circle"
  }
]
```

- `id`: kebab-case único, 1-40 chars. Es la clave que las tarjetas referencian con `category`.
- `name`: 1-60 chars, lo que se ve en pantalla.
- `icon`: nombre de un ícono Lucide (whitelist) o path `/api/assets/<file>`.

## `cards`

```json
"cards": [
  {
    "id": "mattermost",
    "title": "Mattermost",
    "description": "Chat interno",
    "url": "https://chat.example.internal",
    "icon": "chat",
    "category": "com",
    "openInNewTab": true,
    "color": "#1e88e5",
    "order": 0,
    "enabled": true
  }
]
```

- `id`: único, 1-80 chars. Si no lo das, se autogenera al crear la tarjeta en el panel.
- `title`: 1-80 chars.
- `description`: opcional, hasta 200 chars.
- `url`: URL `https://...` o path interno `/...` (ej: `/docs`).
- `icon`: nombre Lucide o path `/api/assets/<file>`. Si vacío, la tarjeta no muestra ícono.
- `category`: id de una categoría existente.
- `openInNewTab`: `true` = nueva pestaña (`target="_blank" rel="noopener noreferrer"`), `false` = misma pestaña.
- `color`: hex, opcional. Override del accent color del tema para ESTA tarjeta.
- `order`: número entero, se usa para ordenar (menor = primero). El drag-and-drop del panel lo reasigna.
- `enabled`: si es `false`, la tarjeta no se muestra en la portada.

## `auth` (server-managed)

```json
"auth": {
  "passwordHash": "$2a$12$...bcrypt...",
  "csrfToken": "64-char-hex",
  "authEpoch": 0
}
```

> **No editable desde el client.** La password se cambia desde `/admin` → tab **Password**. El `csrfToken` se rota automáticamente al cambiar la password. El `authEpoch` se incrementa al cambiar la password; cualquier session token emitido con un epoch anterior queda invalidado.

## `_meta` (server-managed)

```json
"_meta": {
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-03-22T14:32:11.000Z"
}
```

Timestamps ISO 8601. Se actualizan automáticamente en cada save/reset.

## Migración

Si tenés un `config.json` de una versión vieja sin `security` (u otro campo nuevo), la app **mergea con los defaults** automáticamente y reescribe el archivo. No perdés tu config — sólo se completan los huecos.

Si tenés un archivo **muy viejo o con campos deprecados**, podés ver el error exacto en los logs (`docker logs atajo`):

```
[homepage] config.json no cumple el schema: cards.0.url: URL inválida; theme.fontFamily: ...
```

Soluciones:
1. Corregir el campo a mano.
2. Borrar el `config.json` (vas a perder cambios pero conserva `data/uploads/`).
3. Restaurar de backup.

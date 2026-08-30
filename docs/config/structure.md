# Estructura Completa de `data/config.json`

Referencia exhaustiva y actualizada del esquema de configuración de **Umbral**. Este archivo almacena de forma plana toda la configuración de la instancia (o del portal activo en modo multi-portal) y es validado en cada arranque y modificación mediante esquemas estrictos de **Zod**.

---

## 📍 Ubicación y Ciclo de Vida

- **Dentro del contenedor Docker:** `/app/data/config.json` (o `/app/data/portals/<id>/config.json` en multi-portal).
- **En el host:** Montado típicamente en el volumen `umbral-data:/app/data`.
- **Modificación segura:** Se recomienda modificar la configuración desde el panel web `/admin` o mediante la API REST (`PUT /api/config`). Si se edita manualmente con el servidor en ejecución, el archivo se reescribirá en la siguiente mutación.

---

## 📑 Estructura Top-Level

```json
{
  "version": 1,
  "branding": { ... },
  "theme": { ... },
  "layout": { ... },
  "categories": [ ... ],
  "cards": [ ... ],
  "features": { ... },
  "security": { ... },
  "auth": { ... },
  "_meta": { ... }
}
```

| Campo | Tipo | Editable | Descripción |
|---|---|---|---|
| `version` | `number` | No | Versión del esquema (`1`). Permite migraciones automáticas. |
| `branding` | `object` | Sí | Nombre del portal, logo y favicon. |
| `theme` | `object` | Sí | Fondos, colores, tipografía, estilo de tarjeta y animaciones. |
| `layout` | `object` | Sí | Columnas por dispositivo, espaciados y dimensiones. |
| `categories` | `array` | Sí | Colección de categorías (orden, iconos, bloqueo). |
| `cards` | `array` | Sí | Colección de tarjetas (enlaces, notas, monitoreo, ancho). |
| `features` | `object` | Sí | Activación granular de funcionalidades (opt-in). |
| `security` | `object` | Sí | Parámetros de endurecimiento (CSP, HSTS, Rate Limit). |
| `auth` | `object` | Parcial | Password hash, sesiones, usuarios y tokens. |
| `_meta` | `object` | No | Metadatos gestionados por el servidor (`createdAt`, `updatedAt`). |

---

## 🏷️ `branding`

```json
"branding": {
  "companyName": "Mi Organización",
  "logo": "/api/assets/logo.png",
  "favicon": "/api/assets/favicon.ico"
}
```

- **`companyName`** (`string`, 1–80 caracteres): Nombre visible en el encabezado y en la etiqueta `<title>` de la página.
- **`logo`** (`string | null`): Ruta al archivo de imagen en assets. Si es `null`, se genera un avatar con la inicial.
- **`favicon`** (`string | null`): Ruta al favicon personalizado (`.ico`, `.svg`, `.png`).

---

## 🎨 `theme`

```json
"theme": {
  "background": {
    "type": "gradient",
    "value": "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)",
    "blur": 0,
    "overlay": 0,
    "overlayColor": "#000000"
  },
  "backgroundLight": {
    "type": "color",
    "value": "#f8fafc",
    "blur": 0,
    "overlay": 0,
    "overlayColor": "#ffffff"
  },
  "cardStyle": "glass",
  "groupLayout": "vertical",
  "accentColor": "#3b82f6",
  "textColor": "#f8fafc",
  "textLightColor": "#0f172a",
  "fontFamily": "Inter",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "colorMode": "auto",
  "widgets": {
    "showClock": true,
    "clockPosition": "right",
    "clockFormat": "24h",
    "showRefresh": true,
    "showStatusBar": true,
    "showModeToggle": true,
    "headerOpacity": 1,
    "footerOpacity": 1
  },
  "animations": {
    "cardEntrance": "slideUp",
    "cardEntranceDuration": 350,
    "cardEntranceStagger": 40,
    "cardHover": "lift",
    "cardHoverDuration": 200,
    "headerEffect": "none",
    "titleTypewriter": false,
    "counters": true,
    "respectReducedMotion": true
  }
}
```

- **`background` / `backgroundLight`**: Configuración de fondo independiente para modo oscuro y claro:
  - `type`: `"gradient"` | `"color"` | `"image"`.
  - `value`: Código CSS válido, color hex o ruta `/api/assets/...`.
  - `blur`: Desenfoque de 0 a 40px.
  - `overlay`: Opacidad de la capa (0 a 1).
  - `overlayColor`: Color hexadecimal de la capa de superposición.
- **`cardStyle`**: `"glass"` (glassmorphism) | `"flat"` (sólido) | `"outlined"` (borde fino).
- **`groupLayout`**: `"vertical"` (categorías apiladas) | `"horizontal"` (columnas de categorías).
- **`accentColor`**: Color hexadecimal para realces, bordes activos y focos.
- **`textColor` / `textLightColor`**: Colores primarios del texto para modos oscuro y claro.
- **`fontFamily` / `fontUrl`**: Nombre de la fuente y URL autorizada de Google Fonts.
- **`colorMode`**: `"auto"` (según horario y preferencias del sistema) | `"light"` | `"dark"`.
- **`widgets`**: Interruptores de visualización para reloj, botón de refresco, barra de estado y opacidades.
- **`animations`**: Efectos de entrada, hover, máquina de escribir y accesibilidad.

---

## 📐 `layout`

```json
"layout": {
  "columnsDesktop": 4,
  "columnsTablet": 3,
  "columnsMobile": 2,
  "gap": 1,
  "categoryGap": 2,
  "ghostCategoryGap": 0.35,
  "cardSize": "medium",
  "cardRadius": "0.75rem",
  "showDescriptions": true,
  "compact": false,
  "maxWidth": "1400px",
  "gridAlign": "center",
  "healthCheckInterval": 60
}
```

- **`columnsDesktop` / `columnsTablet` / `columnsMobile`**: Número de columnas en la grilla para cada viewport.
- **`gap`**: Distancia entre tarjetas en rem (0 a 3rem).
- **`categoryGap`**: Separación vertical antes de cada bloque de categoría (0 a 6rem).
- **`ghostCategoryGap`**: Margen antes de tarjetas no categorizadas (0 a 6rem).
- **`cardSize`**: `"small"` | `"medium"` | `"large"`.
- **`cardRadius`**: Radio de redondeo de las tarjetas en unidades CSS (`rem`, `px`).
- **`showDescriptions`**: Booleano para mostrar u ocultar la línea de descripción en las tarjetas.
- **`compact`**: Modo compacto de alta densidad (reduce espaciados al 50%).
- **`healthCheckInterval`**: Intervalo en segundos entre chequeos de estado en segundo plano (10s a 3600s).

---

## 🗂️ `categories`

```json
"categories": [
  {
    "id": "infraestructura",
    "name": "Infraestructura & Servidores",
    "icon": "lucide/server",
    "isGhost": false,
    "isSubpage": false,
    "isLocked": false,
    "passwordHash": null
  }
]
```

- **`id`** (`string`, kebab-case): Identificador único referenciado por las tarjetas.
- **`name`** (`string`, 1–60 caracteres): Título visible del encabezado de la categoría.
- **`icon`** (`string | null`): Ruta al ícono SVG calificado por paquete (ej. `lucide/server`).
- **`isGhost`** (`boolean`): Si es `true`, renderiza las tarjetas sin encabezado visible.
- **`isSubpage`** (`boolean`): Si es `true`, oculta la categoría de la portada y la expone en `/nombre-categoria`.
- **`isLocked`** (`boolean`): Si es `true`, requiere ingresar la contraseña de `passwordHash` para mostrar las tarjetas.
- **`passwordHash`** (`string | null`): Hash bcrypt de la contraseña de desbloqueo.

---

## 🎴 `cards`

```json
"cards": [
  {
    "id": "card-m7k2-9a8b1c",
    "title": "Grafana Monitor",
    "url": "https://grafana.internal.net",
    "icon": "lucide/activity",
    "description": "Métricas y dashboards de infraestructura",
    "category": "infraestructura",
    "openInNewTab": true,
    "color": "#f97316",
    "enabled": true,
    "healthCheck": true,
    "kind": "link",
    "markdown": false,
    "tags": ["monitoreo", "metricas", "noc"],
    "pinned": true,
    "span": 1,
    "maintenance": {
      "active": false,
      "start": null,
      "end": null
    }
  }
]
```

- **`id`** (`string`): Identificador único prefijado (ej. `card-<timestamp36>-<counter+random36>`).
- **`title`** (`string`, 1–80 caracteres): Título de la tarjeta.
- **`url`** (`string`): Dirección URL para tarjetas tipo link (requerido si `kind === 'link'`).
- **`icon`** (`string | null`): Ícono de paquete (ej. `simple-icons/grafana` o `lucide/bar-chart`).
- **`description`** (`string`): Texto explicativo (hasta 200 chars en links; hasta 1000 chars en notas con markdown).
- **`category`** (`string`): `id` de la categoría a la que pertenece.
- **`openInNewTab`** (`boolean`): Abre la URL con `target="_blank"` y `rel="noopener noreferrer"`.
- **`color`** (`string | null`): Color hexadecimal para personalizar el acento de la tarjeta.
- **`enabled`** (`boolean`): Controla la visibilidad pública de la tarjeta.
- **`healthCheck`** (`boolean`): Activa el monitoreo automático de estado HTTP.
- **`kind`**: `"link"` (enlace estándar) o `"note"` (tarjeta informativa sin link).
- **`markdown`** (`boolean`): Habilita el renderizado de formato Markdown en notas.
- **`tags`** (`string[]`): Hasta 10 etiquetas en formato kebab-case para búsqueda.
- **`pinned`** (`boolean`): Fija la tarjeta en la primera posición de su grupo.
- **`span`** (`number`, 1–8): Cantidad de columnas que ocupa la tarjeta en la grilla.
- **`maintenance`**: Configuración de ventana de mantenimiento programada.

---

## ⚡ `features` (Feature Flags Opt-In)

Cada funcionalidad avanzada de Umbral está aislada y se activa a demanda:

```json
"features": {
  "i18n": { "enabled": true, "locale": "es" },
  "markdown": { "enabled": true },
  "tags": { "enabled": true },
  "pinned": { "enabled": true },
  "presets": { "enabled": true },
  "auditLogViewer": { "enabled": true },
  "qr": { "enabled": false },
  "metrics": { "enabled": true },
  "webhooks": { "enabled": false },
  "maintenanceWindows": { "enabled": false },
  "multiUser": { "enabled": false },
  "totp2fa": { "enabled": false },
  "oidc": { "enabled": false },
  "apiTokens": { "enabled": false },
  "multiPortal": { "enabled": false },
  "status": { "enabled": true },
  "ai": { "enabled": false },
  "iconPacks": { "enabled": true },
  "animations": { "enabled": true }
}
```

- **`i18n.locale`**: Idioma predeterminado del portal (`es`, `en`, `pt`, `fr`, `de`, `it`, `zh`, `ja`, `ru`, `nl`, `pl`, `ko`, `tr`, `uk`, `sv`, `cs`, `da`, `fi`, `no`, `hu`, `ro`).

---

## 🛡️ `security`

Directivas de endurecimiento y protección HTTP. Consulta [Guía de Hardening y Seguridad](./security.md) para el detalle de cada subsección (`session`, `auth`, `uploads`, `network`, `headers`).

---

## 🔑 `auth`

Gestionado automáticamente por el servidor:
- **`passwordHash`**: Hash bcrypt del super-admin.
- **`csrfSecret`**: Clave secreta para validación de tokens anti-CSRF.
- **`authEpoch`**: Marca temporal que invalida todas las sesiones activas al cambiar credenciales.
- **`users`**: Arreglo de usuarios locales (cuando `features.multiUser` está activo).
- **`apiTokens`**: Registro de tokens API con sus respectivos hashes y permisos.

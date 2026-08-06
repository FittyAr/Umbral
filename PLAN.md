# Plan de Implementación — Umbral 

> Documento de planificación para un dashboard intranet que centraliza los accesos a las herramientas internas de la empresa (Mattermost, Excalidraw, etc.) detrás de la VPN. Editable desde el navegador, sin base de datos.

---

## 1. Resumen

Una sola página que lista las apps internas como tarjetas con icono. La configuración vive en un JSON, los archivos subidos (logos, fondos, iconos) en disco, y un panel admin protegido con password permite editar todo sin tocar el contenedor.

**Principios**

- Lo más simple posible que funcione bien.
- Un solo binario / un solo container.
- Cero dependencias de runtime externas (sin DB, sin Redis, sin cloud).
- Guardar la config recarga la portada pública sin reiniciar.

---

## 2. Stack propuesto (recomendación firme)

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Astro 5 (SSR)** | Lo que pediste. SSG + islas hidratadas encaja perfecto: la portada puede ser prácticamente estática y solo el admin necesita JS. |
| Runtime | **Node 20 LTS** | Estable, Alpine base ≈ 50 MB. |
| Adaptador | **@astrojs/node (standalone)** | Single container, sin reverse proxy obligatorio. |
| Estilos | **Tailwind CSS v4** | Iteración rápida en admin. Alternativa: CSS plano + variables si querés cero build step de UI. |
| Interactividad admin | **Alpine.js** | Reordenamiento, modales, previews en vivo. 15 KB, cero compilación. |
| Hash de password | **bcrypt** (cost 12) | Probado y auditado. `argon2` también sirve pero requiere binario nativo. |
| Validación | **zod** | Schema-first, evita que un JSON corrupto tire la app. |
| Procesamiento de imagen | **sharp** | Redimensionar / comprimir al subir (un logo de 5 MB no tiene sentido). |
| Upload HTTP | **API routes nativas de Astro** (FormData) | Sin librería extra. |
| Sanitización SVG | **DOMPurify** (server-side con `jsdom` o `isomorphic-dompurify`) | Crítico si permitís subir SVG. |
| Detección MIME real | **file-type** | Verificar magic numbers, no confiar en la extensión. |
| Drag & drop | **Sortable.js** | Reordenar tarjetas y assets. |
| Contenedor | **Docker multi-stage Alpine** | Imagen final ~80 MB. |

**Por qué NO cada alternativa**

- ❌ Next.js / SvelteKit / Nuxt: demasiado para esto. Astro es ideal para "página + panel admin chico".
- ❌ Express + React separado: dobla el boilerplate.
- ❌ SQLite: dijiste "no base de datos". Además, para un JSON chico no aporta.
- ❌ Cloudflare / Vercel: lo querés on-prem en tu VPN.
- ❌ Vue / Svelte / React puro en el admin: innecesario. Alpine.js alcanza y no rompe el modelo mental de Astro.
- ❌ WebSockets / SignalR: no hace falta tiempo real, un F5 basta.

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────┐
│           Navegador del usuario              │
│   • Lee umbral público (sin auth)          │
│   • Lee /admin (con cookie de sesión)        │
└────────────────┬─────────────────────────────┘
                 │ HTTP
                 ▼
┌──────────────────────────────────────────────┐
│         Astro SSR (Node standalone)          │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │  Páginas   │  │  API Routes            │  │
│  │  /         │  │  POST /api/login       │  │
│  │  /admin    │  │  POST /api/logout      │  │
│  │            │  │  GET  /api/config      │  │
│  │            │  │  PUT  /api/config      │  │
│  │            │  │  POST /api/upload      │  │
│  │            │  │  GET  /api/assets/:f   │  │
│  └────────────┘  └────────────────────────┘  │
│       Middleware: chequea cookie             │
└────────────────┬─────────────────────────────┘
                 │ fs (lectura/escritura)
                 ▼
┌──────────────────────────────────────────────┐
│  /app/data  (volumen Docker)                 │
│   ├─ config.json                             │
│   └─ uploads/                                │
│        ├─ logo.png                           │
│        ├─ bg.jpg                             │
│        └─ icons/mattermost.svg               │
└──────────────────────────────────────────────┘
```

**Flujo de la portada pública**

1. Astro lee `data/config.json` en cada request (con cache en memoria, invalidado al guardar).
2. Renderiza meta + grid de tarjetas.
3. Assets servidos desde `/api/assets/<archivo>` con `Cache-Control: public, max-age=3600` (URL estable, contenido cacheable).

**Flujo del admin**

1. Login con password → cookie de sesión firmada (JWT con `SESSION_SECRET`).
2. Middleware valida la cookie en `/admin/*` y `/api/*` (excepto `/api/login`).
3. Forms envían a API routes → escriben `config.json` y/o suben archivos a `uploads/`.
4. Tras guardar, la portada pública se actualiza en el próximo request (cache invalidado).

---

## 4. Estructura del proyecto

```
Umbral/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro              # Portada pública
│  │  ├─ admin/
│  │  │  ├─ index.astro           # Login
│  │  │  └─ dashboard.astro       # Panel (CRUD + tema)
│  │  └─ api/
│  │     ├─ login.ts
│  │     ├─ logout.ts
│  │     ├─ config.ts             # GET / PUT
│  │     ├─ upload.ts             # POST multipart
│  │     └─ assets/
│  │        └─ [name].ts          # GET archivo subido
│  ├─ components/
│  │  ├─ Card.astro
│  │  ├─ Background.astro
│  │  ├─ Logo.astro
│  │  ├─ Search.astro             # filtro client-side
│  │  └─ admin/
│  │     ├─ CardEditor.astro
│  │     ├─ AssetUploader.astro
│  │     ├─ ThemeEditor.astro
│  │     └─ ConfirmDialog.astro
│  ├─ layouts/
│  │  ├─ PublicLayout.astro
│  │  └─ AdminLayout.astro
│  ├─ lib/
│  │  ├─ config.ts                # loadConfig / saveConfig (con cache)
│  │  ├─ auth.ts                  # hash, verify, session
│  │  ├─ upload.ts                # validación + sharp + guardar
│  │  ├─ assets.ts                # listar, borrar assets
│  │  └─ schema.ts                # zod schemas
│  ├─ middleware.ts               # chequeo de auth
│  └─ styles/
│     └─ global.css
├─ data/                          # volumen Docker (gitignored)
│  ├─ config.json
│  └─ uploads/
├─ public/
│  └─ favicon.svg
├─ Dockerfile
├─ docker-compose.yml
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## 5. Configuración (`data/config.json`)

```json
{
  "version": 1,
  "branding": {
    "companyName": "Acme Corp",
    "logo": "logo.webp",
    "favicon": "favicon.svg"
  },
  "theme": {
    "background": {
      "type": "image",
      "value": "bg.webp",
      "blur": 0,
      "overlay": 0.4,
      "overlayColor": "#000000"
    },
    "cardStyle": "glass",
    "accentColor": "#3b82f6",
    "textColor": "#ffffff",
    "fontFamily": "Inter",
    "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
    "colorMode": "auto"
  },
  "layout": {
    "columnsDesktop": 4,
    "columnsTablet": 3,
    "columnsMobile": 2,
    "cardSize": "medium",
    "showDescriptions": true
  },
  "categories": [
    { "id": "prod", "name": "Productividad", "icon": "briefcase" },
    { "id": "com",  "name": "Comunicación",  "icon": "chat" }
  ],
  "cards": [
    {
      "id": "uuid-1",
      "title": "Mattermost",
      "description": "Chat interno",
      "url": "https://mattermost.internal.acme",
      "icon": "icons/mattermost.svg",
      "category": "com",
      "openInNewTab": true,
      "color": "#1e88e5",
      "order": 0,
      "enabled": true
    }
  ]
}
```

**Decisiones de diseño**

- **`version`**: permite migraciones futuras del schema. La app detecta versión vieja y migra.
- **Categorías con `id` propio**: las tarjetas referencian por id, no por nombre, así podés renombrar sin romper nada.
- **`order` numérico**: reordenamiento por drag-and-drop lo modifica. Más simple que arrays.
- **`enabled: false`**: "archivar" una tarjeta sin borrarla (volver a usar después).
- **Colores por tarjeta**: atajo visual rápido para identificar apps de un vistazo.

---

## 6. Panel de administración

### 6.1 Login (`/admin`)

- Campo único: password.
- `POST /api/login` → valida contra hash bcrypt → setea cookie `HttpOnly`, `Secure`, `SameSite=Strict` con JWT firmado (`SESSION_SECRET`).
- CSRF token en form (header `X-CSRF-Token` en cada fetch).
- **Rate limit**: máx 5 intentos / minuto / IP (en memoria, suficiente para una sola instancia).

### 6.2 Dashboard (`/admin/dashboard`)

Tabs / acordeón:

1. **Branding** — company name, upload de logo, favicon.
2. **Tema** — tipo y archivo de fondo (imagen / color / gradiente), blur, overlay, color de acento, tipografía (selector con Google Fonts populares + opción "URL custom").
3. **Layout** — columnas por breakpoint, tamaño de card, mostrar/ocultar descripciones, modo de color (claro / oscuro / auto).
4. **Categorías** — CRUD (id, nombre, icono de set predefinido).
5. **Tarjetas** — CRUD completo + drag-and-drop para reordenar + búsqueda para filtrar.
6. **Avanzado** — export/import de `config.json`, reset a defaults, ver healthcheck, ver log de auditoría.

### 6.3 Subida de archivos

- Drag & drop o file picker.
- Validación en servidor (nunca confiar en cliente):
  - **Tipos permitidos**: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
  - **Tamaños**: máx 2 MB iconos, 5 MB background, 1 MB logo.
  - **Magic numbers** verificados con `file-type` (no alcanza con el header `Content-Type`).
- Procesamiento con `sharp`:
  - Logos → WebP optimizado, máx 256px ancho.
  - Backgrounds → WebP, máx 1920px ancho.
  - SVGs → NO se procesan con sharp, se sanitizan con DOMPurify antes de servir.
- Nombre de archivo: **UUID + extensión**. Nunca usar el nombre original (previene path traversal).
- **Listado de assets existentes** en el admin para poder reutilizar (no re-subir el mismo logo cinco veces).

### 6.4 Acciones de la portada (UX)

- Click en tarjeta → abre el link (en nueva tab si `openInNewTab: true`).
- Buscador arriba (`/` lo enfoca) filtra en cliente por título/descripción.
- Modo oscuro/claro/auto: toggle visible, persiste en `localStorage`.

---

## 7. Seguridad

| Vector | Mitigación |
|---|---|
| Password en plano | Hash bcrypt (cost 12) en el JSON, nunca en texto claro. |
| Brute force | Rate limit + backoff exponencial tras 5 fallos. |
| CSRF | Token aleatorio en sesión, validado en POST/PUT/DELETE. |
| XSS | Astro escapa por default. Para SVGs subidos: sanitizar con DOMPurify antes de servir inline. |
| Path traversal | UUID como nombre de archivo. Sanitizar `name` del request. |
| Upload malicioso | Whitelist MIME + magic numbers + antivirus opcional (ClamAV si querés overkill). |
| Session hijack | Cookie `HttpOnly` + `Secure` + `SameSite=Strict` + expiración 24 h. |
| Info leak | Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, CSP estricta. |
| Container escape | Usuario no-root en Dockerfile, `read_only: true` excepto `/app/data`, `cap_drop: [ALL]`. |
| MitM | Asumir TLS terminado en el reverse proxy (Traefik/Caddy). Documentar. |

---

## 8. Docker / despliegue

**Dockerfile** (multi-stage):

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine
RUN apk add --no-cache tini
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER app
EXPOSE 4321
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "./dist/server/entry.mjs"]
```

**docker-compose.yml**:

```yaml
services:
  umbral:
    build: .
    image: umbral:latest
    container_name: umbral
    restart: unless-stopped
    ports:
      - "3000:4321"
    environment:
      - PORT=4321
      - HOST=0.0.0.0
      - SESSION_SECRET=changeme-min-32-chars-recomendado
      - INITIAL_PASSWORD=admin          # opcional, se hashea al primer arranque
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:4321/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

**Notas de despliegue**

- **Primer arranque**: si `data/config.json` no existe, se crea con valores default. Si está `INITIAL_PASSWORD`, se hashea y guarda en el JSON. Si no, se genera uno random y se loguea una sola vez en stdout (anotalo y cambialo).
- **Cambiar password**: endpoint `POST /api/password` con auth (rotación).
- **Detrás del reverse proxy**: configurar `X-Forwarded-For` para que el rate limit use la IP real del cliente (no la del proxy).
- **Subdominio** (`home.acme.internal`): opcionalmente `BASE_URL` para que cookies y OG tags apunten ahí.
- **HTTPS**: terminado en el reverse proxy. La app no expone TLS (más simple, menos superficie).

---

## 9. Funcionalidades que podrías estar olvidando

Priorizadas. Copiá las que te interesen al backlog.

### 🟢 Alta (incluir en v1)

- [ ] **Reordenamiento drag-and-drop** de las tarjetas (Sortable.js). (IMPLEMENTAR)
- [ ] **Categorías / grupos** con título y rejilla propia.  (IMPLEMENTAR)
- [ ] **Toggle "abrir en nueva pestaña"** por tarjeta. (IMPLEMENTAR)
- [ ] **Color personalizado por tarjeta** (identificación visual rápida). (IMPLEMENTAR)
- [ ] **Descripción corta** por tarjeta (subtítulo o tooltip). (IMPLEMENTAR)
- [ ] **Búsqueda / filtrado** client-side (input arriba; shortcut `/` para enfocar).  (IMPLEMENTAR)
- [ ] **Modo claro / oscuro / auto** (auto según hora del sistema). (IMPLEMENTAR)
- [ ] **Responsive** (mobile, tablet, desktop) — clave si los usuarios acceden desde el celu vía VPN. (IMPLEMENTAR)
- [ ] **Favicon y meta tags** (OG image con el logo, para previews en Mattermost/Slack). (IMPLEMENTAR)
- [ ] **Healthcheck endpoint** (`/api/health`) — el orquestador sabe si responde. (IMPLEMENTAR)
- [ ] **Export / import de `config.json`** desde el admin (backup manual con un click). (IMPLEMENTAR)
- [ ] **Reset a defaults** con confirmación (modal pidiendo escribir "RESET"). (IMPLEMENTAR)
- [ ] **Empty state** amable con botón "+ Agregar primera tarjeta". (IMPLEMENTAR)
- [ ] **Listado de assets existentes** en el uploader (reusar, no re-subir). (IMPLEMENTAR)
- [ ] **Vista previa en vivo** mientras se edita el tema (iframe o recuadro al costado). (IMPLEMENTAR)

### 🟡 Media (considerar para v1.1)

- [ ] **PWA instalable** (manifest + service worker). Cómodo para "instalar" en el celular. (IMPLEMENTAR)
- [ ] **Status check por tarjeta** (ping al `url`, badge verde/rojo). Útil pero consume recursos si hay muchas apps. (IMPLEMENTAR)
- [ ] **Icon picker** con set curado (Lucide / Heroicons) además de upload — acelera la carga inicial. (IMPLEMENTAR)
- [ ] **Cropper de imagen** integrado (Cropper.js) para ajustar logos y fondos. (IMPLEMENTAR)
- [ ] **Historial de cambios** simple (`data/audit.log` append-only con timestamp + acción). (IMPLEMENTAR)
- [ ] **Atajos de teclado**: `/` para buscar, `Esc` para cerrar modales, `n` para nueva tarjeta. (IMPLEMENTAR)
- [ ] **i18n** (es/en) si la empresa es multi-idioma. (IMPLEMENTAR)
- [ ] **Borrado de assets no usados** (botón "limpiar huérfanos" en Avanzado). (IMPLEMENTAR)
- [ ] **Backup automático** rotativo (cron interno que copia `data/` a `data/backups/YYYY-MM-DD/`). (IMPLEMENTAR)

### 🔴 Baja (probablemente NO hace falta)

- [ ] Auth con LDAP / OIDC. Para una VPN interna, el password único alcanza. (NO IMPLEMENTAR)
- [ ] Analytics / tracking de clicks. No aporta a tu caso de uso. (NO IMPLEMENTAR)
- [ ] Webhooks / notificaciones. Es un dashboard, no un sistema reactivo. (NO IMPLEMENTAR)
- [ ] Roles / multi-tenant. Es un solo cliente. (NO IMPLEMENTAR)
- [ ] Comentarios / ratings en tarjetas. (NO IMPLEMENTAR)
- [ ] API pública para terceros. (NO IMPLEMENTAR)

---

## 10. Decisiones que conviene tomar antes de empezar

1. **¿Tailwind o CSS plano?** Recomiendo Tailwind para iterar rápido; CSS plano si querés 0 build de UI. (Tailwind)
2. **¿Alpine.js o vanilla JS en el admin?** Alpine si querés declarative (recomendado). Vanilla si querés 0 dependencias. (Alpine)
3. **¿Set de iconos predefinido además de upload?** Recomiendo sí (Lucide) — la primera carga sin assets propios es más amable. (Si, con set de iconos)
4. **¿TLS en el container o en el reverse proxy?** Reverse proxy. El container queda minimal.  (Si reverse proxy)
5. **¿Detrás de qué reverse proxy va?** Traefik / Caddy / Nginx. Documentar los headers a propagar. (El recomendado para este caso de uso)
6. **¿Subdominio o path?** Recomiendo subdominio (`home.acme.internal`), más limpio para PWA. (Subdominio dejalo como un parametro de configuracion, tambien compatible con ingreso por ip)
7. **¿Tamaño máximo del equipo?** Si son 5 personas el rate limit y la auth son burocracia inútil. Ajustar. (Es una pagina de consulta de urls no importa cantidad de usuarios)

---

## 11. Roadmap de implementación

Estimado: **2–3 días de un dev con experiencia** en Node/Astro.

### Fase 1 — Esqueleto (½ día)
- `npm create astro@latest` con TypeScript strict.
- Agregar `@astrojs/node` (standalone) + `tailwindcss` + `alpinejs`.
- Crear estructura de carpetas.
- `data/config.json` con valores seed (seed de ejemplo con Mattermost, Excalidraw).
- `PublicLayout` + `index.astro` que renderice el JSON (versión estática, sin estilo fino).

### Fase 2 — Estética pública (½ día)
- Componentes `Logo`, `Background`, `Card`.
- Estilos base con Tailwind.
- Responsive con CSS grid (`grid-cols-{N}` por breakpoint).
- Toggle de modo claro/oscuro.

### Fase 3 — Admin (1 día)
- Middleware de auth.
- `/admin` (login form + handler).
- `/admin/dashboard` con tabs (Alpine.js para mostrar/ocultar).
- API routes: `login`, `logout`, `config` (GET/PUT), `upload`, `assets/[name]`, `password`.
- CRUD de tarjetas con Alpine.js.
- Drag-and-drop con Sortable.js.
- Upload con drag-and-drop + preview.
- Vista previa en vivo del tema.

### Fase 4 — Seguridad + pulido (½ día)
- CSRF token.
- Rate limit en login (Map en memoria con TTL).
- Headers de seguridad (helmet-like).
- Sanitización de SVG con DOMPurify.
- Validación de uploads (MIME + magic numbers con `file-type` + tamaño).
- Empty states, loadings, toasts de éxito/error.

### Fase 5 — Docker (¼ día)
- Dockerfile multi-stage.
- `docker-compose.yml` con volumen, healthcheck, `read_only`, cap_drop.
- `tini` como PID 1.
- README con instrucciones de primer arranque y cambio de password.

### Fase 6 — QA (½ día)
- Probar con 1, 5, 20 tarjetas.
- Probar mobile / tablet / desktop.
- Probar uploads maliciosos (SVG con `<script>`, .exe renombrado a .png).
- Probar reset, export, import.
- Probar recuperación si `config.json` se borra (debe regenerarse con defaults).

---

## 12. Riesgos y trade-offs

- **Sin DB → sin deshacer fino**: el `audit.log` ayuda a entender qué pasó, pero no rollback. Si te preocupa, cada save puede escribir un timestamped `config.YYYYMMDD-HHMM.json` (1 línea de código, 1 KB cada vez).
- **Cache en memoria con una sola instancia**: si escalás a 2 réplicas, cada una tiene su cache. Para tu caso (VPN, tráfico bajo) no aplica.
- **Assets servidos por Node**: para tráfico alto conviene nginx sirviendo `/data/uploads/` directo. Para esta app, sobra.
- **Astro SSR requiere proceso Node**: si querés imagen estática pura, tendrías que generar el HTML en build time y leer el config al build → perdés la edición en caliente. No vale la pena acá.
- **SVG sanitizado pierde features**: sanitizar puede romper SVGs complejos con `<use>`, `<filter>`, etc. Si pasa, permitir SVGs solo en iconos "confiables" y exigir PNG para los demás.

---

## 13. Próximo paso

Si te cierra, arranco con la **Fase 1** (esqueleto Astro + config seed + layout público básico). 

Si querés cambiar algo del stack (por ejemplo, no usar Tailwind, o querer SvelteKit, o saltarte el rate limit), avisame y ajusto el plan antes de tirar código.

# Arquitectura

> Cómo está organizado el código, qué hace cada pieza, cómo se conectan.

## Vista general

```
                          ┌─────────────────────────┐
                          │   Browser (usuario)     │
                          └────────────┬────────────┘
                                       │ HTTPS (Caddy/Nginx)
                                       ▼
                          ┌─────────────────────────┐
                          │   Astro SSR (Node 20)   │
                          │   ├─ middleware.ts      │
                          │   ├─ pages/             │
                          │   │  ├─ index.astro     │ ← portada
                          │   │  ├─ admin/          │ ← panel
                          │   │  └─ api/            │ ← REST
                          │   └─ lib/               │
                          └────────────┬────────────┘
                                       │ fs.read/write
                                       ▼
                          ┌─────────────────────────┐
                          │   /app/data/            │
                          │   ├─ config.json        │
                          │   ├─ uploads/           │
                          │   └─ audit.log          │
                          └─────────────────────────┘
```

Single process, single filesystem, zero external dependencies (no DB, no Redis, no message queue).

## Capas

### 1. `middleware.ts`

Entry point de cada request. Responsabilidades:

- **Auth check** — si la ruta es `/admin/*` o `/api/*` (salvo públicas), valida la cookie de sesión.
- **CSRF check** — para mutaciones, valida el header `x-csrf-token`.
- **Body caps** — rechaza bodies > 1MB (config/import) o 10MB (upload) antes de leerlos.
- **Client IP** — extrae IP del header `X-Forwarded-For` (si está confiado) o `X-Real-IP` para rate limit.
- **Https detection** — para HSTS.
- **Security headers** — aplica CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS a la response.

Rutas públicas (sin auth):
- `GET /` — portada.
- `GET /admin` — login.
- `POST /api/login` — autenticación.
- `GET /api/health` — healthcheck.
- `GET /api/assets/*` — descargar assets.

### 2. `pages/`

Rutas Astro. Cada archivo es una ruta basada en el nombre.

- `index.astro` — portada pública. Server-rendered con la config actual. Alpine.js para interactividad (tema, búsqueda).
- `admin/index.astro` — formulario de login.
- `admin/dashboard.astro` — panel con tabs (Alpine.js). Estado local, sync a `/api/config` en **Guardar cambios**.
- `api/*.ts` — endpoints REST. Cada uno exporta funciones `GET`/`POST`/`PUT`/`DELETE` que devuelven `Response`.
- `404.astro`, `500.astro` — error pages.

### 3. `lib/`

Lógica de negocio. Sin dependencias de Astro (en general), fácil de testear.

#### `schema.ts`

Zod schemas para todo lo que toca el config. Una fuente de verdad para:

- `BrandingSchema`, `ThemeSchema`, `LayoutSchema`
- `CategorySchema`, `CardSchema`
- `SecuritySchema` y sub-schemas (Session, Auth, Uploads, Network, Headers)
- `ConfigSchema` (top-level)
- `ConfigUpdateSchema` (lo que acepta `PUT /api/config` — strict, sin `auth`/`_meta`)

Todos los inputs externos (config del JSON, body de API) pasan por `safeParse` o `parse` antes de usarse.

#### `config.ts`

Load/save/audit del config.

- `defaultConfig()` — la factory de defaults. Lo que se usa en el primer boot y en la migración.
- `getConfig()` — read-through cache (5s TTL).
- `saveConfig(update)` — deep-merge con el actual, valida, escribe atómicamente (`.tmp` + rename), invalida cache.
- `resetConfig()` — vuelve a defaults (preserva auth).
- `importConfig(cfg)` — reemplazo total (usado por `/api/import`).
- `updateAuth(hash, csrf)` — rota CSRF + bump auth epoch.
- `audit(action, detail?)` — append al audit log con lock chain para serializar escrituras.

**Cache** es en memoria, una sola instancia. Para multi-instance (PM2 cluster, k8s replicas), habría que cambiarlo por filesystem watch + invalidation broadcast.

#### `auth.ts`

Password, sessions, CSRF.

- `hashPassword(plain)` — bcrypt cost 12.
- `verifyPassword(plain, hash)`.
- `generateToken(bytes)` — crypto random hex.
- `getSecret()` — `SESSION_SECRET` con cache en module-level (importante: era random por call antes, ahora se cachea).
- `createSessionToken(id, epoch)` — HMAC-SHA256 de `<id>.<epoch>` con `getSecret()`.
- `verifySessionToken(token, currentEpoch)` — verifica firma + match de epoch.
- `buildSessionCookie(token, ttlSec, sameSite, secure)` — serializa `Set-Cookie`.
- `clearSessionCookie()` — serializa cookie con `Max-Age=0`.
- `buildAuthContext(request)` — parsea cookie, verifica, devuelve `{ isAuthenticated, csrfToken }` para `Astro.locals.auth`.
- `CSRF_HEADER = 'x-csrf-token'`.
- `KNOWN_WEAK_SECRETS` — set de secrets que la app rechaza (default "change-me", etc).

**Epoch trick:** el session token incluye el `authEpoch` con el que fue emitido. Al verificarlo, si no matchea el actual, la sesión es inválida. Esto cierra el gap de "cambié la password pero las sesiones viejas siguen vivas" — antes sólo se rotaba el CSRF, la session token seguía siendo válida hasta expirar.

#### `http.ts`

Helpers para endpoints + security headers.

- `json(data, init?)` — `Response` con `Content-Type: application/json`.
- `error(msg, status, init?)` — `Response` con `{ error: msg }`.
- `readJson(request)` — parsea body JSON con cap.
- `applySecurityHeaders(headers, opts)` — escribe CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS en los headers de la response.
- `SecurityHeaderOptions` interface.

#### `upload.ts`

Procesamiento de assets subidos.

- `processAndStore(file, kind, cfg)` — recibe el File del multipart, valida MIME, procesa con sharp (resize + WebP), sanitiza SVG con DOMPurify, guarda en `/api/assets/`.
- `svgNoScripts` — stripper mínimo de tags peligrosos para SVG (defensa en profundidad, además de DOMPurify).
- `stripSvgBom` — saca el BOM UTF-8 al inicio del SVG.

**Pipeline:**

1. Lee los primeros bytes → `file-type` detecta MIME real (no confía en el del cliente).
2. Compara contra `cfg.security.uploads.allowedMimeTypes` (whitelist `^image/`).
3. Si es SVG y `cfg.security.uploads.sanitizeSvg`, pasa por DOMPurify.
4. Si `cfg.security.uploads.processImages`, sharp redimensiona según `kind` (logo=512, icon=128, favicon=64, background=1920) y convierte a WebP.
5. Guarda con nombre hasheado (`<kind>-<timestamp>-<random>.webp`).

#### `assets.ts`

CRUD de assets (sin el upload en sí).

- `listAssets(cfg)` — lista `data/uploads/`, calcula `usedBy` (dónde se referencia cada asset).
- `deleteAsset(name, cfg)` — borra un asset. Verifica que no esté en uso (carga config fresca con `_invalidate` para evitar TOCTOU).
- `findAssetRefs(cfg, name)` — helper para encontrar referencias.

#### `icon-url.ts` / `icon-pack-names.ts`

Resolución de íconos, partida para no meter `node:fs` en el bundle del browser.

- `icon-url.ts` — `resolveIconUrl()`, `resolveCardIconUrl()`, constantes del ícono de Documentación (`/system/docs.svg`). Seguro en cliente.
- `icon-pack-names.ts` — `getAvailableIconNames()` lista packs en `data/icon-packs/` (solo API / frontmatter SSR).
- `icons.ts` — re-export de `icon-url.ts` (sin filesystem).
- Nombre reservado `system/docs` (y la card de sistema `id=docs` / URL `/docs*`) → `/system/docs.svg` en `public/system/docs.svg`. No depende de icon packs; no reintroduce el catálogo built-in de `/icons/*.svg`.

#### `system-card.ts`

La card **Documentación** (`id: 'docs'` o `url` `/docs*`) es del sistema.

- Campos protegidos: `title`, `description`, `url`, `icon`, `color`, `category`, `order`, `openInNewTab`, `healthCheck`, `kind`, `id`. **`enabled` sí se puede cambiar** (ocultar/mostrar).
- `saveConfig` **revierte** esos campos al valor persistido en vez de fallar el save. Así un reorder global que toque `docs.order` no bloquea el PUT.
- El cliente restaura los mismos campos desde `original` antes de enviar, y no permite arrastrar ni cambiar de categoría la card de sistema. El `order` de las demás cards se numera *alrededor* del `order` congelado de docs.

#### `cards-admin.ts`

Tab Tarjetas: grupos + drop-zones. Cards sueltas (fuera de una categoría con título) usan **categorías fantasma**:

- `Category.isGhost: true` — id kebab-case autogenerado (`ghost-…`), `name`/`icon` vacíos. No es un sentinel único: cada hueco entre grupos puede ser su propio ghost, así el orden global puede ser `grupo A → sueltas → grupo B → más sueltas`.
- No se listan en el tab Categorías (no son editables). En la portada renderizan el `.grid` **sin** `.category-header`.
- Vacías se auto-eliminan (`pruneEmptyGhosts`); dos ghosts consecutivos se fusionan.
- En el admin, drop-zones `__gap__` (DOM-only, no se persisten) entre grupos reales y al inicio/fin. Al soltar una card se crea o reusa un ghost. Cada lista Sortable tiene un filler in-flow (no vacío) y `draggable: '.card-item'`, para que SortableJS no recorra huecos vacíos en `dragover` (`lastChild` de `null`).
- El selector de categoría incluye **Sin grupo** (`__ungrouped__`, no persistido).
- Huérfanas de verdad (categoría borrada que ya no existe) siguen en el bucket `__orphan__` al final. `removeCategory` no reasigna cards de sistema ni cards que viven en ghosts.

Tab **Tarjetas** (inline en `dashboard.astro`): lista agrupada por categoría con SortableJS cross-group y gaps. Lógica pura en `lib/cards-admin.ts` (`cardGroups`, `adminCardsLayout`, `moveCardToCategory`, `moveCardToUngrouped`, `syncOrderFromDom`).

### 4. `components/`

Astro components reusables.

- `Card.astro` — render de una tarjeta.
- `Logo.astro` — render del logo (imagen o inicial fallback).
- `Search.astro` — input de búsqueda con Alpine.
- `Background.astro` — div de fondo con image/gradient/color.
- `ThemeScript.astro` — script inline para modo claro/oscuro + atajos de teclado.

**Admin tabs (modularizados en `src/components/admin/`):**

- `theme/ThemePanel.astro` — tab Tema con sidebar de secciones + `ThemePreview.astro` (preview en vivo del theme).
- `layout/LayoutPanel.astro` — tab Layout con form en dos columnas + `LayoutPreview.astro` (preview de grilla con conmutador mobile/tablet/desktop).
  - Campos de layout en `LayoutSchema`: columnas por breakpoint, `gap`, `maxWidth`, `gridAlign`, `cardSize`, `cardRadius`, `compact`, `showDescriptions`, `healthCheckInterval`.
  - Variables CSS inyectadas en `.page-wrap` vía `PublicLayout`: `--grid-gap`, `--content-max-width`, `--card-radius`, `--cols-*`.
- Tab **Tarjetas** (inline en `dashboard.astro`): ver `cards-admin.ts` arriba (grupos, ghosts, gaps).

### 5. `layouts/`

- `PublicLayout.astro` — wrap de la portada. Inyecta CSS vars del theme, font, background, OG meta, ThemeScript.
- `AdminLayout.astro` — wrap del panel. Inyecta el `umbralAdmin` global (api wrapper, toast) y el nav de admin.

## Flujo de un request

### GET / (portada)

```
Browser
  └─→ Caddy (TLS + reverse proxy)
       └─→ Astro middleware
            ├─ isPublic('/') → sí
            ├─ getConfig() → cached
            ├─ detectHttps() → true (si está detrás de Caddy + BASE_URL)
            └─ next() → pages/index.astro
                 ├─ getConfig() (cached)
                 ├─ PublicLayout con theme vars
                 └─ Render: <html> con background, header, cards, search
  ← 200 + HTML + CSP + HSTS
```

### POST /api/login

```
Browser
  └─→ Caddy
       └─→ Astro middleware
            ├─ isPublic('/api/login') → sí (no auth)
            ├─ CSRF: csrfPolicy='mutations' + POST → requiere CSRF
            │   └─ pero el endpoint de login es excepción (lo ignora
            │      si no hay sesión, ver código)
            └─ next() → pages/api/login.ts
                 ├─ readJson(body) → { password }
                 ├─ verifyPassword(password, cfg.auth.passwordHash)
                 │   └─ bcrypt.compare
                 ├─ rotateCsrfOnLogin (si está activado)
                 │   └─ updateConfig con nuevo CSRF
                 ├─ createSessionToken(randomId, cfg.auth.authEpoch)
                 │   └─ HMAC-SHA256(getSecret(), id.epoch)
                 ├─ buildSessionCookie(token, ttl, sameSite, secure)
                 └─ json({ ok, csrfToken }) + Set-Cookie
  ← 200 + Set-Cookie + CSRF header
```

### PUT /api/config (admin edita)

```
Browser (Alpine adminApp)
  └─→ Astro middleware
       ├─ /api/* → requiere auth
       ├─ PUT + csrfPolicy='mutations' → requiere CSRF
       └─ next() → pages/api/config.ts
            ├─ readJson(body)
            ├─ ConfigUpdateSchema.safeParse(body)
            │   └─ si falla → 400 con detalle
            ├─ saveConfig(parsed)
            │   ├─ getConfig() (cached)
            │   ├─ deep-merge (auth, _meta descartados)
            │   ├─ ConfigSchema.parse (re-validate)
            │   ├─ writeFile(.tmp) + rename (atómico)
            │   └─ invalidate() (clear cache)
            ├─ audit('config_update')
            └─ json(updated)
  ← 200 + JSON
```

### GET /api/assets/<name> (browser carga un asset)

```
Browser (img src="/api/assets/foo.webp")
  └─→ Astro middleware
       ├─ isPublic('/api/assets/foo.webp') → sí
       └─ next() → pages/api/assets/[name].ts
            ├─ Sanitiza `name` (no `..`, no `/`)
            ├─ fs.stat(path)
            ├─ fs.readFile + Content-Type según extensión
            └─ Response con Cache-Control: public, max-age=31536000, immutable
  ← 200 + binary + Cache-Control
```

## Decisiones de diseño

### ¿Por qué filesystem + JSON, no SQLite?

- **Cero ops.** No hay que migrar schema, no hay que hacer backup de una DB aparte, no hay que tunear WAL.
- **Trivial de inspeccionar.** `cat data/config.json` y listo.
- **Trivial de versionar.** Si querés, podés tener el config en git (sin el `auth` block) y deployar con un `git pull`.
- **Trivial de portar.** Copiá `data/` a otro server y listo.

Tradeoff: **no escala a multi-instance**. Si querés correr 2+ replicas detrás de un load balancer, la escritura concurrente se va a pelear. Solución: cambiar a un SQLite, o sticky sessions, o `git pull`-based deploys.

### ¿Por qué Zod?

- **Runtime + compile-time.** TypeScript no valida en runtime (los datos del JSON podrían tener lo que sea). Zod hace ambas.
- **Una fuente de verdad.** El schema genera el tipo (`z.infer<typeof X>`) — no hay que duplicar la interface.
- **Errores claros.** `.safeParse` devuelve issues con path, perfecto para devolver mensajes útiles al admin.

### ¿Por qué Alpine, no React/Vue?

- **No build step.** Alpine se inyecta como `<script>` y se usa con directivas en HTML. Astro no necesita configurar JSX/TSX.
- **Bundle chiquito.** ~15 KB minified.
- **Suficiente para esto.** El admin es formularios, drag-and-drop, modals. No necesitamos un framework full.
- Tradeoff: si la app crece mucho en complejidad, migrar a Preact/Solid sería razonable.

### ¿Por qué bcrypt cost 12?

- 2^12 = 4096 iteraciones. ~250ms en un CPU moderno.
- OWASP recomienda >= 10 en 2024.
- Suficientemente lento para mitigar fuerza bruta, suficientemente rápido para no molestar al usuario en login.

### ¿Por qué session token con epoch?

Cierra el gap "cambié la password pero las sesiones viejas siguen vivas". El epoch se incrementa en cada `updateAuth`, y los tokens viejos (con epoch anterior) no verifican.

Alternativas:
- **Session store en el server** (Redis, DB) — más complejo, otra pieza que mantener.
- **Tokens de corta duración + refresh** — más complejo que el epoch trick.

El epoch es **1 int por token** (32 bits en el HMAC). Gratis.

## Lo que **no** está

- **Tests automatizados.** El proyecto es chico y la lógica es determinística. Si crece, agregar Vitest.
- **Multi-user.** Un solo password compartido.
- **Webhooks salientes.** Para integración con monitoring, polling a `/api/health`.
- **API versionada.** `/api/` sin `/v1/`. Cambios breaking vendrán con major version.
- **Cluster mode.** Single process. Si lo metés en PM2 cluster, la cache en memoria se desincroniza entre workers.
- **Rate limit en `/api/config` y otros.** Sólo en `/api/login`. Asumimos que el reverse proxy hace rate limit general.

## Performance

- **Config cache:** 5s TTL, una lectura. Save lo invalida.
- **Íconos cache:** 60s TTL en memoria.
- **HTML render:** Astro SSR, sin SSG. Cada request lee el config del cache.
- **Sharp:** procesamiento lazy, sólo en upload.
- **Static assets:** con hash de Vite, `Cache-Control: immutable, max-age=1y`.

Para una intranet con < 100 usuarios, sobra.

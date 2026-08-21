# AGENTS.md — Convenciones del proyecto Umbral

> Archivo de referencia para los agentes AI (Codex / Claude / Cursor) y para
> cualquier colaborador humano que abra un PR. Léelo antes de tocar código.

## 1. Resumen del proyecto

**Umbral** es un portal self-hosted para accesos rápidos a servicios internos
detrás de una VPN. Se edita desde un panel admin simple, **sin base de datos**
(el config es un `data/portals/default/config.json` plano). Stack principal:

- **Astro 7** (output `server` con adapter `@astrojs/node`) + Alpine.js en el cliente.
- **TypeScript** estricto, validaciones con **Zod**.
- **Alpine.js 3** + **SortableJS** + **DOMPurify** + **marked** para Markdown.
- **Tailwind v4** vía `@tailwindcss/vite` (sólo para tooling; la mayoría de los
  estilos son CSS plano en `src/styles/`).
- **bcryptjs**, **otpauth**, **sharp**, **qrcode**, **adm-zip** en backend.
- **jsdom** se usa server-side para renderizar Markdown sanitizado en cards.

## 2. Ramas y flujo de trabajo

El repo tiene **una rama huérfana** (`gh-pages`) que sólo contiene el build
estático del demo público montado en GitHub Pages
(`https://umbral.fitty.ar/`). El resto del desarrollo vive en `main` (o en
ramas de feature creadas desde `main`).

### Reglas duras

1. **Nunca trabajar directo en `gh-pages`.** Toda implementación, fix o
   feature nueva se hace en `main` (o en una feature branch desde `main`).
2. **Después de probar y mergear**, se actualiza la rama `gh-pages` con el
   build demo correspondiente (ver §3).
3. **Nunca pushear `dist/` ni archivos del build a `main`.** El build se
   regenera en cada deploy.
4. **`main` siempre debe buildear y los smoke tests del CI deben pasar.**
   Si rompés el build, no mergeamos.

### Workflow típico

```bash
# 1) Empezar una feature
git checkout main && git pull
git checkout -b feat/<nombre-descriptivo>

# 2) Desarrollar y commitear
git add -A && git commit -m "feat: ..."

# 3) Push + PR a main
git push -u origin HEAD
# Abrir PR en GitHub → esperar CI verde → mergear

# 4) Actualizar gh-pages con la demo (ver §3)
```

## 3. Cómo se actualiza la rama demo `gh-pages`

La rama `gh-pages` se deploya automáticamente vía GitHub Actions
(`.github/workflows/deploy-pages.yml`) cada vez que se pushea código a esa
rama. Es **estática** (no corre el server Node) y todo el backend se simula
client-side con `public/demo-runtime.js` (intercepta `window.fetch` y
responde desde `localStorage` con un TTL de 15 min).

### Procedimiento para actualizar el demo

Hay **dos formas** soportadas:

#### Opción A — Cherry-pick / merge selectivo (recomendado)

1. Asegurarse de que `main` tiene los cambios y el CI está verde.
2. Checkout `gh-pages` y traer los archivos relevantes:

   ```bash
   git checkout gh-pages
   # Estos son los archivos que normalmente cambian entre main y gh-pages:
   git checkout main -- \
     astro.config.mjs \
     public/demo-runtime.js \
     src/layouts/PublicLayout.astro \
     src/layouts/AdminLayout.astro \
     src/components/Card.astro \
     src/components/LanguageSwitcher.astro \
     src/pages/index.astro \
     src/pages/[category].astro \
     src/pages/404.astro \
     src/pages/500.astro \
     src/pages/docs/index.astro \
     src/pages/docs/[...slug].astro \
     src/pages/admin/index.astro \
     src/pages/admin/dashboard.astro \
     src/lib/config.ts
   ```

3. **Regenerar el build**:

   ```bash
   rm -rf dist
   npm ci
   npm run gen:icons
   npm run build
   ```

4. Commitear y pushear:

   ```bash
   git add -A
   git commit -m "demo: bump from main @ <commit-sha>"
   git push origin gh-pages
   ```

   GitHub Actions redeploy automáticamente a `https://umbral.fitty.ar/`.

#### Opción B — Build local con la rama `gh-pages`

Simplemente trabajar en `gh-pages` cuando el cambio es **exclusivamente del
demo** (ej: ajustar textos del banner, agregar packs de íconos mockeados,
cambiar el seed config). **No** recomendado para cambios estructurales que
deban vivir en `main`.

### Estado conocido de la rama `gh-pages`

- `astro.config.mjs` usa `output: 'static'`.
- Las páginas tienen `export const prerender = true` (o un wrapper de
  `getStaticPaths()` para las rutas dinámicas).
- **No** existe `src/pages/api/` — todas las llamadas a `/api/*` son
  interceptadas por `public/demo-runtime.js`.
- `src/pages/admin/dashboard.astro` tiene `isAuthed = true` hardcodeado (no
  redirige a `/admin` aunque no haya sesión).
- El seed del config tiene **AI, status, iconPacks y qr forzados a
  `enabled: false`** por `demo-runtime.js` (ver `DEMO_FORCE_DISABLE_FEATURES`).

## 4. Convenciones de código

- **TypeScript estricto.** Sin `any` salvo justificación con comentario.
- **Feature flags** viven en `src/lib/features.ts`. Cualquier feature nueva
  debe declararse ahí (con `FEATURE_META`) y gatearse en server Y en UI.
- **Validación de config** se hace con Zod en `src/lib/schema.ts`. Si
  agregás un campo, agregalo al schema.
- **Estilos** en CSS plano bajo `src/styles/`. Los nombres de variables CSS
  usan kebab-case con prefijos semánticos (`--accent`, `--text`, `--border`,
  etc.).
- **Comentarios** cortos y sólo cuando aclaran algo no obvio. **No** comentar
  lo obvio.
- **i18n** via `src/i18n/`. Si agregás un string visible al usuario,
  agregalo a `es.ts`, `en.ts` y `pt.ts`.
- **No** incluir secretos en el repo. La password inicial es `admin` por
  default y se loguea un warning al arrancar.

## 5. Verificación local antes de pushear

Antes de abrir un PR a `main`, validar:

```bash
# Build de producción (server-side)
npm run build

# Smoke test del server arrancado (ver .github/workflows/ci.yml)
INITIAL_PASSWORD=test-1234 SESSION_SECRET=test-secret-which-is-long-enough \
  node ./dist/server/entry.mjs &
sleep 4
curl -fsS -o /dev/null -w "GET / -> %{http_code}\n" http://127.0.0.1:4321/
curl -fsS http://127.0.0.1:4321/api/health
kill %1
```

Para el demo estático (en rama `gh-pages`):

```bash
# Build estático
npm run build
# Servir localmente y abrir http://127.0.0.1:8000/
npx http-server dist -p 8000
```

## 6. Cosas que **no** se hacen en este repo

- **No** commitear `dist/`, `node_modules/`, `data/uploads/`, ni
  `*.local.*` (ver `.gitignore`).
- **No** agregar nuevas dependencias npm sin discutirlo (preferimos
  vanilla JS / Web APIs cuando es viable).
- **No** cambiar `prerender = false` en páginas que tienen que estar
  disponibles en build estático (`/docs/*`, etc.).
- **No** mover el secret de CSRF a un archivo trackeado.
- **No** commitear `data/portals/*/config.json` con datos sensibles reales
  (el `data/portals/default/config.json` puede vivir en el repo porque es
  el default de demo, pero los overrides por portal NO).

## 7. Recursos

- **Documentación interna**: carpeta `docs/` (instalación, configuración,
  uso, dev). Cada `.md` se sirve en `/docs/<sección>/<archivo>`.
- **Skills** específicas del proyecto: `.agents/skills/` (release-umbral,
  etc.).
- **CHANGELOG.md**: se mantiene por release-drafter.

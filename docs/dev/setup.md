# Setup de desarrollo

> Cómo correr el proyecto en local para modificarlo. Asumimos Node 24 LTS (Astro 7 requiere ≥22.12, usamos 24 porque es la LTS más reciente y estable).

## Prereqs

- **Node.js 20+** (LTS actual).
- **npm 10+**.
- **Git**.
- Un editor decente (VSCode, Zed, o lo que uses).
- (Opcional) **Docker** para probar el container después de los cambios.

## Setup

```bash
# 1. Clonar
git clone https://github.com/FittyAr/Umbral.git umbral
cd umbral

# 2. Instalar deps
npm install

# 3. Variables de entorno
cp .env.example .env
# Editá .env: al menos SESSION_SECRET y INITIAL_PASSWORD
$EDITOR .env

# 4. Generar íconos predefinidos
npm run gen:icons
# (corre solo en predev y prebuild también)

# 5. Dev server
npm run dev
# → http://localhost:4321
```

Astro tiene HMR (hot module reload) — los cambios en `.astro`, `.ts`, `.css` se ven al instante. Cambios en `astro.config.mjs`, `tsconfig.json` o `package.json` requieren reiniciar el dev server.

## Scripts npm

| Script | Qué hace |
|---|---|
| `npm run dev` | Astro dev server con HMR. |
| `npm run build` | `gen:icons` + `astro build` → `dist/`. |
| `npm run preview` | Sirve `dist/` con el adapter de Node. Útil para testear el build antes de Docker. |
| `npm start` | `node ./dist/server/entry.mjs` (lo que corre en el container). |
| `npm run gen:icons` | Regenera los íconos Lucide predefinidos en `public/icons/`. |
| `npm test` | Corre toda la suite: `test:astro` (vitest) y después `test:node` (`node --test`). |
| `npm run test:astro` | `vitest run` sobre los tests que importan de `vitest`. |
| `npm run test:node` | `node scripts/run-node-tests.mjs`: el resto de los tests con `node --test`. |
| `npm run typecheck` | `tsc --noEmit`. Tiene que quedar en 0 errores. |
| `npm run astro` | Acceso directo a la CLI de Astro. |

## Estructura

```
.
├── astro.config.mjs        # Config de Astro + Tailwind
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
├── public/                 # Assets estáticos servidos directo
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── icons/              # Íconos Lucide predefinidos
│   └── _astro/             # Output de Vite (cache-busted)
├── src/
│   ├── pages/              # Rutas
│   │   ├── index.astro         # Portada pública
│   │   ├── admin/
│   │   │   ├── index.astro     # Login
│   │   │   └── dashboard.astro # Panel
│   │   ├── api/                # Endpoints REST
│   │   ├── 404.astro
│   │   └── 500.astro
│   ├── components/         # Componentes Astro reusables
│   ├── layouts/            # PublicLayout, AdminLayout
│   ├── lib/                # Lógica de negocio
│   │   ├── schema.ts           # Zod schemas
│   │   ├── config.ts           # Load/save/audit
│   │   ├── auth.ts             # Password, sessions, CSRF
│   │   ├── http.ts             # Response helpers + security headers
│   │   ├── upload.ts           # Asset processing
│   │   ├── assets.ts           # Asset CRUD
│   │   └── icons.ts            # Lucide icon resolution
│   ├── middleware.ts       # Auth + CSRF + body caps
│   ├── styles/
│   └── env.d.ts
├── data/                   # (gitignored) — config, uploads, audit
├── docs/                   # Documentación
└── dist/                   # Output de build
```

Ver [Arquitectura](./architecture.md) para detalle de cómo se conectan las piezas.

## Hot reload

Astro hace HMR de:

- `.astro` — frontmatter + template.
- `.ts` / `.js` — reimporta el módulo.
- `.css` — inyecto via `<style>` scoped.

**No** recarga:

- `astro.config.mjs` — reiniciar dev server.
- `tsconfig.json` — reiniciar dev server.
- `package.json` — reiniciar dev server (y `npm install`).
- `public/*` — en general sí (si el navegador cachea algo, Ctrl+Shift+R).

## Debugging

### VSCode

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Dev server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "console": "integratedTerminal"
    }
  ]
}
```

### Logs

- Dev mode: `console.log` aparece en la terminal del dev server.
- Production: `docker logs umbral`.

Para logs más verbosos en dev, agregá `DEBUG=*` al env o `console.log` directo.

### El dev server tiene "Allowed Hosts: true"

Ver `astro.config.mjs` — para que funcione acceder desde otro host (no sólo `localhost`), está `allowedHosts: true`. En prod (Docker) el middleware + Caddy manejan el `Host` header.

## Build local

```bash
npm run build
npm start
# → http://localhost:4321
```

Equivalente a lo que corre en Docker, sin el container. Útil para debuggear un bug que sólo aparece en "prod-like".

## Build con Docker

```bash
docker build -t umbral:test .
docker run --rm -p 3000:4321 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e INITIAL_PASSWORD=test \
  -v $(pwd)/data-test:/app/data \
  umbral:test
```

Ver [Docker (completo)](../install/docker.md) para más detalle.

## Testing

Los tests viven en `tests/*.test.ts` y corren con dos runners. **Ninguno necesita registrarse a mano**: los dos descubren los archivos solos.

```bash
npm test             # todo: vitest + node --test
npm run typecheck    # tsc --noEmit, tiene que dar 0 errores
```

- **vitest** (`npm run test:astro`): los tests que **importan de `'vitest'`**. Son los que necesitan el pipeline de Vite de Astro: los que renderizan componentes `.astro` con la Container API (`tests/admin-*.astro.test.ts`) y los que importan módulos con el alias `~/`. `vitest.config.ts` arma la lista leyendo `tests/` en cada corrida.
- **`node --test`** (`npm run test:node`): **todo el resto** de `tests/*.test.ts`, con `--experimental-strip-types`. `scripts/run-node-tests.mjs` los descubre (cualquier `*.test.ts` que no importe de `vitest`). Antes había que sumar cada archivo a mano a la cadena de `npm test`, y un test nuevo que nadie agregaba simplemente no corría (le pasó a `icon-pack-validate`).
- Para correr un solo archivo de node: `node --test --experimental-strip-types tests/<archivo>.test.ts` (o el script `test:<nombre>` si existe). Argumentos extra a `run-node-tests.mjs` se pasan a `node --test`, por ejemplo `npm run test:node -- --test-name-pattern=csrf`.
- Un test nuevo: creá `tests/<nombre>.test.ts`. Si importa de `vitest` corre en vitest; si usa `node:test`, en node. No hay que tocar `package.json`.

### CI

`.github/workflows/ci.yml` corre en cada push y PR a `main`: `npm ci`, `npm audit` (dependencias de producción, nivel high), `gen:icons`, `build`, **`npm run typecheck`** y **`npm test`**, y después un smoke test que arranca el server con un `DATA_DIR` vacío (primer arranque) y espera a que `/api/health` responda. `release.yml` corre typecheck y tests antes de construir la imagen: si fallan, no se publica.

### Validación manual extra

1. **Build limpio:** `rm -rf dist && npm run build` — debe completar sin warnings.
2. **Smoke test:** `npm start` y `curl http://localhost:4321/api/health` → 200 (`503` si el config no se puede leer).

## Convenciones

- **Estilo:** TypeScript strict, no `any` salvo en bordes (`JSON.parse`).
- **Naming:** camelCase para variables/funciones, PascalCase para componentes.
- **Imports:** usar el alias `~/` para `src/` (configurado en `tsconfig.json`).
- **No tocar otros archivos** si el cambio es chico — el alcance es sagrado.
- **Schema first:** si agregás un campo al config, primero a `schema.ts`, después a `defaultConfig()`, después al admin UI.

## Publicar cambios

```bash
# 1. Branch
git checkout -b feat/mi-cambio

# 2. Commits chicos
git add -p
git commit -m "feat(scope): qué cambia"
# (conventional commits — feat / fix / refactor / docs / chore)

# 3. Tipos, tests, build local + smoke
npm run typecheck
npm test
npm run build
npm start &
sleep 2
curl http://localhost:4321/api/health
kill %1

# 4. Push
git push origin feat/mi-cambio
```

## Recursos

- [Astro docs](https://docs.astro.build)
- [Alpine.js docs](https://alpinejs.dev)
- [Tailwind v4 docs](https://tailwindcss.com/docs)
- [Zod docs](https://zod.dev)
- [Sharp docs](https://sharp.pixelplumbing.com)
- [DOMPurify docs](https://github.com/cure53/DOMPurify)

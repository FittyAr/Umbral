# Changelog

Todos los cambios relevantes a Umbral. Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versionado con [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **Drag-and-drop para categorías** en el panel admin (pestaña Categorías). Cada fila tiene un handle `⋮⋮` a la izquierda; arrastrar reordena el array `cfg.categories` y el cambio se persiste con "Guardar cambios". El home ahora respeta ese orden: las secciones/columnas aparecen en la portada en el mismo orden que las ves acá. Bug fix de paso: antes el orden de los grupos en la portada dependía de cuál era la primera card de cada categoría (no del array de categorías) — ahora se ordena por la posición de `catId` en `config.categories`. Categorías huérfanas (cards con un category que ya no existe) caen al final.

### Fixed
- **PUT /api/config 400 por descripciones largas**: cards con `description` >200 chars (pegados de Wikipedia, devueltos por la IA, etc.) rompían el save. `CardSchema.description` ahora clampea silenciosamente con `.transform((v) => v.slice(0, 200))` en vez de rechazar con `String must contain at most 200 character(s)`. Defense-in-depth en el cliente (`saveAll()` trunca antes de enviar y avisa con un toast si truncó algo).
- **Edit card no carga la categoría**: bug de timing de Alpine 3 — el `<select x-model="editingCard.category">` se inicializaba antes de que el `<template x-for="c in cfg.categories">` hubiera renderizado los `<option>`, así que el select caía al fallback "— seleccionar —" aunque el value en memoria fuera válido. Fix canónico: `x-init="$nextTick(() => $el.value = editingCard.category || '')"`.
- **Console flooded con 502 al auto-completar**: cuando el scraper encontraba una `og:image` o favicon que el origen respondía con 4xx (404, 403, etc.), `/api/upload-from-url` devolvía 502 Bad Gateway y ensuciaba la consola. Ahora 4xx devuelve 200 con `{ok: false, reason: 'not_found'}` (soft fail — el ícono simplemente no se setea, el resto del autofill sigue); 5xx y errores de red siguen siendo 502/504.

## [1.1.3] - 2026-08-06

### Changed
- **Node 22 → Node 24 LTS.** Astro 7 pide ≥22.12 (cualquier 22+ sirve), pero Node 22 ya está en Maintenance LTS (EOL abril 2027). Node 24 es la LTS actual, EOL abril 2029, y trae mejoras (built-in WebSocket, fetch más rápido, V8 12.x). Imágenes Docker y CI ahora usan `node:24-alpine`. `engines.node` en package.json actualizado a `>=24.0.0`.

## [1.1.2] - 2026-08-06

### Fixed
- **Build failure** del release workflow: Astro 7 requiere Node ≥22.12 pero el Dockerfile usaba `node:20-alpine`. Bumpeo a `node:22-alpine` (builder + runtime). CI workflow también: `node-version: '22'`.

## [1.1.1] - 2026-08-06

### Security
- Upgrade de dependencias para resolver 14 advisories de Dependabot (2 high, 7 moderate, 5 low agrupados):
  - `astro` 5.6.1 → 7.2.0 (XSS, SSRF, cache poisoning)
  - `@astrojs/node` 9.2.2 → 11.1.0
  - `sharp` 0.34.1 → 0.35.3 (CVE heredados de libvips)
  - `file-type` 19.6.0 → 22.0.1 (infinite loop en ASF parser)
  - `esbuild` transitivo con astro 7
- Removido `@ts-expect-error` obsoleto en `astro.config.mjs` (astro 7 ya no tiene el mismatch de Vite con `@tailwindcss/vite`).

## [1.1.0] - 2026-08-06

### Added
- Documentación accesible desde la app en `/docs` (antes sólo en repo).
- GitHub Actions: CI en cada PR/push, release multi-arch en tags `v*`.
- Scripts `scripts/update.sh` y `scripts/update.ps1` que detectan modo (compose / docker run / local) y actualizan preservando `data/`.
- Sección "Actualizar" en el README.

### Fixed
- Container Docker ahora incluye la carpeta `docs/` (antes `/docs` fallaba en producción).

## [1.0.0] - 2026-07-28

### Added
- Primera release pública de Umbral (antes conocido como Atajo).
- Astro 5 SSR + Node adapter.
- Panel admin con tabs (Branding, Tema, Layout, Categorías, Tarjetas, Assets, Status, Hardening, Password, Avanzado).
- Hardening configurable (CSP, HSTS, rate limit, MIME allowlist, body caps, headers).
- Auth con bcrypt + epoch + CSRF, sesiones firmadas.
- Subida de assets con validación magic-numbers + DOMPurify + sharp.
- 4 rounds de find-bugs + fixes (seguridad, race conditions, sanitización, XSS, SSRF, etc).
- Manifest PWA + service worker.
- Reverse proxy guides para Caddy / Nginx / Traefik.

[Unreleased]: https://github.com/FittyAr/Umbral/compare/v1.1.3...HEAD
[1.1.3]: https://github.com/FittyAr/Umbral/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/FittyAr/Umbral/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/FittyAr/Umbral/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/FittyAr/Umbral/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/FittyAr/Umbral/releases/tag/v1.0.0

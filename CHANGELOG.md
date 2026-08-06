# Changelog

Todos los cambios relevantes a Umbral. Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versionado con [SemVer](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/FittyAr/Umbral/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/FittyAr/Umbral/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/FittyAr/Umbral/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/FittyAr/Umbral/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/FittyAr/Umbral/releases/tag/v1.0.0

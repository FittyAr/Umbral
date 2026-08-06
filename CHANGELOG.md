# Changelog

Todos los cambios relevantes a Umbral. Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versionado con [SemVer](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/FittyAr/Umbral/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/FittyAr/Umbral/releases/tag/v1.0.0

# Arquitectura Técnica de Umbral

Esta guía describe en detalle la arquitectura interna, diseño de módulos, flujo de datos y convenciones de ingeniería utilizadas en **Umbral**.

---

## 🏛️ Vista General del Sistema

```
                          ┌─────────────────────────┐
                          │   Browser (Visitante)   │
                          └────────────┬────────────┘
                                       │ HTTPS (Caddy/Nginx/Traefik)
                                       ▼
                          ┌─────────────────────────┐
                          │   Astro 7 (SSR Node 24) │
                          │   ├─ middleware.ts      │
                          │   ├─ pages/             │
                          │   │  ├─ index.astro     │ ← Portada interactiva
                          │   │  ├─ admin/          │ ← Dashboard administrativo
                          │   │  ├─ docs/           │ ← Documentación renderizada
                          │   │  └─ api/            │ ← Endpoints REST
                          │   ├─ i18n/              │ ← 21 Diccionarios y Catálogos
                          │   └─ lib/               │ ← Lógica de dominio y schemas
                          └────────────┬────────────┘
                                       │ fs.read / atomic fs.write
                                       ▼
                          ┌─────────────────────────┐
                          │   /app/data/            │
                          │   ├─ config.json        │ ← Configuración plana
                          │   ├─ uploads/           │ ← Assets optimizados
                          │   ├─ icon-packs/        │ ← Paquetes Git locales
                          │   └─ audit.log          │ ← Registro inmutable
                          └─────────────────────────┘
```

Umbral opera como un único proceso Node.js encapsulado en un contenedor Docker optimizado (~80MB), sin bases de datos externas (MySQL/Postgres) ni almacenes en memoria como Redis.

---

## 🧩 Capas de la Aplicación

### 1. `middleware.ts` (Guardias de Seguridad y Sesión)
Punto de entrada de cada petición HTTP en el servidor:
- **Verificación de Autenticación:** Protege rutas `/admin/*` y `/api/*` mediante validación de cookies firmadas `umbral_session` o tokens Bearer `umb_...`.
- **Protección Anti-CSRF:** Exige la cabecera `x-csrf-token` en todas las mutaciones (`POST`, `PUT`, `DELETE`, `PATCH`).
- **Límites de Payload (Body Caps):** Rechaza peticiones sobredimensionadas antes de cargarlas en memoria (1MB para configs, 10MB para uploads).
- **Inyección de Cabeceras HTTP:** Aplica CSP, HSTS, X-Frame-Options, X-Content-Type-Options y Referrer-Policy a todas las respuestas.

### 2. `pages/` (Rutas y Controladores)
- **`index.astro` / `[category].astro`:** Portada pública y subpáginas renderizadas en el servidor (SSR) con soporte para temas claros/oscuros, filtros en vivo y animaciones CSS.
- **`admin/dashboard.astro`:** Panel administrativo reactivo impulsado por **Alpine.js 3** y **SortableJS**. Mantiene un estado de borrador local con previsualización en tiempo real y persistencia atómica en el botón "Guardar cambios".
- **`docs/[...slug].astro`:** Documentación técnica generada a partir de los archivos Markdown de `docs/`.
- **`api/*.ts`:** API REST modular con endpoints tipados.

### 3. `src/i18n/` (Sistema de Internacionalización)
- **21 Locales Nativos:** Soporte completo para `es`, `en`, `pt`, `fr`, `de`, `it`, `zh`, `ja`, `ru`, `nl`, `pl`, `ko`, `tr`, `uk`, `sv`, `cs`, `da`, `fi`, `no`, `hu`, `ro`.
- **Paridad Estricta:** Cada idioma cuenta exactamente con las 356 claves UI y las 162 entradas del catálogo de ayuda.
- **Pre-renderizado de Catálogos:** Endpoints `/api/help/<locale>.json` prerenderizados estáticamente para entrega instantánea.
- **Resolución de Idioma:** Prioridad: Cookie `umbral_locale` → Idioma configurado en portal (`features.i18n.locale`) → Default Español (`es`).

### 4. `src/lib/` (Lógica de Dominio y Esquemas)
- **`schema/`:** Esquemas de validación Zod (`schema/branding.ts`, `schema/theme.ts`, `schema/layout.ts`, `schema/cards.ts`, `schema/categories.ts`, `schema/features.ts`, `schema/security.ts`). Todo dato externo pasa por validación de tipos estricta antes de ingresar a la memoria o guardarse en disco.
- **`features.ts`:** Motor de Feature Flags opt-in con carga dinámica de dependencias pesadas (`loadFeatureModule`) para mantener costo cero cuando están inactivas.
- **`config.ts`:** Ciclo de vida del archivo `config.json` con lecturas en caché in-memory (5s TTL) y escrituras atómicas con bloqueo de concurrencia y guardado temporal (`.tmp` + rename).
- **`ids.ts`:** Generación de identificadores de alta concurrencia con timestamp en base36 y contador secuencial para colisión cero.
- **`upload.ts`:** Detección de magic-bytes con `file-type`, procesamiento con `sharp` y sanitización SVG con `dompurify` + `jsdom`.

---

## 🧪 Estrategia de Pruebas Automatizadas

El proyecto cuenta con una suite completa de **19 suites de tests** ejecutadas con `npm test`:
- **Paridad de i18n (`tests/i18n.test.ts`):** Valida que los 21 diccionarios contengan exactamente las mismas claves que la fuente de verdad.
- **Validación de Schemas y Modelos (`tests/cards.test.ts`, `tests/card-span.test.ts`, `tests/layout.test.ts`):** Valida restricciones de Zod, cálculo de grillas CSS y sanitización.
- **Seguridad y Sesiones (`tests/auth-session.test.ts`, `tests/sortable-guard.test.ts`):** Valida guardias contra SSRF, secretos compartidos y mitigaciones de DoS.
- **Iconos y URLs (`tests/icon-url.test.ts`, `tests/icon-packs.test.ts`):** Valida resolución de rutas locales y aislamiento de paquetes Git.

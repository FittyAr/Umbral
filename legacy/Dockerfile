# syntax=docker/dockerfile:1.7

# ────────────────────────────────────────────────────────────────────────
# Umbral — Dockerfile variant para hardware legacy (sin x86_64-v2)
# ────────────────────────────────────────────────────────────────────────
# NO usar como reemplazo del Dockerfile principal. Éste existe únicamente
# para servidores con CPUs viejos que no soportan la microarquitectura
# x86_64-v2 (típicamente pre-2011, ej. Atom, Celeron viejo, Xeon pre-Sandy
# Bridge). El error que produce es:
#
#   Error: Could not load the "sharp" module using the linuxmusl-x64 runtime
#   Unsupported CPU: Prebuilt binaries for Linux x64 require v2 microarchitecture
#
# sharp 0.35+ (la versión que usa Umbral por defecto) sólo publica prebuilt
# binaries para CPUs v2+. Este Dockerfile hace downgrade de sharp a 0.33.5
# dentro del paso de build, sin tocar package.json/package-lock.json del
# proyecto principal.
#
# Trade-off: sharp 0.33.5 usa libvips 8.15.1, que tiene CVEs de buffer
# overflow arreglados en versiones posteriores. Para un portal interno con
# usuarios de confianza, el riesgo es bajo. Cuando el server se modernize,
# volver al Dockerfile principal.
#
# Cómo usar (desde la raíz del proyecto):
#   docker compose -f legacy/docker-compose.yml build
#   docker compose -f legacy/docker-compose.yml up -d
#
# Cómo borrar todo cuando ya no haga falta:
#   rm -rf legacy/
#   docker rmi umbral:legacy
#   docker volume rm umbral-data-legacy

FROM node:24-alpine AS builder
WORKDIR /app

# Install deps first (cache-friendly)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --include=optional; else npm install --include=optional; fi

# Downgrade sharp a 0.33.5 (la última con prebuilt para v1).
# --no-save evita tocar package.json/package-lock.json del proyecto; el
# cambio es sólo dentro de la imagen.
RUN npm install --no-save sharp@0.33.5

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies to keep node_modules small
RUN npm prune --omit=dev

# Sharp carries prebuilt binaries for every platform; strip the ones we don't need.
# Keep: @img/colour (always needed), @img/sharp-linuxmusl-x64 (our platform),
#       @img/sharp-libvips-linuxmusl-x64 (bundled libvips for our platform).
RUN cd /app/node_modules/@img && \
    for d in */; do \
      case "$d" in \
        colour/) ;; \
        sharp-linuxmusl-x64/) ;; \
        sharp-libvips-linuxmusl-x64/) ;; \
        *) rm -rf "$d" ;; \
      esac; \
    done

# ────────────────────────────────────────────────────────────────────────
# Stage 2: runtime
# ────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
# sharp ships its own libvips via @img/sharp-libvips-*, so we don't need system vips.
# tini for proper signal handling; wget for the healthcheck.
RUN apk add --no-cache tini wget \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy built artifacts + production node_modules (chown in COPY = no extra layer)
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
# Documentation folder — same as the main Dockerfile.
COPY --from=builder --chown=app:app /app/docs ./docs

# Pre-create writable dirs (these are the only writable points in the container)
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data

USER app
ENV NODE_ENV=production \
    PORT=4321 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

EXPOSE 4321

# tini = proper signal handling + zombie reaping
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "./dist/server/entry.mjs"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O- http://127.0.0.1:4321/api/health || exit 1

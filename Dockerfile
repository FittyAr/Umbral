# syntax=docker/dockerfile:1.7

# ────────────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (cache-friendly)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
FROM node:20-alpine AS runtime
# sharp ships its own libvips via @img/sharp-libvips-*, so we don't need system vips.
# tini for proper signal handling; wget for the healthcheck.
RUN apk add --no-cache tini wget \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy built artifacts + production node_modules (chown in COPY = no extra layer)
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
# Documentation folder — mounted at runtime by src/pages/docs/*.astro via
# process.cwd()/docs. We bundle it into the image so /docs works out of the
# box without needing a host bind-mount. The folder is read-only at runtime
# (the app never writes to it), so no volume is needed.
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


# syntax=docker/dockerfile:1.7

# ────────────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────────────
# Astro 7 requires Node >=22.12.0. We use node:24-alpine (current Active LTS
# line) for both builder and runtime — Node 24 is the most recent LTS and
# will be supported through April 2029, giving this image the longest
# runway before another base-image bump.
FROM node:24-alpine AS builder
# Build native modules (sharp) from source against the system libvips instead
# of using sharp's prebuilt binaries. Reasons:
#   1. sharp@0.35 prebuilts require x86_64-v2 microarchitecture, which excludes
#      older CPUs (e.g. pre-Sandy Bridge Xeons, some embedded boards). The
#      generic image must run everywhere, so we trade a few seconds of build
#      time for universal portability.
#   2. Building against the system libvips also avoids bundling the ~20MB
#      prebuilt libvips into the image — the runtime stage just apt-installs
#      libvips directly, which is much smaller.
# Tooling required by node-gyp + libvips headers.
RUN apk add --no-cache python3 make g++ vips-dev
WORKDIR /app

# Install deps first (cache-friendly). SHARP_FORCE_BUILD=1 forces sharp to
# compile from source rather than downloading a prebuilt. --include=optional
# pulls platform-specific bindings that npm otherwise skips by default.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      SHARP_FORCE_BUILD=1 npm ci --include=optional; \
    else \
      SHARP_FORCE_BUILD=1 npm install --include=optional; \
    fi

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies to keep node_modules small
RUN npm prune --omit=dev

# Defence in depth: if any other @img/* prebuilt bindings snuck in (e.g. for
# darwin from a developer's local install), strip them. After SHARP_FORCE_BUILD
# we typically only have @img/colour (pure-JS, always needed), but this guard
# keeps the image lean if sharp's install behaviour changes upstream.
RUN cd /app/node_modules/@img && \
    for d in */; do \
      case "$d" in \
        colour/) ;; \
        *) rm -rf "$d" ;; \
      esac; \
    done

# ────────────────────────────────────────────────────────────────────────
# Stage 2: runtime
# ────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
# sharp was compiled in the builder stage against the system libvips (vips-dev),
# so the dynamic linker here needs the matching runtime libvips (no -dev) to
# load the binding. This is smaller than shipping a prebuilt libvips would be.
# tini for proper signal handling; wget for the healthcheck.
RUN apk add --no-cache tini wget vips \
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


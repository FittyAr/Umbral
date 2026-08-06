# syntax=docker/dockerfile:1.7

# ────────────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────────────
# Astro 7 requires Node >=22.12.0. We use node:24-alpine (current Active LTS
# line) for both builder and runtime — Node 24 is the most recent LTS and
# will be supported through April 2029, giving this image the longest
# runway before another base-image bump.
FROM node:24-alpine AS builder
# Build sharp's native binding from source against the system libvips instead
# of using sharp's prebuilt binaries. Reasons:
#   1. sharp@0.35 prebuilts require x86_64-v2 microarchitecture, which excludes
#      older CPUs (e.g. pre-Sandy Bridge Xeons, some embedded boards). The
#      generic image must run everywhere, so we trade a few seconds of build
#      time for universal portability.
#   2. Building against the system libvips also avoids bundling the ~20MB
#      prebuilt libvips into the image — the runtime stage just apt-installs
#      libvips directly, which is much smaller.
# Tooling required by node-gyp + libvips headers + pkg-config to detect vips.
RUN apk add --no-cache python3 make g++ vips-dev pkgconfig
WORKDIR /app

# Install deps first (cache-friendly). --include=optional ensures any
# platform-specific bindings are pulled in (we'll rebuild from source after).
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --include=optional; \
    else \
      npm install --include=optional; \
    fi

# Belt-and-suspenders: explicitly rebuild sharp's native binding from source
# against the system libvips. npm ci may have downloaded the prebuilt (which
# refuses to load on x86_64-v1 CPUs); this step compiles a binding tailored
# to the local CPU so it works anywhere. We pass both env vars (sharp checks
# SHARP_FORCE_BUILD; npm passes through --build-from-source as
# npm_config_build_from_source) because sharp 0.35.x has been seen ignoring
# one or the other depending on the lockfile state.
RUN SHARP_FORCE_BUILD=true npm rebuild sharp --build-from-source

# Sanity check: actually load sharp. If the binding is broken (e.g. CPU ISA
# mismatch), `require('sharp')` throws at load time. Catching this here means
# the build fails fast with a clear error, instead of a cryptic "Could not
# load sharp" in the gen-icons step further down.
RUN node -e "const s = require('sharp'); console.error('sharp ok, libvips=' + s.versions.vips)"

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies to keep node_modules small
RUN npm prune --omit=dev

# Defence in depth: strip any leftover @img/* platform bindings from other
# OSes a developer may have left in (e.g. darwin from a Mac dev box). After
# the source rebuild above, we typically only have @img/colour (pure-JS).
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


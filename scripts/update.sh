#!/usr/bin/env bash
# update.sh — actualiza Umbral preservando data/ y uploads/.
# Detecta automáticamente: docker compose, docker run, o install local.
#
# Uso:
#   ./scripts/update.sh              # actualiza a :latest
#   ./scripts/update.sh v1.2.0       # actualiza a un tag específico
#   ./scripts/update.sh 1.2.0        # sin prefijo 'v', lo agrega
#
# El volumen data/ (config.json, uploads/, audit.log) NO se toca.
set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────
log()  { printf '\033[1;34m[update]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[update]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[update]\033[0m %s\n' "$*" >&2; exit 1; }

IMAGE="${IMAGE:-ghcr.io/fittyar/umbral}"
CONTAINER="${CONTAINER:-umbral}"
VOLUME="${VOLUME:-umbral-data}"
PORT="${PORT:-3000}"

# Tag: si pasaron arg, úsalo (con o sin 'v'); si no, latest.
if [ "${1:-}" != "" ]; then
    TAG="$1"
    case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
else
    TAG="latest"
fi

# ── 1) Detectar modo ─────────────────────────────────────────────────
mode=""

if [ -f "docker-compose.yml" ] && command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    mode="compose"
elif command -v docker >/dev/null 2>&1 && docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    mode="docker-run"
elif [ -f "package.json" ] && [ -d "node_modules" ] && [ -d "dist" ]; then
    mode="local"
fi

if [ -z "$mode" ]; then
    err "No detecté docker compose, container '$CONTAINER' corriendo, ni install local con dist/."
    echo "  Opciones:" >&2
    echo "   - Si usás docker compose: corré desde la carpeta con docker-compose.yml" >&2
    echo "   - Si usás docker run:    export CONTAINER=tu-nombre y volvé a intentar" >&2
    echo "   - Si instalaste local:   asegurate de tener package.json + node_modules + dist/" >&2
fi

log "Modo detectado: $mode"
log "Imagen destino: $IMAGE:$TAG"

# ── 2) Backup defensivo del config (1 línea, no falla si no hay volumen) ──
backup_config() {
    local cfg_src="$1"
    if [ -f "$cfg_src" ]; then
        local backup_dir="./.update-backups/$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        cp "$cfg_src" "$backup_dir/config.json"
        log "Backup del config en $backup_dir/config.json"
    fi
}

# ── 3) Modo compose ──────────────────────────────────────────────────
if [ "$mode" = "compose" ]; then
    # Cambiar la línea `image:` del compose si vamos a una versión fija
    # y no usamos la última. Si vamos a :latest, no tocamos.
    if [ "$TAG" != "latest" ]; then
        # Reemplaza `image: ghcr.io/fittyar/umbral:latest` (o cualquier tag)
        # por `image: ghcr.io/fittyar/umbral:$TAG`.
        sed -i.bak -E "s|^(\s*image:\s*${IMAGE}):.*|\1:${TAG}|" docker-compose.yml
        log "Pinned a :$TAG en docker-compose.yml (backup: docker-compose.yml.bak)"
    fi
    backup_config "./data/config.json"
    log "docker compose pull"
    docker compose pull
    log "docker compose up -d"
    docker compose up -d
    log "Update completo. data/ preservado."
    exit 0
fi

# ── 4) Modo docker run ───────────────────────────────────────────────
if [ "$mode" = "docker-run" ]; then
    # Backup del config desde el volumen.
    log "Extrayendo config.json del volumen $VOLUME..."
    mkdir -p ./.update-backups
    docker run --rm -v "$VOLUME:/data" -v "$(pwd)/.update-backups:/backup" alpine \
        sh -c 'cp /data/config.json /backup/config.json 2>/dev/null || true'
    if [ -f ./.update-backups/config.json ]; then
        log "Backup del config en ./.update-backups/config.json"
    fi
    log "docker pull $IMAGE:$TAG"
    docker pull "$IMAGE:$TAG"
    log "Deteniendo container viejo..."
    docker stop "$CONTAINER" 2>/dev/null || true
    docker rm "$CONTAINER" 2>/dev/null || true
    log "Arrancando container nuevo con la misma config..."
    # Reusamos el volumen, no tocamos nada de data/.
    # Si tu run original tenía otras flags, agregalas a este comando.
    docker run -d \
        --name "$CONTAINER" \
        -p "${PORT}:4321" \
        -e NODE_ENV=production \
        -e PORT=4321 \
        -e HOST=0.0.0.0 \
        -e DATA_DIR=/app/data \
        -e SESSION_SECRET="${SESSION_SECRET:?SESSION_SECRET env var required}" \
        -e INITIAL_PASSWORD="${INITIAL_PASSWORD:-}" \
        -e BASE_URL="${BASE_URL:-}" \
        -v "$VOLUME:/app/data" \
        --restart unless-stopped \
        "$IMAGE:$TAG"
    log "Update completo. Volumen $VOLUME preservado."
    exit 0
fi

# ── 5) Modo local ───────────────────────────────────────────────────
if [ "$mode" = "local" ]; then
    backup_config "./data/config.json"
    if [ -d ".git" ]; then
        log "git pull"
        git pull
    else
        warn "No es un repo git. Bajá la nueva versión a mano y re-copiá tu data/."
    fi
    log "npm ci"
    npm ci
    log "npm run build"
    npm run build
    if command -v systemctl >/dev/null 2>&1 && systemctl list-units --type=service 2>/dev/null | grep -q umbral; then
        log "systemctl restart umbral"
        sudo systemctl restart umbral
        log "Update completo (systemd)."
    else
        warn "Reiniciá tu proceso de Node a mano (pm2, forever, screen, lo que uses)."
    fi
    log "Update completo. data/ preservado."
    exit 0
fi

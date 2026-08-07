#!/usr/bin/env bash
# Wrapper para correr la instalación legacy de Umbral.
#
# Carga legacy/.env en el entorno de Docker Compose (para que ${PORT},
# ${SESSION_SECRET}, etc. se interpolen correctamente en el compose file)
# y delega al docker compose. Úsalo en lugar de invocar docker compose
# directamente para no olvidarte del flag --env-file.
#
# Uso:
#   ./legacy/umbral.sh build
#   ./legacy/umbral.sh up -d
#   ./legacy/umbral.sh logs -f
#   ./legacy/umbral.sh down
#
# Equivale a:
#   docker compose --env-file legacy/.env -f docker-compose.legacy.yml <args>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.legacy.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE no existe. Copiá legacy/.env.example a legacy/.env y editalo." >&2
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"

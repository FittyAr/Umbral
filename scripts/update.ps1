# update.ps1 — actualiza Umbral preservando data/ y uploads/.
# Equivalente Windows de scripts/update.sh.
#
# Uso:
#   .\scripts\update.ps1                  # actualiza a :latest
#   .\scripts\update.ps1 -Tag v1.2.0     # actualiza a un tag específico
#   .\scripts\update.ps1 -Container umbral -Volume umbral-data
#
# El volumen data/ (config.json, uploads/, audit.log) NO se toca.

[CmdletBinding()]
param(
    [string]$Tag = 'latest',
    [string]$Image = 'ghcr.io/fittyar/umbral',
    [string]$Container = 'umbral',
    [string]$Volume = 'umbral-data',
    [int]$Port = 3000
)

# Si el tag vino sin 'v' y parece semver, agregar 'v'.
if ($Tag -notmatch '^v' -and $Tag -match '^\d+\.\d+') { $Tag = "v$Tag" }

$ErrorActionPreference = 'Stop'

function Log($msg)  { Write-Host "[update] $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "[update] $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[update] $msg" -ForegroundColor Red; exit 1 }

# ── 1) Detectar modo ─────────────────────────────────────────────────
$mode = $null

if (Test-Path "docker-compose.yml" -and (Get-Command docker -ErrorAction SilentlyContinue)) {
    try { docker compose version | Out-Null; $mode = 'compose' } catch {}
}

if (-not $mode -and (Get-Command docker -ErrorAction SilentlyContinue)) {
    $exists = docker ps -a --format '{{.Names}}' 2>$null | Where-Object { $_ -eq $Container }
    if ($exists) { $mode = 'docker-run' }
}

if (-not $mode -and (Test-Path "package.json") -and (Test-Path "node_modules") -and (Test-Path "dist")) {
    $mode = 'local'
}

if (-not $mode) {
    Err "No detecté docker compose, container '$Container' corriendo, ni install local con dist/.`n  - Si usás docker compose: corré desde la carpeta con docker-compose.yml`n  - Si usás docker run: pasá -Container tu-nombre`n  - Si instalaste local: asegurate de tener package.json + node_modules + dist/"
}

Log "Modo detectado: $mode"
Log "Imagen destino: ${Image}:${Tag}"

# ── 2) Backup defensivo del config ───────────────────────────────────
function Backup-Config($path) {
    if (Test-Path $path) {
        $backupDir = "./.update-backups/$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Copy-Item $path "$backupDir/config.json"
        Log "Backup del config en $backupDir/config.json"
    }
}

# ── 3) Modo compose ──────────────────────────────────────────────────
if ($mode -eq 'compose') {
    if ($Tag -ne 'latest') {
        $composeFile = Get-Content 'docker-compose.yml' -Raw
        $bakFile = 'docker-compose.yml.bak'
        Copy-Item 'docker-compose.yml' $bakFile -Force
        $newImage = "$Image`:$Tag"
        $updated = $composeFile -replace "(image:\s*${Image}):[^\s`r`n]+", "`$1`:$Tag"
        Set-Content -LiteralPath 'docker-compose.yml' -Value $updated -NoNewline -Encoding UTF8
        Log "Pinned a :$Tag en docker-compose.yml (backup: $bakFile)"
    }
    Backup-Config "./data/config.json"
    Log "docker compose pull"
    docker compose pull
    Log "docker compose up -d"
    docker compose up -d
    Log "Update completo. data/ preservado."
    exit 0
}

# ── 4) Modo docker run ───────────────────────────────────────────────
if ($mode -eq 'docker-run') {
    Log "Extrayendo config.json del volumen $Volume..."
    New-Item -ItemType Directory -Path ./.update-backups -Force | Out-Null
    docker run --rm -v "${Volume}:/data" -v "${PWD}/.update-backups:/backup" alpine `
        sh -c 'cp /data/config.json /backup/config.json 2>/dev/null || true' 2>$null
    if (Test-Path ./.update-backups/config.json) {
        Log "Backup del config en ./.update-backups/config.json"
    }
    Log "docker pull ${Image}:${Tag}"
    docker pull "${Image}:${Tag}"
    Log "Deteniendo container viejo..."
    docker stop $Container 2>$null | Out-Null
    docker rm $Container 2>$null | Out-Null
    Log "Arrancando container nuevo con la misma config..."
    if (-not $env:SESSION_SECRET) { Err "SESSION_SECRET env var required (export antes de correr el script)." }
    docker run -d `
        --name $Container `
        -p "${Port}:4321" `
        -e NODE_ENV=production `
        -e PORT=4321 `
        -e HOST=0.0.0.0 `
        -e DATA_DIR=/app/data `
        -e SESSION_SECRET=$env:SESSION_SECRET `
        -e INITIAL_PASSWORD=$env:INITIAL_PASSWORD `
        -e BASE_URL=$env:BASE_URL `
        -v "${Volume}:/app/data" `
        --restart unless-stopped `
        "${Image}:${Tag}"
    Log "Update completo. Volumen $Volume preservado."
    exit 0
}

# ── 5) Modo local ───────────────────────────────────────────────────
if ($mode -eq 'local') {
    Backup-Config "./data/config.json"
    if (Test-Path ".git") {
        Log "git pull"
        git pull
    } else {
        Warn "No es un repo git. Bajá la nueva versión a mano y re-copiá tu data/."
    }
    Log "npm ci"
    npm ci
    Log "npm run build"
    npm run build
    if (Get-Command nssm -ErrorAction SilentlyContinue) {
        try {
            nssm status Umbral 2>$null | Out-Null
            Log "nssm restart Umbral"
            nssm restart Umbral
            Log "Update completo (NSSM)."
            exit 0
        } catch {}
    }
    Warn "Reiniciá tu proceso de Node a mano (pm2, forever, NSSM, lo que uses)."
    Log "Update completo. data/ preservado."
    exit 0
}

# Backup y restore

> La carpeta `data/` es lo **único** que necesitás backupear. Todo lo demás se regenera de los assets subidos + la config.

## Qué se respalda

`data/` contiene:

- `config.json` — branding, theme, layout, security, categorías, tarjetas, auth (password hash + CSRF), API tokens (hasheados) y los secretos de integraciones (API key de IA, client secrets de OIDC). **Tratá el backup del volumen como material sensible.**
- `uploads/` — todos los assets subidos (logos, íconos, fondos, favicons).
- `audit.log` (y `.1`, `.2`, `.3` rotados) — log append-only de eventos.

> Lo que **no** está en `data/`:
> - El código (lo tenés en git o en tu build).
> - `node_modules` / `dist/` (se regenera con `npm install` + `npm run build`).
> - `package-lock.json` (en git).

## Backup

### Método 1: el botón **Export** del panel admin

`/admin` → tab **Avanzado** → **Descargar config.json**.

- Baja un JSON con la config **saneada**: branding, tema, layout, categorías, tarjetas, features, Hardening, etc.
- **No incluye secretos.** El panel nunca recibe el hash de la password, el CSRF, los hashes ni seeds TOTP de los usuarios, los client secrets de OIDC, la API key de IA, las keys de búsqueda externa ni los hashes de los API tokens: en el archivo esos campos van vacíos (`""`).
- **No incluye los assets** — sólo las URLs a `/api/assets/...`.
- Útil para versionar la config o migrarla entre instancias **que comparten los assets** (no es lo normal). Para un backup completo, con passwords y secretos, usá el método 2.

### Método 1b: el CLI

```bash
umbral config backup                       # → umbral-config-<timestamp>.json
umbral config backup --out=config.json     # a un archivo puntual
umbral config backup --out=-               # imprime el JSON por stdout
```

Lee `GET /api/config` con un API token, así que el resultado es el mismo JSON saneado que el export del panel (sin secretos). Antes el CLI sugería `umbral config get > archivo`, que guarda el resumen legible y no el JSON: usá `config backup`. Ver `packages/cli/README.md`.

### Método 2: backup manual del volumen (recomendado)

#### Docker compose

```bash
# Backup
docker run --rm \
  -v umbral-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/umbral-data-$(date +%F).tgz -C /data .

# Ver el contenido
tar tzf umbral-data-2024-03-22.tgz
```

#### docker run (sin compose)

```bash
docker run --rm \
  -v umbral-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/umbral-data-$(date +%F).tgz -C /data .
```

#### systemd / manual

```bash
sudo tar czf /backup/umbral-$(date +%F).tgz -C /opt/umbral data
```

#### Windows (PowerShell)

```powershell
$date = Get-Date -Format "yyyy-MM-dd"
docker run --rm -v umbral-data:/data -v ${PWD}:/backup alpine tar czf /backup/umbral-data-$date.tgz -C /data .
```

### Automatizar el backup

#### cron (Linux)

```cron
# Diario a las 3am, conserva 7 días
0 3 * * * cd /opt/umbral && /usr/local/bin/docker run --rm -v umbral-data:/data -v /backups/umbral:/backup alpine tar czf /backup/data-$(date +\%F).tgz -C /data . && find /backups/umbral -name "data-*.tgz" -mtime +7 -delete
```

#### Task Scheduler (Windows)

1. Crear `backup-umbral.ps1`:
   ```powershell
   $date = Get-Date -Format "yyyy-MM-dd"
   docker run --rm -v umbral-data:/data -v C:\backups\umbral:/backup alpine tar czf /backup/data-$date.tgz -C /data .
   # Limpiar backups > 7 días
   Get-ChildItem C:\backups\umbral\data-*.tgz | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
   ```
2. Task Scheduler → New Task → Trigger diario 3am → Action: `powershell.exe -File C:\scripts\backup-umbral.ps1`.

#### BorgBackup / restic (avanzado)

Si ya usás Borg o restic para el resto de tu infra, simplemente incluí el directorio `data/` en el job:

```bash
# restic
restic backup /opt/umbral/data

# borg
borg create /backup/umbral::{now} /opt/umbral/data
```

## Restore

### Desde un backup completo (`data/*.tgz`)

#### Docker compose

```bash
# 1. Parar la app
docker compose down

# 2. Borrar el volumen actual (¡ojo, perdés la data actual!)
docker volume rm umbral-data

# 3. Recrear el volumen
docker volume create umbral-data

# 4. Restaurar
docker run --rm \
  -v umbral-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar xzf /backup/umbral-data-2024-03-22.tgz -C /data

# 5. Levantar la app
docker compose up -d
```

#### docker run

```bash
docker stop umbral
docker rm umbral
docker volume rm umbral-data
docker volume create umbral-data
docker run --rm \
  -v umbral-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar xzf /backup/umbral-data-2024-03-22.tgz -C /data
docker run -d --name umbral -p 3000:4321 -v umbral-data:/app/data umbral:latest
```

#### systemd

```bash
sudo systemctl stop umbral
sudo rm -rf /opt/umbral/data/*
sudo tar xzf /backup/umbral-2024-03-22.tgz -C /opt/umbral
sudo chown -R umbral:umbral /opt/umbral/data
sudo systemctl start umbral
```

### Desde un `config.json` exportado (sólo config, sin assets)

`/admin` → tab **Avanzado** → **Importar config.json** → seleccionar archivo.

- Requiere rol `admin` (`PUT /api/import`).
- **La auth y los API tokens actuales se conservan.** Lo que traiga el archivo en `auth` y `apiTokens` se ignora: importar un backup viejo no restaura una password anterior ni revive sesiones que un cambio de password había cerrado. Los usuarios, passwords y tokens se administran aparte.
- **Los secretos vacíos se conservan del server.** Como el export viene sin secretos, al importarlo se mantienen la API key de IA, las keys de búsqueda y los client secrets de OIDC (por `id` de provider) que ya tenía el server. En un server nuevo, cargalos a mano después del import.
- A las tarjetas se les aplica el mismo gating de features que a un guardado normal (por ejemplo, con `markdown` apagado las descripciones quedan como texto plano).
- **Cuidado:** los assets referenciados con `/api/assets/...` no van a estar en el nuevo server. Las tarjetas van a mostrar íconos rotos hasta que subas los assets.
- Para una migración **completa** entre servers: copiá `uploads/` aparte + importá el config, o mejor restaurá el volumen entero (método 2).

## Estrategias de retención

Sugerencias según criticidad:

| Frecuencia | Daily | Semanal | Mensual |
|---|---|---|---|
| **Retener** | 7 días | 4 semanas | 6 meses |

```bash
# Ejemplo con cron + cleanup
0 3 * * * /usr/local/bin/backup-umbral.sh

# backup-umbral.sh
#!/bin/bash
set -e
BACKUP_DIR=/backups/umbral
mkdir -p $BACKUP_DIR
docker run --rm -v umbral-data:/data -v $BACKUP_DIR:/backup alpine \
  tar czf $BACKUP_DIR/daily-$(date +\%F).tgz -C /data .
# Limpiar
find $BACKUP_DIR/daily-*.tgz -mtime +7 -delete
```

## Backup antes de actualizar

Siempre **antes de actualizar a una versión nueva**:

```bash
# 1. Backup
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/pre-upgrade-$(date +%F).tgz -C /data .

# 2. Actualizar imagen
docker compose pull   # o build nueva
docker compose up -d

# 3. Si algo se rompe, restaurá
# (ver "Restore" arriba)
```

## Verificar el backup

Un backup no vale nada si no se puede restaurar. Probá periódicamente:

```bash
# Crear container efímero con el backup
docker run --rm -it \
  -v umbral-data:/data \
  -v $(pwd):/backup \
  alpine sh

# Dentro del container:
$ tar xzf /backup/umbral-data-2024-03-22.tgz -C /tmp
$ ls /tmp/data/
$ cat /tmp/data/config.json | head
$ exit
```

## Backup off-site

Para no perder el backup si se rompe el disco del server:

- **S3 / S3-compatible** (MinIO, Backblaze B2, Wasabi):
  ```bash
  aws s3 cp /backups/umbral/daily-2024-03-22.tgz s3://mi-bucket/umbral/
  ```
- **rsync a otro server:**
  ```bash
  rsync -az /backups/umbral/ backup@other-server:/backups/umbral/
  ```
- **rclone** (Google Drive, Dropbox, OneDrive, etc):
  ```bash
  rclone copy /backups/umbral remote:umbral-backups
  ```

## Resumen rápido

```bash
# Backup
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/umbral-$(date +%F).tgz -C /data .

# Restore
docker compose down
docker volume rm umbral-data
docker volume create umbral-data
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/umbral-2024-03-22.tgz -C /data
docker compose up -d
```

> **TL;DR:** un comando para backup, tres comandos para restore. Automatizá con cron.

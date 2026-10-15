# Instalación manual (bare-metal)

> Para correr Umbral **sin Docker** directamente sobre Node.js. Útil en hosts donde no podés instalar Docker, o en setups tipo LXC/VM minimalistas.

## Requisitos

- **Node.js 24+ LTS** (Astro 7 requiere ≥22.12, usamos Node 24 porque es la LTS actual con el EOL más lejano — abril 2029). Verificá con `node -v`.
- **npm 10+** (incluido con Node 24).
- Al menos **200 MB libres** en disco (dependencias + cache de Astro).
- Un usuario **no-root** para correr el proceso (recomendado).

## Ubicaciones recomendadas (convención FittyAr)

Umbral es un servicio web: solo hace falta ubicar el código y los datos. Si lo corrés en una máquina de escritorio (no como servicio de servidor), usá las rutas estándar de los proyectos FittyAr:

| Qué | Windows | Linux | macOS |
|---|---|---|---|
| Aplicación (el clon + `dist/`) | `%LOCALAPPDATA%\Programs\FittyAr\Umbral` | `~/.local/opt/FittyAr/Umbral` | `~/Library/Application Support/FittyAr/Umbral/app` |
| Config y datos (`DATA_DIR`) | `%APPDATA%\FittyAr\Umbral` | `$XDG_DATA_HOME/FittyAr/Umbral` (default `~/.local/share/FittyAr/Umbral`) | `~/Library/Application Support/FittyAr/Umbral` |

**Si no definís `DATA_DIR`, Umbral usa la ruta de "Config y datos" de la tabla** (se crea en el primer arranque). Ejemplo en Windows (PowerShell):

```powershell
git clone https://github.com/FittyAr/Umbral.git "$env:LOCALAPPDATA\Programs\FittyAr\Umbral"
# Sin DATA_DIR los datos van a %APPDATA%\FittyAr\Umbral
```

En servidores Linux con systemd se mantiene `/opt/umbral` y `/opt/umbral/data` con `DATA_DIR` explícito (ver más abajo); los despliegues Docker/Caddy/nginx no cambian (fijan `DATA_DIR=/app/data`).

### Instalaciones previas con `./data`

Hasta la v1.1.x el default era `./data` (relativo al cwd). Si al arrancar sin `DATA_DIR` existe un `./data` con contenido y la ruta estándar todavía no existe, Umbral **sigue usando `./data`** (no mueve ni borra nada) y loguea un aviso. Para migrar:

1. Detené Umbral.
2. Mové el contenido de `./data` a la ruta estándar (por ejemplo `Move-Item .\data "$env:APPDATA\FittyAr\Umbral"` en Windows, o `mkdir -p ~/.local/share/FittyAr && mv ./data ~/.local/share/FittyAr/Umbral` en Linux).
3. Arrancá de nuevo: si la ruta estándar existe, se usa esa.

Si preferís quedarte con `./data`, fijá `DATA_DIR=./data` y el aviso desaparece.

## 1. Bajar el código

```bash
git clone https://github.com/FittyAr/Umbral.git umbral
cd umbral
```

Si no usás git, bajá el release desde GitHub y descomprimí.

## 2. Instalar dependencias

```bash
npm ci   # o npm install si no hay package-lock.json
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env
$EDITOR .env
```

Mínimo viable:

```env
SESSION_SECRET=<output de: openssl rand -hex 32>
INITIAL_PASSWORD=una-password-fuerte
PORT=4321
HOST=0.0.0.0
# DATA_DIR=/opt/umbral/data   # opcional; sin él se usa la ruta estándar FittyAr
NODE_ENV=production
```

Ver [Variables de entorno](../config/env.md) para la lista completa.

## 4. Build

```bash
npm run build
```

Eso corre `gen:icons` + `astro build` y deja todo en `dist/`.

## 5. Levantar

```bash
npm start
# equivalente a: node ./dist/server/entry.mjs
```

Vas a ver algo así:

```
[umbral] Initial password set from INITIAL_PASSWORD env var.
astro v5.x.x ready in xxx ms
┃ Local    http://0.0.0.0:4321/
```

Abrí `http://localhost:4321` y listo.

## 6. (Recomendado) Correrlo como servicio del sistema

### systemd (Linux moderno)

Creá `/etc/systemd/system/umbral.service`:

```ini
[Unit]
Description=Umbral homepage
After=network.target

[Service]
Type=simple
User=umbral
Group=umbral
WorkingDirectory=/opt/umbral
EnvironmentFile=/opt/umbral/.env
# DATA_DIR explícito: sin él iría al home del usuario (~/.local/share/...),
# que con ProtectSystem/ProtectHome no es escribible.
Environment=DATA_DIR=/opt/umbral/data
ExecStart=/usr/bin/node ./dist/server/entry.mjs
Restart=on-failure
RestartSec=5
# Sandboxing básico
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/umbral/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/umbral umbral
sudo chown -R umbral:umbral /opt/umbral
sudo systemctl daemon-reload
sudo systemctl enable --now umbral
sudo systemctl status umbral
```

Logs en vivo: `sudo journalctl -u umbral -f`.

### OpenRC (Alpine, Gentoo)

`/etc/init.d/umbral`:

```sh
#!/sbin/openrc-run

name="umbral"
description="Umbral homepage"
command_user="umbral:umbral"
directory="/opt/umbral"
command="/usr/bin/node"
command_args="./dist/server/entry.mjs"
pidfile="/run/${RC_SVCNAME}.pid"
command_background=true
export DATA_DIR="/opt/umbral/data"

depend() {
  need net
  after firewall
}
```

```bash
sudo chmod +x /etc/init.d/umbral
sudo rc-update add umbral default
sudo rc-service umbral start
```

### Windows Service (con NSSM)

1. Bajá [NSSM](https://nssm.cc/).
2. `nssm install Umbral`
3. Path: `C:\Program Files\nodejs\node.exe`
4. Startup directory: `C:\umbral`
5. Arguments: `.\dist\server\entry.mjs`
6. Environment: cargá el `.env` con `EnvironmentFile`. Fijá `DATA_DIR` (por ejemplo `DATA_DIR=C:\umbral\data`): sin él el servicio usa el `%APPDATA%\FittyAr\Umbral` de la cuenta con la que corre, que con LocalSystem queda dentro de `C:\Windows\System32\config\systemprofile`.
7. `nssm start Umbral`.

(Ojo: el soporte de Windows tiene algunas diferencias con Linux — `cap_drop` y similares obviamente no aplican, y los permisos NTFS son distintos. Para producción en Windows, considera correr bajo WSL2 con systemd.)

## 7. Reverse proxy + HTTPS

Si lo vas a exponer más allá de `localhost`, **ponelo detrás de un reverse proxy con TLS**. Ver:

- [Caddy reverse proxy](./caddy.md) (recomendado, automático)
- [Nginx / Traefik](./nginx.md)

## 8. Actualizar

```bash
cd /opt/umbral
git pull
npm ci
npm run build
sudo systemctl restart umbral
```

Los datos en `DATA_DIR` (config + uploads + audit) se mantienen.

## Troubleshooting

**"EACCES: permission denied" en el directorio de datos**
El usuario con el que corrés Node no puede escribir en `DATA_DIR`. `chown -R umbral:umbral /opt/umbral/data`.

**¿Dónde están mis datos?**
Si definiste `DATA_DIR`, ahí. Si no, en la ruta estándar FittyAr (ver [Ubicaciones recomendadas](#ubicaciones-recomendadas-convención-fittyar)), salvo que haya un `./data` previo con contenido: en ese caso se sigue usando y el arranque lo avisa en el log.

**"Cannot find module" al hacer `npm start`**
Faltó el build. Corré `npm run build` primero.

**"EADDRINUSE" en el puerto 4321**
Otro proceso usa ese puerto. Cambiá `PORT` en `.env`.

**El healthcheck falla detrás de un proxy**
Activá `cfg.security.network.trustForwardedFor = true` y asegurate de que el proxy sanea los headers `X-Forwarded-For` / `X-Real-IP` antes de pasarlos.

**"sharp: Cannot find module '@img/sharp-linuxmusl-x64'"**
Estás en un sistema/arquitectura no contemplada. Ver [Hardening / seguridad](../config/security.md#imagen-de-docker-y-multi-arch) para construir la imagen desde source o usar la imagen Docker oficial.

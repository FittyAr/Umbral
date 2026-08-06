# Instalación manual (bare-metal)

> Para correr Umbral **sin Docker** directamente sobre Node.js. Útil en hosts donde no podés instalar Docker, o en setups tipo LXC/VM minimalistas.

## Requisitos

- **Node.js 20+** (recomendado LTS actual). Verificá con `node -v`.
- **npm 10+** (incluido con Node 20).
- Al menos **200 MB libres** en disco (dependencias + cache de Astro).
- Un usuario **no-root** para correr el proceso (recomendado).

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
DATA_DIR=./data
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
6. Environment: cargá el `.env` con `EnvironmentFile`.
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

Los datos en `data/` (config + uploads + audit) se mantienen.

## Troubleshooting

**"EACCES: permission denied" en `./data`**
El usuario con el que corrés Node no puede escribir. `chown -R umbral:umbral /opt/umbral/data`.

**"Cannot find module" al hacer `npm start`**
Faltó el build. Corré `npm run build` primero.

**"EADDRINUSE" en el puerto 4321**
Otro proceso usa ese puerto. Cambiá `PORT` en `.env`.

**El healthcheck falla detrás de un proxy**
Activá `cfg.security.network.trustForwardedFor = true` y asegurate de que el proxy sanea los headers `X-Forwarded-For` / `X-Real-IP` antes de pasarlos.

**"sharp: Cannot find module '@img/sharp-linuxmusl-x64'"**
Estás en un sistema/arquitectura no contemplada. Ver [Hardening / seguridad](../config/security.md#imagen-de-docker-y-multi-arch) para construir la imagen desde source o usar la imagen Docker oficial.

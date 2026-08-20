# Troubleshooting

> Errores comunes y soluciones. Si tu problema no está acá, revisá `docker logs umbral` o `journalctl -u umbral` (la app loguea el error exacto).

---

## "Connection refused" al abrir localhost:3000

**Causa:** el container está arrancando o falló.

```bash
docker ps -a | grep umbral
docker logs umbral
```

- Si dice `Exited (1)`, hay un error fatal — pasame el log.
- Si dice `Up ... (health: starting)`, esperá 2-3 segundos.

---

## "404 en /admin"

**Causa:** el container no está corriendo, o estás yendo a la URL equivocada.

```bash
docker ps | grep umbral
curl -I http://localhost:3000/
```

- Si `curl` da 502/503/connection refused, el container está caído.
- Si da 200 pero el browser da 404, puede ser cache del browser — hard refresh (Ctrl+Shift+R).

---

## "Auth no inicializado"

**Causa:** el `config.json` no tiene el campo `auth` (edición manual mal hecha, archivo corrupto).

**Solución A — re-crear la auth con la password actual:**

```bash
# 1. Parar
docker stop umbral

# 2. Editar el config y agregar un auth placeholder (lo regeneramos)
docker run --rm -v umbral-data:/data alpine sh -c \
  "rm /data/config.json"

# 3. Levantar con INITIAL_PASSWORD nuevo
docker compose up -d
# (asegurate de que .env tiene INITIAL_PASSWORD=...)
```

**Solución B — si querés recuperar la config existente:**

1. Parar el container.
2. `docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine cp /data/config.json /backup/`.
3. Editar `/backup/config.json` y agregar:
   ```json
   "auth": {
     "passwordHash": "$2a$12$REEMPLAZAR",
     "csrfToken": "REEMPLAZAR",
     "authEpoch": 0
   }
   ```
4. Pedí a alguien con acceso que te dé un hash bcrypt de la password que quieras, o generá uno con Node:
   ```js
   node -e "require('bcryptjs').hash('mi-password', 12).then(console.log)"
   ```
5. Restaurar: `cp /backup/config.json ...`.
6. Levantar la app.

---

## "config.json está corrupto (JSON inválido)"

**Causa:** corte de luz mientras escribía, edición manual con error de sintaxis.

```bash
docker logs umbral 2>&1 | tail -20
# → "config.json está corrupto (JSON inválido). Reparalo o restaurá el volumen."
```

**Solución A — restaurar de backup** (ver [Backup y restore](./backup.md)):

```bash
docker compose down
docker volume rm umbral-data
docker volume create umbral-data
docker run --rm -v umbral-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/umbral-data-2024-03-22.tgz -C /data
docker compose up -d
```

**Solución B — borrar el config** (perdés cambios pero conserva assets):

```bash
docker compose down
docker run --rm -v umbral-data:/data alpine sh -c "rm /data/config.json"
docker compose up -d
# La app regenera el config con defaults. Los assets en /data/uploads/ siguen.
```

---

## Olvidé la password

```bash
# 1. Parar
docker stop umbral

# 2. Borrar el config (vas a perder el resto de la config también)
docker run --rm -v umbral-data:/data alpine sh -c "rm /data/config.json"

# 3. Levantar con INITIAL_PASSWORD nuevo
# (asegurá .env: INITIAL_PASSWORD=mi-nueva-password)
docker compose up -d
```

Después andá a `/admin` → **Password** y cambiala a algo memorable.

> **Si tenés un backup reciente** que no querés perder, contactame y vemos cómo resetear la auth dentro del JSON sin perder el resto.

---

## "SERVICE_SECRET not set" o warning rojo en logs

**Causa:** `SESSION_SECRET` está en su default débil (`change-me-please-this-is-32-chars-or-more` o similar).

**Solución:**

```bash
# Generar uno fuerte
openssl rand -hex 32

# Ponerlo en .env
echo "SESSION_SECRET=el-que-generaste" >> .env

# Reiniciar
docker compose up -d
```

**Nota:** cambiar el secret invalida todas las sesiones existentes. Es lo correcto.

---

## Rate limit me bloquea a mí mismo

**Causa probable:** estás detrás de un reverse proxy (Caddy/Nginx/Traefik) y **no activaste** `trustForwardedFor` en la app. Todos tus requests llegan con la IP del container y después de unos pocos intentos, el rate limit te bloquea.

**Solución:**

1. `/admin` → **Hardening** → **Red** → ✓ **Confiar en X-Forwarded-For**.
2. **Guardar cambios**.
3. Logout y login de nuevo.

Si **no** estás detrás de un proxy, entonces alguien (o vos) está realmente haciendo muchos intentos. Esperá 60 segundos (default `rateLimitWindowSec`) y vuelve a intentar.

---

## HSTS no aparece en los headers

**Causa:** la app no detecta HTTPS.

**Checklist:**

1. ¿Estás accediendo por `https://`? (HSTS **sólo** se manda en HTTPS.)
   ```bash
   curl -I https://tu-dominio/ | grep -i strict-transport
   ```
2. ¿`BASE_URL` empieza con `https://`?
   ```env
   BASE_URL=https://home.example.com
   ```
3. ¿`trustForwardedFor` está activado y el proxy manda `X-Forwarded-Proto: https`?
4. ¿`cfg.security.headers.hsts` no es `'never'`?

**Test directo sin proxy:**

```bash
# Devuelve 200 sin HSTS si BASE_URL no es https
curl -I http://localhost:3000/ | grep -i strict-transport
# (no aparece, normal)

# Devuelve 200 CON HSTS si BASE_URL=https://...
BASE_URL=https://localhost:3000 npm start
# o
curl -I -H "X-Forwarded-Proto: https" http://localhost:3000/ | grep -i strict-transport
```

---

## Los íconos SVG no se ven / se ven raros

**Causa:** DOMPurify (sanitizador) puede romper features complejas de SVG (`<use>`, filtros, foreign objects, scripts, etc).

**Soluciones:**

1. **Subilo como PNG/WebP en vez de SVG.** Más simple, más compatible.
2. **Simplificá el SVG** — sacale `<defs>`, `<filter>`, `<use href="...">` complejos. DOMPurify es conservador.
3. **Si necesitás SVG complejo** y confías en la fuente: `cfg.security.uploads.sanitizeSvg = false`. **No recomendado** salvo que vos generes los SVGs.

---

## "Card order" se vuelve raro después de drag-and-drop

**Causa:** bug conocido si arrastrás mientras la app está guardando. (En general, no debería pasar — el form espera el save.)

**Fix:** `/admin` → **Avanzado** → **Recargar** (descarta cambios locales) y volvé a arrastrar.

---

## La página tarda mucho en cargar

**Causa probable:** una o más tarjetas están intentando cargar assets pesados (imágenes de 5MB sin procesar, fonts externos, etc).

**Diagnóstico:**

1. Abrí DevTools (F12) → Network.
2. Identificá el request lento.
3. Si es una imagen, redimensioná la original o dejá que `processImages: true` la optimice.
4. Si es una font de Google, `fontUrl` puede ser lento en ciertas regiones — usá `system-ui`.

---

## "Caddy no arranca, port 80 already in use"

```bash
sudo ss -tlnp | grep :80
# o
sudo lsof -i :80
```

Mata el proceso que está usando el 80 (Apache, Nginx, lighttpd viejos) o cambiá Caddy a otro puerto:

```caddyfile
home.example.com {
    bind 0.0.0.0:8080
    ...
}
```

---

## "ACME challenge failed" con Caddy

Caddy no puede pedir el cert a Let's Encrypt. Diagnóstico:

```bash
# 1. DNS apunta a tu IP pública?
dig +short home.example.com
# → tu.IP.publ.ica

# 2. Puerto 80 abierto?
curl http://tu.IP.publ.ica
# → debería responder Caddy con un redirect a HTTPS

# 3. Logs de Caddy
docker logs umbral-caddy | tail -20
# → debería mostrar el ACME challenge fallando
```

Causas comunes:
- DNS no actualizado (apuntás a la IP vieja).
- Puerto 80 cerrado en el firewall.
- Cloudflare proxy con "Full" en vez de "Full (strict)" — Caddy no puede renovar.
- Otro container/proceso en el puerto 80.

---

## Los assets no se ven después de importar config

**Causa:** el botón **Import** del admin sólo importa el `config.json`, no los archivos de `uploads/`. Si importás en otro server sin copiar `uploads/`, los assets referenciados no existen.

**Solución:**

- **Migración completa:** copiá `data/uploads/` aparte (vía `docker cp` o volume backup) además del config.
- **Re-subir:** andá a `/admin` → **Assets** y re-subí los archivos.

---

## "Cannot find module '@img/sharp-linuxmusl-x64'"

**Causa:** la imagen Docker asume `linuxmusl-x64` (Alpine). Si estás corriendo en otro OS/arch (RHEL, ARM, etc), sharp no encuentra el binario.

**Solución:**

- **Usar la imagen Docker oficial** (ya trae el binario correcto para linuxmusl-x64).
- **O rebuildear la imagen** desde source. Editá el `Dockerfile` y sacá el `RUN cd /app/node_modules/@img && for d in */; do ...` que strippea los otros binarios. Después `sharp` se va a rebuildear al instalar dependencias nativas.
- **O instalá el binario de tu plataforma:**
  ```bash
  npm install @img/sharp-linux-x64   # RHEL/CentOS x64
  # o
  npm install @img/sharp-linux-arm64 # ARM64
  ```

---

## Healthcheck falla intermitentemente

**Causa:** el healthcheck (`wget http://127.0.0.1:4321/api/health`) es un HEAD-like request. Si el proceso está bajo carga, puede tardar más de 5s.

**Solución:** subí el `timeout` en `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "-O-", "http://127.0.0.1:4321/api/health"]
  interval: 30s
  timeout: 10s     # era 5s
  retries: 3
  start_period: 15s
```

---

## Problema no listado

1. **Logs del container:** `docker logs umbral 2>&1 | tail -50` (o `journalctl -u umbral -n 50`).
2. **Healthcheck manual:** `curl -v http://localhost:3000/api/health`.
3. **Disco lleno:** `df -h` (el container puede haber dejado de escribir el audit log).
4. **Memoria:** `docker stats umbral` (si llegó al límite, OOM killer lo mató — los logs van a decir `Killed`).

Si nada de eso da pistas, abrí un issue con:
- Versión de la app (de `package.json` o el tag de la imagen).
- Output de `docker logs umbral` (al menos las últimas 50 líneas).
- Output de `curl -v http://localhost:3000/api/health`.
- Tu `docker-compose.yml` y `.env` (con secrets redactados).

# Quickstart Docker

> **Tiempo total: 2 minutos.** Si ya tenés Docker instalado, copiá y pegá.

## 1. Levantar el container

```bash
docker run -d \
  --name atajo \
  -p 3000:4321 \
  -e INITIAL_PASSWORD=cambiame \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -v atajo-data:/app/data \
  --restart unless-stopped \
  ghcr.io/<user>/atajo:latest
```

Si todavía no tenés la imagen (`ghcr.io/<user>/atajo:latest`), reemplazá esa línea por la imagen local que construiste con `docker build`, o usá la imagen que viene en el repo de tu organización.

Si querés probar **sin generar SESSION_SECRET** (sólo para development, **no para producción**):

```bash
docker run -d \
  --name atajo \
  -p 3000:4321 \
  -e INITIAL_PASSWORD=cambiame \
  -v atajo-data:/app/data \
  ghcr.io/<user>/atajo:latest
```

El server te va a loguear un warning diciendo que el secret es débil. Para producción usá siempre el primer comando.

## 2. Abrir

- **Portada pública:** <http://localhost:3000>
- **Panel admin:** <http://localhost:3000/admin>

Login con la password que pusiste en `INITIAL_PASSWORD` (en este ejemplo, `cambiame`). Cambiala inmediatamente desde el panel.

## 3. Agregar tu primera tarjeta

1. En el panel, tab **Tarjetas** → **+ Nueva tarjeta**
2. Título: lo que quieras (ej: "Mattermost")
3. URL: la URL de tu herramienta interna
4. Categoría: elegí una existente o creá una nueva en el tab **Categorías**
5. **Guardar** → **Guardar cambios** (arriba a la derecha)

Listo. Recargá la portada y tu tarjeta aparece.

## 4. Comandos útiles

```bash
# Ver logs
docker logs -f atajo

# Parar
docker stop atajo

# Arrancar de nuevo
docker start atajo

# Borrar todo (config + uploads + audit log)
docker rm -f atajo && docker volume rm atajo-data
```

## Próximos pasos

- [Docker (completo)](./docker.md) — setup con `docker-compose`, healthcheck, custom networks
- [Caddy reverse proxy](./caddy.md) — HTTPS automático con un dominio real
- [Hardening / seguridad](../config/security.md) — CSP, HSTS, rate limit y más

## Troubleshooting

**"Connection refused" al abrir localhost:3000**
El container está arrancando. Esperá 2-3 segundos y recargá. Para ver el estado: `docker logs atajo`.

**"404 en /admin"**
Estás yendo a `http://localhost:3000/admin` pero el container no está corriendo. Verificá: `docker ps | grep atajo`.

**"Auth no inicializado"**
Pasó si editaste `data/config.json` a mano y borraste el campo `auth`. Solución:
```bash
docker stop atajo
docker volume rm atajo-data
docker run -d ... (el mismo comando de arriba)
```

**Olvidé la password**
```bash
docker stop atajo
# Editar el config para resetear auth:
docker run --rm -v atajo-data:/data alpine sh -c \
  "rm /data/config.json"
docker start atajo
# Re-crea con INITIAL_PASSWORD nuevo
```

Más en [Troubleshooting](../usage/troubleshooting.md).

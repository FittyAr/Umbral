# Legacy Umbral — Dockerfile variant

Variante del Dockerfile principal para servidores con hardware antiguo que
**no soporta la microarquitectura x86_64-v2** (típicamente CPUs pre-2011:
Atom, Celeron viejo, Xeon pre-Sandy Bridge, etc.).

## Por qué existe

`sharp@0.35+` — la versión que usa Umbral por defecto — sólo publica
prebuilt binaries para CPUs x86_64-v2+. Si tu server tiene un CPU más viejo,
el build falla con:

```
Error: Could not load the "sharp" module using the linuxmusl-x64 runtime
Unsupported CPU: Prebuilt binaries for Linux x64 require v2 microarchitecture
```

Este directorio contiene un Dockerfile que downgrades sharp a `0.33.5`
(la última versión con prebuilts para v1) **dentro del paso de build,
sin tocar `package.json` ni `package-lock.json` del proyecto principal**.

El proyecto principal (la raíz) sigue usando el Dockerfile estándar, así
que la instalación default no se ve afectada.

## Trade-off

`sharp@0.33.5` usa `libvips@8.15.1`, que tiene CVEs de buffer overflow
arreglados en versiones posteriores. Para un portal interno con usuarios
de confianza, el riesgo es bajo. **Cuando el server se modernize, volver
al Dockerfile principal** y borrar este directorio.

## Cómo usarlo

Desde la raíz del proyecto (donde está el `docker-compose.yml` principal):

```bash
# Build de la imagen legacy
docker compose -f legacy/docker-compose.yml build

# Levantar el contenedor (puerto 4321, volumen dedicado)
docker compose -f legacy/docker-compose.yml up -d

# Ver logs
docker compose -f legacy/docker-compose.yml logs -f

# Frenar
docker compose -f legacy/docker-compose.yml down
```

El contenedor se llama `umbral-legacy` y usa el volumen `umbral-data-legacy`,
así que **no choca con la instalación estándar** (que usa `umbral` /
`umbral-data`). Si querés correr ambos a la vez, cambiá el `ports:` en este
compose a `"4322:4321"` y exponé el legacy en otro puerto.

## Configuración

El `docker-compose.yml` lee el `.env` de la raíz del proyecto (`env_file:
../.env`). Si necesitás variables distintas para la instalación legacy,
copiá el `.env` a `legacy/.env` y editá el `env_file` en el compose.

## Cómo borrarlo

Cuando ya no haga falta (server modernizado, o lo que sea):

```bash
# Parar y borrar el contenedor
docker compose -f legacy/docker-compose.yml down

# Borrar la imagen
docker rmi umbral:legacy

# Borrar el volumen (CUIDADO: borra data/uploads y data/config.json)
docker volume rm umbral-data-legacy

# Borrar el directorio
rm -rf legacy/

# Commit del cleanup
git add -A && git commit -m "chore: remover variante legacy (server modernizado)"
```

Hecho. El proyecto principal queda intacto.

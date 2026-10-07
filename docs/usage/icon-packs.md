# Guía de Paquetes de Íconos (Git Icon Packs)

Umbral incluye un gestor nativo de paquetes de íconos que permite descargar e instalar miles de íconos vectoriales SVG desde repositorios Git oficiales o personalizados, almacenándolos en disco para su uso totalmente offline.

---

## 📦 Paquetes Oficiales Disponibles

Desde la pestaña **Git Íconos** en el panel administrativo, puedes instalar con un solo clic:

1. **Lucide Icons (`lucide`):** Colección moderna y consistente de íconos de interfaz (más de 1,400 íconos).
2. **Simple Icons (`simple-icons`):** Logotipos vectoriales oficiales de marcas, lenguajes de programación, herramientas de desarrollo y plataformas cloud (más de 3,000 marcas).
3. **Dashboard Icons (`dashboard-icons`):** Especializado en logos de servicios homelab, NAS, media servers y utilidades self-hosted.
4. **Tabler Icons (`tabler`):** Más de 4,000 íconos vectoriales de trazo limpio.

---

## 🔗 Repositorios Git Personalizados

Además de los paquetes del catálogo oficial, puedes conectar cualquier repositorio Git que contenga archivos `.svg`:
- **URL del Repositorio:** `https://github.com/usuario/mi-pack-iconos`. **Sólo `https`**: se rechazan `http://`, `git://`, `ssh://`, `file://`, URLs con credenciales y cualquier cosa que empiece con `--` (los SVG del pack terminan servidos desde el origen de Umbral, así que tienen que llegar por un canal autenticado).
- **Subdirectorio (opcional):** Carpeta interna donde residen los SVGs (ej. `icons/svg/`).
- **Almacenamiento Local:** Los íconos se clonan y extraen en `data/icon-packs/<nombre-pack>/`.

---

## 🔒 Límites y Sanitización

Instalar un pack es bajar contenido de un tercero y servirlo desde tu dominio, así que la instalación es defensiva:

- **Topes de tamaño:** el ZIP descargado no puede pasar de 300 MB, cada SVG de 1 MB (los más grandes se saltean), la suma extraída de 200 MB y la cantidad de archivos de 50.000. Un pack que excede los totales se corta en vez de llenar el disco (zip bomb).
- **Sanitización:** cada SVG pasa por **DOMPurify** antes de guardarse: se van los `<script>`, los handlers `on*` y las referencias externas. Además `/api/icons/*` los sirve con una CSP `sandbox` propia.
- **Sin salirse del clone:** el recorrido del repositorio no sigue symlinks que apunten afuera, y dos íconos con el mismo nombre no se pisan.
- **Instalación atómica:** el pack se arma en un directorio temporal y recién al final reemplaza al instalado; el registro de packs se escribe de forma atómica. Una instalación que falla a mitad de camino deja el pack anterior intacto.
- **Desinstalar** valida el `packId`: no se puede usar para borrar nada fuera de `data/icon-packs/`.
- Instalar y desinstalar packs requiere rol `admin`.

---

## 🎨 Uso en Tarjetas y Categorías

### Sintaxis Calificada
Los íconos se referencian internamente con el formato `<pack>/<nombre-icono>`:
- `lucide/server`
- `simple-icons/grafana`
- `simple-icons/docker`
- `dashboard-icons/plex`

### Selector Visual Integrado (Icon Picker)
Al crear o editar una tarjeta o categoría:
- Haz clic en el selector de íconos para abrir el modal de búsqueda.
- Escribe el nombre o alias del servicio para filtrar en tiempo real entre todos los paquetes instalados.
- Selecciona el ícono deseado y Umbral lo vinculará automáticamente.

---

## ⚡ Rendimiento y Modo Offline
- **Zero CDN:** Los íconos se sirven directamente desde el servidor local (`/api/icons/<pack>/<name>.svg`), por lo que funcionan perfectamente en intranets aisladas sin acceso a Internet.
- **Lookup en Memoria:** El servidor mantiene un índice en memoria de los íconos instalados, evitando accesos innecesarios al disco en cada renderizado.

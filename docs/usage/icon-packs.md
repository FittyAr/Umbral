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
- **URL del Repositorio:** `https://github.com/usuario/mi-pack-iconos`
- **Subdirectorio (opcional):** Carpeta interna donde residen los SVGs (ej. `icons/svg/`).
- **Almacenamiento Local:** Los íconos se clonan y extraen en `data/icon-packs/<nombre-pack>/`.

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

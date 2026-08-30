# Personalización Visual y Temas en Umbral

Umbral ofrece un sistema de diseño visual flexible y de alto rendimiento que permite personalizar completamente el aspecto de la portada y de las tarjetas sin depender de frameworks pesados de CSS.

---

## 🎨 Galería de Presets Integrados

Umbral incluye **8 temas predefinidos con paletas duales completas** (optimizadas para modo claro y oscuro):

| Preset | Características Visuales | Tono Predominante |
|---|---|---|
| **Midnight** | Gradiente azul medianoche profundo con desenfoque suave. Tema por defecto. | Azul oscuro / Índigo |
| **Ocean** | Tonos marinos profundos con alto contraste para texto claro. | Azul océano |
| **Forest** | Verde esmeralda y musgo con toques orgánicos. | Verde natural |
| **Sunset** | Degradados cálidos en tonos ámbar, naranja y magenta. | Atardecer cálido |
| **Corporate** | Esquema sobrio, limpio y profesional con contraste optimizado para oficinas. | Gris pizarra / Azul marino |
| **Terminal** | Fondo negro absoluto (`#000000`) con acentos verde fósforo estilo consola hacker. | Monocromático / Verde |
| **Glass Aurora** | Efecto glassmorphism avanzado con halos en púrpura y magenta. | Púrpura galáctico |
| **Minimal Mono** | Escala de grises minimalista en blanco y negro de máxima claridad. | Monocromo |

> 💡 **Presets personalizados:** Puedes guardar hasta 5 configuraciones de tema propias directamente desde el panel para reutilizarlas o exportarlas en formato JSON.

---

## 🖼️ Fondos Independientes por Modo (Light & Dark)

Umbral soporta fondos diferenciados para el modo oscuro (`theme.background`) y el modo claro (`theme.backgroundLight`):

1. **Creador Visual de Gradientes:**
   - Permite ajustar ángulos interactivos (de 0° a 360°) y múltiples paradas de color con selector visual.
   - Genera automáticamente código CSS válido (`linear-gradient`, `radial-gradient`).
2. **Color Sólido:**
   - Permite seleccionar un color hexadecimal fijo.
3. **Imagen de Fondo:**
   - Selecciona imágenes cargadas en el gestor de assets (`/api/assets/...`).
   - Se optimiza con **Desenfoque (Blur de 0 a 40px)** y **Capa de superposición (Overlay de 0 a 1)** para garantizar legibilidad del texto.
4. **Duplicación con Un Clic:**
   - Botón "Copiar de otro modo" para transferir la configuración de un modo al otro instantáneamente.

---

## 🃏 Estilos de Tarjetas

La propiedad `theme.cardStyle` define la estética de los contenedores de enlaces y notas:

- **`glass` (Glassmorphism, por defecto):** Utiliza `backdrop-filter: blur(12px)` con fondos translúcidos y bordes sutiles.
- **`flat`:** Tarjetas sólidas con fondo opaco y sombras suaves.
- **`outlined`:** Fondos transparentes con bordes nítidos de 1px o 2px.

---

## 🔠 Tipografías y Carga Segura

El selector de fuentes soporta una lista curada de tipografías populares de Google Fonts y fuentes del sistema:
- **Fuentes sans-serif:** `Inter` (por defecto), `Roboto`, `Outfit`, `Poppins`, `Montserrat`, `Open Sans`.
- **Fuentes monoespaciadas:** `Fira Code`, `JetBrains Mono`.
- **Fuentes del sistema:** `system-ui` (costo de red cero).

La URL de fuentes (`theme.fontUrl`) se valida de forma estricta contra el dominio oficial `fonts.googleapis.com` para prevenir inyecciones de código.

---

## 🎬 Sistema de Animaciones CSS

Cuando la feature `animations` está activa, Umbral inyecta estilos CSS puros para transiciones fluidas:

### Efectos Disponibles
- **Entrada de tarjetas (`cardEntrance`):** `fade`, `scale`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`, `blur`.
- **Retardo escalonado (`cardEntranceStagger`):** De 0 a 100ms entre tarjetas consecutivas para generar un efecto de cascada natural.
- **Hover en tarjetas (`cardHover`):**
  - `lift`: Elevación vertical sutil con sombra dinámica.
  - `grow`: Aumento de escala suave (1.03x).
  - `glow`: Resplandor perimetral con el color de acento.
  - `tilt`: Inclinación en perspectiva 3D.
- **Efectos de encabezado:** Título con efecto de máquina de escribir y contadores de apps animados.

### Accesibilidad Nativa
Todas las animaciones respetan automáticamente la preferencia `@media (prefers-reduced-motion: reduce)` del sistema operativo del visitante si `respectReducedMotion` está habilitado.

---

## 🧩 Widgets de Interfaz

En `theme.widgets` se pueden encender o apagar los componentes de la interfaz:
- **Reloj:** Posicionamiento a la izquierda o derecha del encabezado, en formatos 12h o 24h.
- **Botón de refresco:** Permite a los usuarios recargar la lista de servicios en caliente.
- **Barra de estado:** Contador de aplicaciones y estado general del sistema.
- **Interruptor de tema:** Toggle para alternar entre modo claro y oscuro.
- **Opacidades:** Ajuste de transparencia del encabezado y pie de página.

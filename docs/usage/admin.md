# Panel de Administración

El panel de administración de **Umbral** (`/admin`) permite gestionar toda la configuración, personalización visual, seguridad, usuarios, herramientas y extensiones de la plataforma de forma interactiva y sin necesidad de bases de datos.

---

## 🔐 Acceso y Layout General

- **Ruta de acceso:** `https://tu-servidor/admin`
- **Autenticación inicial:** Contraseña definida en la variable de entorno `INITIAL_PASSWORD` (por defecto `admin`).
- **Encabezado superior:**
  - **Indicador de cambios sin guardar:** Se ilumina cuando se modifica cualquier campo en los formularios.
  - **Botón Recargar:** Descarta los cambios en memoria y vuelve a cargar la configuración persistida en `data/config.json`.
  - **Botón Guardar cambios:** Valida los datos con esquemas Zod en el servidor, persiste la configuración en disco de forma atómica y actualiza la sesión.
- **Acceso rápido al portal:** Botón "Ver Portada" para previsualizar el portal público en tiempo real.
- **Cambio de tema:** Selector de modo claro/oscuro para la interfaz administrativa.
- **Cierre de sesión:** Botón "Cerrar sesión" que invalida la cookie firmada.

---

## 🗂️ Guía Detallada de Pestañas y Módulos

### 1. Branding (Marca e Identidad)
Configura la presencia visual de la organización en la portada y pestañas del navegador:
- **Nombre de la empresa:** Texto visible en el encabezado principal (`<h1>`) y en la etiqueta `<title>` de la página (hasta 80 caracteres).
- **Logo del portal:** Permite seleccionar una imagen cargada en el gestor de assets (PNG, JPG, WebP, SVG). Si no se define ningún logo, la interfaz genera un avatar tipográfico con la inicial del nombre.
- **Favicon personalizado:** Permite asociar un ícono subido para la pestaña del navegador (soporta `.ico`, `.svg` y `.png`).

---

### 2. Tema (Theme & Estilos)
El motor de temas de Umbral permite personalizar el diseño con previsualización en vivo:

#### A. Presets de Temas Predefinidos
Colección de 8 paletas listas para usar con variantes independientes para modo claro y oscuro:
1. **Midnight:** Degradado azul medianoche profundo (tema default de Umbral).
2. **Ocean:** Tonos azul marino profundos inspirados en el océano.
3. **Forest:** Verdes naturales y orgánicos.
4. **Sunset:** Gradientes cálidos en tonos naranja y rojizo.
5. **Corporate:** Diseño limpio, sobrio y profesional con alto contraste.
6. **Terminal:** Fondo negro puro con acentos en verde fósforo estilo consola.
7. **Glass Aurora:** Efecto glassmorphism con halos en tonos púrpura y magenta.
8. **Minimal Mono:** Escala de grises minimalista de alta legibilidad.

#### B. Fondos (Backgrounds Independientes por Modo)
Configuración separada para el **Modo Oscuro** y el **Modo Claro**:
- **Tipo de fondo:**
  - *Gradiente:* Creador visual interactivo (ángulo de 0 a 360°, colores inicial, intermedio y final) o CSS personalizado.
  - *Color sólido:* Selector de color hexadecimal.
  - *Imagen subida:* Selector de imágenes optimizadas desde el gestor de assets.
- **Desenfoque (Blur):** Desenfoque gaussiano de 0 a 40px sobre la imagen o gradiente de fondo.
- **Capa de superposición (Overlay):** Opacidad (0 a 1) y color de la capa de oscurecimiento o aclarado.
- **Botón Copiar:** Permite duplicar la configuración del modo oscuro hacia el modo claro con un solo clic.

#### C. Colores y Contraste
- **Color de acento:** Color principal para estados activos, bordes destacados, botones y efectos hover.
- **Escala de texto (Text Ramp):** Colores de texto primario y secundario configurables para modo claro y oscuro.
- **Tintado de íconos:** Modos de color para los íconos de las tarjetas (Original sin tintar, Color de acento, Color de texto o Color personalizado).
- **Indicador de contraste WCAG AA:** Comprobación automática de contraste entre el texto y el fondo para garantizar accesibilidad.

#### D. Tipografía
- **Fuentes integradas:** Inter, Roboto, Outfit, Poppins, Montserrat, Open Sans, Fira Code, JetBrains Mono, o `system-ui`.
- **Carga optimizada:** Conexión segura a Google Fonts o uso de fuentes locales del sistema operativo.
- **Muestra tipográfica:** Visualizador interactivo de títulos, párrafos y metadatos en tiempo real.

#### E. Estilos de Tarjetas y Agrupación
- **Estilo visual:**
  - *Glass (Glassmorphism):* Fondo semitransparente con desenfoque de fondo (`backdrop-filter`).
  - *Flat:* Tarjetas sólidas opacas de alto rendimiento.
  - *Outlined:* Tarjetas con borde definido y fondo transparente.
- **Disposición de grupos:**
  - *Vertical:* Categorías apiladas una debajo de otra.
  - *Horizontal:* Categorías distribuidas en columnas paralelas.

#### F. Widgets del Encabezado y Pie
- **Reloj digital:** Posicionamiento (izquierda/derecha), formato 24h/12h con segundos.
- **Botón de refresco:** Botón para recargar la configuración del portal sin recargar el navegador.
- **Barra de estado:** Contador de aplicaciones y estado general de la red.
- **Selector de tema:** Interruptor rápido para alternar entre modo claro y oscuro.
- **Opacidad de barras:** Ajuste de transparencia para la cabecera y el pie de página.

#### G. Animaciones CSS (Rendimiento y Accesibilidad)
- **Efecto de entrada de tarjetas:** Fade in, Scale, Slide Up, Slide Down, Slide Left, Slide Right, Blur in.
- **Curvas de aceleración:** Ease-out, Ease-in-out, Linear, Spring (rebote elástico).
- **Retardo escalonado (Stagger):** Retardo progresivo entre tarjetas para una cascada fluida.
- **Efecto al pasar el cursor (Hover):** Elevación (Lift), Aumento (Grow), Resplandor (Glow), Inclinación 3D (Tilt).
- **Efectos de encabezado:** Título con efecto de máquina de escribir y contadores numéricos animados.
- **Respeto a Accesibilidad (`prefers-reduced-motion`):** Desactiva automáticamente las animaciones si el usuario lo configuró en su sistema operativo.

---

### 3. Layout (Distribución y Espaciados)
- **Grilla por Breakpoints:**
  - *Desktop (>1024px):* 2 a 8 columnas configurables.
  - *Tablet (640px–1024px):* 2 a 6 columnas configurables.
  - *Mobile (<640px):* 1 a 3 columnas configurables.
- **Espaciados Milimétricos (en `rem`):**
  - *Espaciado entre tarjetas (`gap`):* Distancia entre tarjetas en la misma grilla.
  - *Espaciado entre categorías (`categoryGap`):* Separación vertical entre bloques de categorías.
  - *Espaciado de tarjetas sueltas (`ghostCategoryGap`):* Margen específico para bloques de tarjetas sin categoría.
- **Dimensiones de Tarjetas:** Tamaños Small, Medium y Large, junto con el radio de redondeo de esquinas (`cardRadius`).
- **Modo Compacto:** Reduce a la mitad los márgenes para maximizar la densidad de información en pantallas de monitoreo o NOCs.
- **Intervalo de Health Check:** Frecuencia de verificación en segundo plano para servicios monitoreados (de 10s a 3600s).

---

### 4. Categorías
Permite estructurar las aplicaciones y servicios:
- **CRUD Completo:** Creación, edición, cambio de orden mediante arrastre y eliminación segura.
- **Íconos por Categoría:** Selección de íconos desde los paquetes instalados (Lucide, Simple Icons, etc.).
- **Categorías Bloqueadas con Contraseña (Locked):** Protege tarjetas sensibles requiriendo una contraseña para desbloquear y visualizar los enlaces.
- **Subpáginas (Subpage):** Categorías que no se muestran en la portada principal sino en su propia ruta `/categoria` con botón de regreso.
- **Categorías Fantasma (Ghost):** Bloques sin encabezado que permiten intercalar tarjetas libres entre secciones.

---

### 5. Tarjetas (Cards)
El núcleo operativo de Umbral:
- **Tipos de Tarjeta:**
  - *Link:* Enlace navegable con URL interna o externa y opción de abrir en nueva pestaña.
  - *Nota (Note):* Tarjeta informativa (anuncios, recordatorios, credenciales públicas, tips) sin enlace.
- **Soporte Markdown en Notas:** Permite texto enriquecido, listas, negritas, código en línea y enlaces sanitizados con DOMPurify.
- **Ancho Multicolumna (Span):** Permite que una tarjeta ocupe de 1 a N columnas en desktop y tablet (ideal para notas descriptivas o monitores anchos).
- **Etiquetas (Tags):** Sistema de tags transversales en minúsculas para búsqueda instantánea desde la barra de filtrado (`/`).
- **Tarjetas Fijadas (Pinned):** Destaca servicios críticos mostrándolos en primer lugar con un pin visual.
- **Monitoreo de Estado (Health Check):** Activa el ping periódico a la URL del servicio para mostrar badges de latencia y estado (verde/rojo/ámbar).
- **Auto-completar Inteligente:** Al ingresar una URL, Umbral consulta el sitio para extraer automáticamente título, descripción e ícono SVG/favicon, con fallback a buscadores externos.
- **Mejora con IA:** Botón para reescribir y profesionalizar el título y descripción mediante LLMs.

---

### 6. Assets (Gestor de Archivos)
- **Subida Segura:** Validación en backend de magic-bytes para prevenir archivos maliciosos (PNG, JPG, WebP, SVG, ICO).
- **Procesamiento con Sharp:** Redimensionamiento y optimización de imágenes en el servidor.
- **Sanitización de SVG:** Limpieza profunda de código script y eventos maliciosos en vectores mediante DOMPurify y JSDOM.
- **Eliminación y Vista Previa:** Visualización en miniatura y eliminación de archivos huérfanos.

---

### 7. Status (Monitoreo en Tiempo Real)
- **Diagnóstico en Vivo:** Ejecución manual o periódica de pruebas de conectividad contra todas las tarjetas monitoreadas.
- **Tiempos de Respuesta:** Medición exacta de latencia en milisegundos y códigos de respuesta HTTP.
- **Detección de Fallas:** Identificación instantánea de certificados SSL caducados, timeouts o errores 4xx/5xx.

---

### 8. Hardening (Seguridad del Servidor)
- **Content Security Policy (CSP):** Directivas estrictas para scripts, estilos, fuentes, imágenes y conexiones.
- **HTTP Strict Transport Security (HSTS):** Forzado de HTTPS con directivas `max-age`, `includeSubDomains` y `preload`.
- **Rate Limiting:** Control de peticiones por IP para prevenir ataques de denegación de servicio y fuerza bruta.
- **Límite de Tamaño de Body:** Protección contra cargas masivas que agoten la memoria del contenedor.
- **Lista Blanca de Tipos MIME:** Restricción estricta de subidas permitidas.
- **Protección contra SSRF:** Bloqueo de peticiones dirigidas a IPs privadas críticas y servicios de metadata cloud (`169.254.169.254`, etc.).

---

### 9. Seguridad y Usuarios (Password, Multi-User & 2FA)
- **Contraseña Super-Admin:** Hash encriptado con bcrypt (cost 12) y protección ante timing-attacks.
- **Modo Multi-Usuario:**
  - *Roles disponibles:* `admin` (control total), `editor` (gestión de tarjetas/categorías), `viewer` (solo lectura).
  - *Gestión de cuentas:* Creación de usuarios con credenciales individuales.
- **Autenticación en Dos Pasos (2FA / TOTP):** Compatible con Google Authenticator, Aegis, 1Password, Bitwarden, etc., incluyendo códigos de recuperación de un solo uso.

---

### 10. Asistente de IA (AI Assistant)
- **Proveedores Compatibles:** OpenAI, Anthropic, Groq, Ollama (local) o cualquier endpoint compatible con la API de OpenAI.
- **Funcionalidades:**
  - Autocompletado de descripciones a partir de nombres de servicios.
  - Ajuste de tono, brevedad y corrección ortográfica en tarjetas.
  - Soporte de claves API locales protegidas en servidor.

---

### 11. Webhooks de Notificación
- **Disparadores:** Alertas automáticas cuando un servicio cambia de estado (de OK a Caído, o tras su recuperación).
- **Integraciones:** Plantillas prediseñadas para Slack, Discord, Mattermost, ntfy.sh, Gotify y Webhook JSON genérico.
- **Filtros Anti-Spam:** Umbral de fallos consecutivos antes de notificar y tiempo de enfriamiento (cooldown).

---

### 12. Ventanas de Mantenimiento
- **Programación:** Definición de fecha/hora de inicio y finalización para mantenimientos programados.
- **Silenciamiento de Alertas:** Durante la ventana, los servicios en mantenimiento no disparan webhooks de falla.
- **Badge Visual:** Las tarjetas muestran un indicador ámbar de "Mantenimiento" para informar a los usuarios.

---

### 13. Auditoría (Audit Log Viewer)
- **Registro Inmutable:** Historial de eventos administrativos en `data/audit.log` (inicios de sesión, cambios de configuración, subida de archivos).
- **Visor Integrado:** Búsqueda en vivo, filtrado por rango de fechas, tipo de acción y usuario responsable.
- **Exportación:** Descarga del registro completo en formato JSON o CSV.

---

### 14. Métricas de Latencia
- **Historial de Desempeño:** Ring-buffer en memoria que almacena las últimas 100 muestras de latencia por servicio.
- **Cálculo Estadístico:** Promedio, percentil 95 (p95) y latencia máxima.
- **Visualización:** Gráficos sparkline compactos en el panel de métricas.

---

### 15. OIDC / Single Sign-On (SSO)
- **Protocolo OpenID Connect:** Integración con Keycloak, Authentik, Google Workspace, Okta, Azure AD / Entra ID.
- **Aprovisionamiento Just-in-Time:** Creación automática de perfiles de usuario al autenticarse mediante SSO.
- **Mapeo de Roles:** Asignación automática de privilegios según los grupos del proveedor de identidad.

---

### 16. API Tokens (Automatización y CLI)
- **Tokens de Larga Duración:** Generación de claves con prefijo `umb_` para scripts externos, GitHub Actions o el CLI de Umbral.
- **Permisos Granulares (Scopes):** `read` (lectura de estado y configuración) y `write` (modificación y despliegues).
- **Revocación:** Anulación instantánea de tokens comprometidos o en desuso.

---

### 17. Multi-Portal
- **Múltiples Portales en una Sola Instancia:** Permite gestionar dashboards independientes (ej. IT, Finanzas, DevOps).
- **Aislamiento Total:** Cada portal cuenta con su propio `config.json`, directorio de uploads y registro de auditoría.
- **Enrutamiento Flexible:** Detección automática por subdominio (`it.dominio.com`) o por prefijo de ruta (`dominio.com/it`).

---

### 18. Paquetes de Íconos Git (Icon Packs)
- **Instalación con Un Clic:** Descarga y almacenamiento local de bibliotecas completas de íconos SVG:
  - *Lucide Icons* (miles de íconos de interfaz modernos).
  - *Simple Icons* (logotipos oficiales de marcas, herramientas y lenguajes).
  - *Dashboard Icons* (íconos para homelab y self-hosted).
  - *Tabler Icons*.
- **Repositorios Git Personalizados:** Permite conectar cualquier repositorio Git público o privado.
- **Uso Offline:** Todos los íconos se sirven localmente desde el disco sin dependencias de CDNs externas.

---

### 19. Avanzado (Features & Mantenimiento de Configuración)
- **Feature Flags (Opt-in):** Cada funcionalidad avanzada se puede activar o desactivar individualmente. Las funciones apagadas tienen costo cero en memoria y red.
- **Idioma Predeterminado del Portal:** Selector para fijar el idioma inicial de la plataforma entre los 21 idiomas soportados.
- **Exportar Configuración:** Descarga una copia de seguridad en JSON del `config.json` activo.
- **Importar Configuración:** Carga y valida un archivo de configuración previo.
- **Restablecer a Valores de Fábrica:** Resetea los parámetros visuales y de grilla a los valores predeterminados de Umbral.

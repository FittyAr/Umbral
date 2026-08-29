# Panel de administración

> Tour por cada tab del panel. Asumimos que ya estás logueado en `/admin` con tu password.

## Acceso

```
https://tu-dominio/admin
```

Login con la password que pusiste en `INITIAL_PASSWORD` (o la que cambiaste desde **Password**).

## Layout general

- **Header:** título + badge "● Cambios sin guardar" (aparece cuando editaste algo y no guardaste) + botones **Recargar** y **Guardar cambios**.
- **Tabs:** cada tab es un panel con su propio formulario. Los cambios **no se persisten** hasta que apretás **Guardar cambios** (arriba a la derecha).
- **Atajos:**
  - El botón `● Cambios sin guardar` indica que hay cambios sin guardar.
  - `Recargar` descarta los cambios locales y vuelve a la versión persistida.
  - `Guardar cambios` manda el PUT a `/api/config` y refresca el estado.

> ⚠️ **Si navegás a otro tab o salís del admin con cambios sin guardar, los perdés.** No hay auto-save.

---

## Branding

Identidad visible. Cambiá el nombre de la empresa, logo y favicon.

- **Nombre de empresa** (1-80 chars): el `<h1>` del header y el `<title>` HTML.
- **Logo:** elegí un asset subido (PNG/JPG/SVG). Si no hay, se muestra la inicial.
- **Favicon:** elegí un asset subido. Default: el del repo.

**Tip:** subí primero el logo y favicon desde el tab **Assets**, después volvé a **Branding** y elegilos.

---

## Tema

Look and feel. Lo más divertido de tocar.

- **Tipo de fondo:** gradiente, color sólido o imagen.
- **Imagen de fondo:** dropdown con assets subidos (sólo si tipo=image).
- **CSS / Color:** textarea o color picker según el tipo. Default: `linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)`.
- **Blur (0-40):** desenfoca el fondo.
- **Overlay (0-1):** capa de color encima (opacidad).
- **Color overlay:** el color de la capa.
- **Color de acento:** highlights, íconos hover.
- **Color de texto:** color principal del texto.
- **Estilo de tarjeta:** glass, flat, outlined.
- **Tipografía:** whitelist de 10 Google Fonts + system-ui.
- **Modo de color:** auto, light, dark.

**Vista previa:** debajo de los controles, 2 cards "fantasma" que muestran el estilo actual. Iterá en vivo.

Ver [Personalización visual](../config/visual.md) para detalle.

---

## Layout

Cómo se distribuyen las tarjetas.

- **Columnas desktop (2-8):** > 1024px.
- **Columnas tablet (2-6):** 640-1024px.
- **Columnas mobile (1-3):** < 640px.
- **Tamaño de card:** small, medium, large.
- **Mostrar descripciones:** on/off.

El número de columnas es la base sobre la que se calcula el ancho de cada tarjeta: una tarjeta puede ocupar varias columnas de las que definís acá (ver [Tarjetas anchas](#tarjetas-anchas)).

### Espaciados

Tres controles independientes, todos en rem y con vista previa en vivo a la derecha:

- **Espaciado entre tarjetas** (0-3, default 1): distancia entre cards dentro de una misma grilla.
- **Espaciado entre categorías** (0-6, default 2): aire vertical con el que arranca cada bloque de categoría. Como es el espacio *de entrada*, también define cuánto se separa la primera categoría del encabezado de la página. En layout horizontal, donde las categorías son columnas lado a lado, el mismo valor controla el espacio entre columnas.
- **Espaciado de tarjetas sueltas** (0-6, default 0.35): aire antes de un bloque de tarjetas sin categoría. Estas viven en una *categoría fantasma*, un bloque sin título que aparece entre grupos; al no tener encabezado necesita mucho menos aire que una categoría normal, y por eso se configura aparte. Subilo para que las sueltas se lean como un bloque propio, o bajalo a 0 para pegarlas al grupo de arriba.

Si **Modo compacto** está activo, los dos espaciados de categoría se aplican a la mitad, así que siguen respetando lo que elijas en vez de saltar a un valor fijo.

---

## Categorías

Agrupan las tarjetas. Una categoría tiene:

- **id** (kebab-case, único): clave interna. Las tarjetas referencian con `category`.
- **name** (1-60 chars): lo visible.
- **icon** (Lucide): ícono que aparece al lado del nombre (decorativo).

**Operaciones:**
- **+ Agregar categoría:** crea con un id random y nombre "Nueva".
- **× Borrar:** borra la categoría. Las tarjetas que la usen se reasignan automáticamente a la primera categoría restante. No podés borrar la última categoría (te tira error).

**Tip:** tener 3-6 categorías. Más que eso satura la portada.

---

## Tarjetas

Lo central. CRUD + drag-and-drop + íconos.

### Listado

- Filtro arriba a la izquierda: filtra por título, descripción o URL.
- **+ Nueva tarjeta:** abre el modal de edición.
- **⋮⋮ (drag handle):** arrastrá para reordenar. El `order` se reasigna automáticamente.
- **Activa** (checkbox): si está off, la tarjeta no aparece en la portada.
- **Editar** / **×:** abrir el modal / borrar.

### Modal de edición

- **Título** (1-80 chars): el texto principal de la card.
- **URL:** URL `https://...` o path interno `/...` (ej: `/docs`).
- **Descripción** (≤200 chars): texto secundario debajo del título.
- **Categoría:** dropdown con las categorías existentes.
- **Color:** hex picker, override del accent color del tema.
- **Ancho (columnas):** cuántas columnas del grid ocupa la tarjeta (1 por defecto). Ver abajo.
- **Ícono:**
  - **Texto:** nombre Lucide (`chat`, `briefcase`, etc) o path `/api/assets/<file>`.
  - **Icon picker:** debajo, íconos predefinidos como botones (click para seleccionar).
  - **Limpiar:** vacía el ícono.
- **Abrir en nueva pestaña:** target=_blank o _self.
- **Activa:** mismo checkbox que en el listado.

**Click "Guardar"** en el modal no persiste — los cambios van al form principal. Apretá **Guardar cambios** arriba a la derecha para persistir todo.

### Tarjetas anchas

Una tarjeta puede ocupar varias columnas para darle más peso visual. Con 3 columnas configuradas en la pestaña Layout, una tarjeta de ancho 2 ocupa dos tercios de la fila y las demás siguen abajo; una de ancho 3 ocupa la fila entera.

**Se adapta solo a cada pantalla.** El valor se recorta a las columnas disponibles en cada breakpoint, así que no hay nada que configurar por dispositivo: si pedís 4 columnas pero en mobile tenés 1, ahí la tarjeta ocupa 1.

**Para "todo el ancho", elegí el máximo (8 columnas).** Como 8 es también el máximo que admite el layout en desktop, siempre se recorta al total configurado. La tarjeta queda full width incluso si después cambiás las columnas en la pestaña Layout — no hay que volver a tocarla.

El hint debajo del select te muestra el ancho real que va a tener con tu configuración actual de desktop, y en el listado aparece un badge con el ancho en las tarjetas de más de una columna.

Sólo cambia el ancho, no el alto ni el contenido. Una tarjeta muy ancha con poco texto puede verse vacía; conviene acompañarla con una descripción.

---

## Assets

Subida, listado y borrado de imágenes.

### Uploader

- **Drag & drop o click** en la zona punteada.
- **Tipo al subir:** elegí entre icono, logo, favicon o background. Cada tipo tiene un tamaño máximo distinto.
- **Límites:**
  - Logo: 1 MB.
  - Favicon: 256 KB.
  - Ícono: 512 KB.
  - Background: 5 MB.
- **MIME permitidos:** whitelist configurable en Hardening. Default: PNG, JPEG, WebP, SVG, GIF.

### Listado

Cada asset muestra:
- **Preview** (la imagen).
- **Nombre** del archivo.
- **Bytes** en KB.
- **Usado en:** qué lugares lo referencian (logo, favicon, fondo, categorías, tarjetas). Si está en uso, **no se puede borrar** (botón desactivado).
- **Copiar URL** / **🗑** borrar.

---

## Status

Ping HEAD a cada tarjeta activa. Útil para detectar servicios caídos.

- **Probar todas:** itera sobre todas las tarjetas activas, hace HEAD request a su URL, reporta estado + latencia.
- **Resultados:** badge verde (ok) o rojo (fallo), con el código HTTP o error.
- **Restricción:** sólo se prueban URLs públicas. URLs internas o con IP privada se rechazan (protección SSRF).

---

## Hardening

Todos los ajustes de seguridad. Defaults permisivos — endurecé lo que necesites.

Secciones:

- **Sesión y cookies:** TTL, SameSite, Secure flag, rotate CSRF.
- **Login y CSRF:** min password length, rate limit, política CSRF.
- **Uploads:** tamaños máximos por tipo, MIME allowlist, allow/sanitize SVG, procesar imágenes.
- **Red:** trustForwardedFor, cookie domain, trusted proxies.
- **Headers de seguridad:** X-Frame-Options, Referrer-Policy, CSP, Permissions-Policy.
- **HSTS:** modo (auto/always/never), max-age, includeSubDomains, preload.

Ver [Hardening / seguridad](../config/security.md) para el detalle de cada campo.

---

## Password

Cambiar la password del admin.

- **Actual:** tu password actual.
- **Nueva:** la nueva (min 8 en el form; el mínimo real se valida server-side con `cfg.security.auth.minPasswordLength`).
- **Confirmar:** misma nueva.

**Al cambiar:**
- Se rota el CSRF token.
- Se incrementa el `authEpoch` (todas las sesiones existentes se invalidan, menos la tuya que es la actual).

**CSRF Token:** debajo del form, el token actual (útil para integraciones con la API). Se rota al cambiar la password.

---

## Avanzado

Operaciones de mantenimiento.

### Export / Import

- **Descargar config.json:** baja un JSON con la config actual (sin los assets — sólo el `config.json`).
- **Importar config.json:** reemplazá la config completa con un JSON válido. **Los assets subidos NO se importan** — sólo las URLs a `/api/assets/...`. Si importás en otro server, los assets referenciados van a faltar.

### Healthcheck

- **Probar /api/health:** hace un GET al endpoint y muestra el JSON con uptime y ts.

### Reset a defaults

- **Reset a defaults:** restaura branding, theme, layout, security, categories, cards a los defaults de fábrica. **La password actual y el CSRF se preservan.**

---

## Logout

Arriba a la derecha: **Cerrar sesión**. Limpia la cookie de sesión.

---

## Tips de uso

- **Si rompés algo** y la app deja de responder, editá `data/config.json` a mano (con la app **detenida**) o usá el botón **Reset a defaults**.
- **Probar cambios sin miedo:** `/admin` → Avanzado → Reset a defaults siempre vuelve a un estado conocido.
- **Auditoría:** todas las acciones importantes se loguean en `data/audit.log`. `tail -f` desde el container o desde el host.
- **Múltiples admins:** no hay multi-user — es un solo password compartido. Si necesitás más, considerá un SSO o un proxy con auth.

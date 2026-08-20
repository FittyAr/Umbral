# Personalización visual

> Cómo customizar el look de la portada. Todo se hace desde el panel admin (`/admin`) o editando `data/config.json` directamente.

## Tabs relevantes

- **Branding** — nombre de la empresa, logo, favicon.
- **Tema** — fondo, colores, fuente, modo claro/oscuro, estilo de tarjeta.
- **Layout** — columnas, tamaño de card, descripciones.

## Branding

### Nombre de empresa

- Aparece en el `<h1>` del header y en el `<title>` HTML.
- Default: "Mi Empresa".
- 1-80 chars.

### Logo

- Si subís uno, aparece a la izquierda del título en el header.
- Si no, se muestra la **inicial** del nombre (ej: "A" para "Acme") en un cuadrado con el color de acento.
- Tamaño recomendado: 200x60 px, fondo transparente, PNG o SVG.
- Subilo desde `/admin` → tab **Assets** (kind: "logo"), después seleccionalo en **Branding**.

### Favicon

- El ícono que aparece en la pestaña del browser.
- 32x32 px, ICO o PNG.
- Default: el que viene en el repo (`public/favicon.svg`).

## Tema

### Fondo (`theme.background`)

Tres tipos:

#### Gradient (default)

CSS libre en `value`. Ejemplos:

```css
linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)
radial-gradient(ellipse at top, #1e293b, #0f172a)
conic-gradient(from 180deg at 50% 50%, #0f172a 0deg, #1e3a8a 180deg, #0f172a 360deg)
```

- **Blur (0-40 px):** desenfoca el fondo. Útil si querés un gradiente o color fuerte detrás sin que distraiga.
- **Overlay (0-1):** multiplica una capa de color encima. Útil para oscurecer y mejorar contraste con el texto.
- **Overlay color:** cualquier hex.

#### Color sólido

```css
#0f172a
#1a1a1a
white
```

#### Imagen subida

- Subila desde **Assets** (kind: "background"), después elegila en el dropdown.
- Tamaño recomendado: 1920x1080 o más, JPG o WebP.
- Si el archivo es muy pesado, la app lo redimensiona a 1920px max con sharp (si `processImages: true`).

### Estilo de tarjeta (`theme.cardStyle`)

- **glass (default):** `backdrop-filter: blur()` + fondo semitransparente. Look "glassmorphism".
- **flat:** fondo sólido sin bordes.
- **outlined:** solo borde, fondo transparente.

### Colores

- **`accentColor`** — color de los highlights, íconos hover, focus rings. Default `#60a5fa` (azul).
- **`textColor`** — color del texto principal. Default `#f1f5f9` (gris claro, para fondos oscuros).
- Cambialos con el color picker del panel.

> **Tip:** Si ponés `textColor` claro, mantené el fondo oscuro. Si claro, invertí.

### Tipografía (`theme.fontFamily`)

Whitelist de Google Fonts (los más comunes) + `system-ui`:

- Inter (default)
- Roboto
- Open Sans
- Lato
- Poppins
- Montserrat
- Source Sans 3
- Nunito
- Raleway
- system-ui (no carga Google Fonts, usa la del OS)

Si necesitás otra font de Google, editá el array en el admin (es un `<select>` con esas 10 opciones) o cambiá `fontUrl` a mano apuntando a la URL de `fonts.googleapis.com/css2?...`.

### Modo de color (`theme.colorMode`)

- **`auto` (default):** la app detecta `prefers-color-scheme` del OS. Si no hay nada, usa la hora local: claro entre 7 y 19, oscuro en otros rangos.
- **`light`:** forzado a claro. Útil si tu branding es claro.
- **`dark`:** forzado a oscuro.

El toggle en la portada (icono sol/luna) override el `colorMode` y persiste en `localStorage` del browser.

## Layout

### Columnas

- **`columnsDesktop` (2-8):** viewports > 1024px.
- **`columnsTablet` (2-6):** 640-1024px.
- **`columnsMobile` (1-3):** < 640px.

Tips:
- 4 columnas desktop + 2 mobile es el default balanceado.
- Si tenés muchas tarjetas (50+), subí desktop a 6 u 8.
- Si tenés poco texto y querés cards grandes, bajá a 2 o 3.

### Tamaño de card (`layout.cardSize`)

- **`small`:** ícono 24px, padding chico. Más cards visibles.
- **`medium` (default):** ícono 32px, balance.
- **`large`:** ícono 48px, padding generoso. Mejor para touch / kioskos.

### Descripciones

- **`showDescriptions` (true/false):** si false, oculta la línea de descripción debajo del título. Útil si tus tarjetas tienen sólo ícono + título.

## Íconos de tarjeta

Dos tipos:

### Íconos predefinidos (Lucide)

Whitelist de ~60 íconos. Lista en el panel admin al editar una tarjeta. Los más usados:

- `chat`, `message-square`, `mail` — comunicación
- `briefcase`, `box`, `package` — productividad
- `code`, `code-2`, `terminal`, `git-branch` — dev
- `file`, `file-text`, `folder`, `folder-open` — archivos
- `database`, `server`, `cloud` — infra
- `image`, `video`, `mic` — media
- `users`, `user`, `user-plus` — gente
- `lock`, `key`, `shield`, `shield-check` — seguridad
- `github`, `slack`, `globe` — externos
- `home`, `star`, `heart`, `settings`, `search`, `bell`, `calendar`, `clock`

Lista completa en `/admin` → Tarjetas → Editar → Icon picker.

### Assets subidos

- Subí PNG, JPEG, WebP, SVG, GIF desde el tab **Assets** (kind: "icon").
- Después, en la tarjeta, elegí `/api/assets/<nombre-archivo>` del dropdown.
- Tamaño recomendado: 128x128 px o 64x64 para favicons.

## Favicons y OG image

- **Favicon:** tab **Branding** → Favicon → seleccionar de Assets. 32x32 px.
- **Open Graph / Twitter card:** la app usa el logo como `og:image` automáticamente. Si no hay logo, no se setea.

## CSS vars que podés usar en custom themes

Si querés meter CSS custom (ej: en una extensión de la app), las variables que el theme emite son:

```css
:root {
  --accent: #60a5fa;
  --text: #f1f5f9;
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.page-wrap {
  --cols-mobile: 2;
  --cols-tablet: 3;
  --cols-desktop: 4;
}
```

## Vista previa

El tab **Tema** tiene una vista previa en vivo de 2 cards "fantasma" con el estilo actual. Útil para iterar sin tener que ir a la portada.

## Reset visual

Si la customización se te fue de las manos, `/admin` → tab **Avanzado** → **Reset a defaults** restaura TODO (incluido el theme). La password actual se preserva.

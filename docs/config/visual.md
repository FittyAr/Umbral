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

El tab **Tema** del admin está organizado en secciones: **Presets**, **Fondo**, **Colores**, **Tipografía**, **Tarjetas**, **Widgets** y **Avanzado** (design tokens).

### Presets (`theme` — galería)

Ocho presets built-in (Midnight, Ocean, Forest, Sunset, Corporate, Terminal, Glass Aurora, Minimal Mono) más hasta **5 presets custom** guardados desde el panel. Cada preset built-in define una **paleta dual completa**: fondo oscuro (`background`), fondo claro (`backgroundLight`) y tokens por modo (`theme.tokens.dark` / `theme.tokens.light`) con rampa de texto, superficies, bordes y acento. Los botones **Oscuro** / **Claro** aplican el preset y fijan el `colorMode` inicial; el toggle de la portada alterna entre ambas mitades de la paleta.

### Vista previa

- **Preview embebido** en el panel con toggle Dark / Light / Auto.
- **Abrir preview en pestaña** (`/?themePreview=1`) aplica el draft desde `localStorage` sin persistir.

### Fondo (`theme.background` / `theme.backgroundLight`)

- **`background`:** fondo del modo oscuro.
- **`backgroundLight` (opcional):** fondo del modo claro. Si falta, se reutiliza `background`.

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

- **`accentColor`** — color de los highlights, focus rings y (opcionalmente) tinte de iconos.
- **`textColor` (legacy)** — color escalar heredado; se asigna automáticamente al modo que corresponda por luminancia (claro → oscuro, oscuro → claro). Preferí overrides en `theme.tokens.dark.text` / `theme.tokens.light.text`.
- **`iconTint`** — `original` (default, sin tintar logos de marca) | `accent` | `text` | `custom` (usa `tokens[mode].icon`).
- Rampa de texto por modo: `text`, `textMuted`, `textSubtle`, `textFaint` en `theme.tokens.dark` / `theme.tokens.light`.

> **Tip:** El panel muestra un badge de contraste WCAG (AA ≥ 4.5:1) al editar `--text` contra `--surface`.

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

- **`auto` (default):** respeta `theme.autoStrategy`:
  - **`system` (default):** `prefers-color-scheme` del OS/navegador.
  - **`schedule`:** claro entre 7 y 19, oscuro en otros rangos.
- **`light`:** forzado a claro.
- **`dark`:** forzado a oscuro.

El toggle en la portada (icono sol/luna) override el `colorMode` y persiste en `localStorage`. Se puede ocultar con `theme.showModeToggle: false`.

### Widgets (`theme.showClock`, `showRefresh`, `showStatusBar`)

- **`showClock`:** reloj en vivo. Configurable: `clockPosition` (`header-left` | `header-right`), `clockFormat` (`12h` | `24h`).
- **`showRefresh`:** botón para recargar config sin refresh completo.
- **`showStatusBar`:** pie con versión + última actualización.
- **`headerOpacity` / `footerOpacity`:** opacidad del header y status bar (0–1).

### Animaciones (`theme.animations`) — opt-in

Requiere prender la feature `animations` en **Avanzado → Features**. La sección aparece
recién entonces en el tab Tema, y **todos los valores arrancan en "sin animación"**: prender
la feature no cambia nada de lo que se ve hasta que elijas un efecto.

- **`cardEntrance`:** `none` | `fade` | `scale`. Cómo entran las tarjetas al cargar.
- **`cardEntranceDuration`:** 100–2000 ms (default 600). También se usa para el header.
- **`cardEntranceStagger`:** 0–300 ms (default 0). Retardo acumulado por tarjeta para el
  efecto cascada. El escalonado se corta en la tarjeta 12: más allá, el retardo acumulado
  haría que la última aparezca mucho después de que el visitante ya scrolleó.
- **`headerEffect`:** mismo set de efectos, aplicado al header.
- **`titleTypewriter`:** escribe el nombre de la empresa letra por letra.
- **`counters`:** el contador de apps de la status bar cuenta desde cero (necesita
  `showStatusBar`).
- **`respectReducedMotion`:** default `true`. No anima nada para quien configuró «reducir
  movimiento» en su sistema operativo.

La entrada de tarjetas y el header son CSS generado en el servidor. El título y los
contadores usan un script mínimo, pero **el texto completo siempre se sirve en el HTML**:
sin JavaScript el portal se ve normal, no vacío. Independientemente de la config, un guard
global de `prefers-reduced-motion` desactiva animaciones y transiciones para quien pidió
menos movimiento.

### Tipografía avanzada

- **`fontWeight`:** 400 | 500 | 600 | 700.
- **`useGoogleFonts`:** si está activo, genera `fontUrl` apuntando a Google Fonts. Por defecto off (offline-first).

### Design tokens avanzados (`theme.tokens`)

Override opcional por modo:

```json
{
  "theme": {
    "tokens": {
      "shared": { "radius": 10, "cardBlur": 12, "shadowIntensity": "normal" },
      "dark": { "bg": "#0b1220", "surface": "rgba(255,255,255,0.04)" },
      "light": { "bg": "#f6f8fb" }
    }
  }
}
```

Campos soportados en `dark`/`light`: `bg`, `bgElev`, `surface`, `surfaceHover`, `surfaceStrong`, `text`, `textMuted`, `textSubtle`, `textFaint`, `border`, `borderStrong`, `accent`, `accentMuted`, `accentFg`, `icon`, `shadowCard`, etc. (ver `TokenOverridesSchema` en `src/lib/schema.ts`).

Import/export de tema solo: botones en sección **Avanzado** del panel.

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

Umbral **no incluye iconos built-in**. Los iconos provienen de **packs instalables** (pestaña **Íconos Git** en el admin: Lucide, Simple Icons, Tabler, etc.) o de **assets subidos**.

### Packs Git

1. Activá la feature `iconPacks` en **Avanzado → Features**.
2. Instalá un pack (recomendado: **Lucide** para UI genérica, **Simple Icons** para marcas).
3. En el editor de tarjeta, elegí `pack/nombre` (ej: `lucide/server`, `simple-icons/github`).

Los presets del catálogo ya referencian iconos calificados (`lucide/...`, `simple-icons/...`). Si el pack no está instalado, la tarjeta se muestra sin icono hasta que lo instales.

### Assets subidos

- Subí PNG, JPEG, WebP, SVG, GIF desde el tab **Assets** (kind: "icon").
- Después, en la tarjeta, elegí `/api/assets/<nombre-archivo>` del dropdown o pegá la URL en el campo custom.
- Tamaño recomendado: 128x128 px o 64x64 para favicons.

## Vista previa de widgets (admin → Tema)

La preview embebida refleja:

- **Reloj** — posición (`clockPosition`) y formato (`clockFormat` 12h/24h)
- **Refresh** — botón en header si `showRefresh`
- **Toggle claro/oscuro** — si `showModeToggle`
- **Status bar** — footer si `showStatusBar`
- **Opacidad** — `headerOpacity` / `footerOpacity`

## Ayuda contextual

Cada control del admin puede mostrar un icono **?** con explicación. Los textos viven en `src/i18n/help/{es,en,pt}.ts` (139 claves). Para agregar una:

1. Añadí la entrada en `help/es.ts` con `{ title, short, body }` (markdown en `body`).
2. Traducí en `help/en.ts` y `help/pt.ts` (`satisfies HelpCatalog`).
3. Cableá `<button class="help-icon" @click="showHelp('tu.clave')">` en el template.
4. El modal pre-renderiza markdown sanitizado en el servidor (`bodyHtml`).

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

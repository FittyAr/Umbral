/** Additional help entries (merged into helpEs). */
export const helpExtrasEs = {
  'theme.bgEditMode': {
    title: 'Fondo por modo claro/oscuro',
    short: 'Editá el fondo del portal en modo oscuro y claro por separado.',
    body: 'Cada modo tiene su propio fondo (gradiente, color o imagen). Usá **Copiar del otro modo** para partir de la paleta existente y ajustar.\n\nEl toggle claro/oscuro del portal usa el fondo correspondiente al modo activo.',
  },
  'theme.advancedCss': {
    title: 'CSS avanzado del fondo',
    short: 'Editá el valor del fondo como texto CSS libre.',
    body: 'Desactiva el constructor visual y permite pegar cualquier valor CSS válido: `linear-gradient(...)`, `radial-gradient(...)`, color hex, etc.\n\nÚtil para fondos complejos que el builder no cubre.',
  },
  'theme.gradientBuilder': {
    title: 'Constructor de gradiente',
    short: 'Armá gradientes con ángulo y stops de color.',
    body: 'Ajustá el **ángulo** (0–360°) y cada **stop** (color + posición %). La vista previa se actualiza al instante.\n\nPodés eliminar stops extra si hay más de dos.',
  },
  'theme.iconTint': {
    title: 'Tinte de iconos SVG',
    short: 'Cómo se colorean los iconos de las tarjetas.',
    body: '**Original (default)**: respeta los colores del SVG (logos de marca).\n\n**Accent / Texto / Propio**: aplica un color uniforme vía máscara CSS.\n\nUsá Original para GitHub, Docker, etc.; Accent o Texto para iconos monocromáticos de packs UI.',
  },
  'theme.iconColor': {
    title: 'Color de icono personalizado',
    short: 'Color usado cuando el tinte es "Propio".',
    body: 'Sólo aplica si **Tinte de iconos** está en **Proprio**. Se define por modo claro/oscuro en la rampa avanzada.',
  },
  'theme.autoStrategy': {
    title: 'Estrategia modo automático',
    short: 'Cómo el portal elige claro u oscuro cuando el modo es Auto.',
    body: '**Sistema**: sigue la preferencia del SO/navegador (`prefers-color-scheme`).\n\n**Horario**: claro de 7:00 a 19:00, oscuro el resto (hora del servidor).',
  },
  'theme.textRamp': {
    title: 'Rampa de texto',
    short: 'Colores de texto principal, muted, subtle y faint por modo.',
    body: 'La rampa define la jerarquía tipográfica. El badge **AA ✓** indica contraste WCAG ≥ 4.5:1 contra la superficie.\n\nSi baja contraste, ajustá `--text` o la superficie en tokens avanzados.',
  },
  'theme.derivedPalette': {
    title: 'Paleta derivada',
    short: 'Vista de los colores calculados a partir del accent y tokens.',
    body: 'Muestra cómo el motor de tema combina accent, superficies y bordes. Solo lectura; editá en **Colores** o **Avanzado**.',
  },
  'theme.fontWeight': {
    title: 'Peso de la tipografía',
    short: 'Grosor de la fuente del portal (400–700).',
    body: 'Afecta títulos, tarjetas y widgets. 400 = regular, 600–700 = más marcado en dashboards corporativos.',
  },
  'theme.useGoogleFonts': {
    title: 'Google Fonts',
    short: 'Cargar la fuente desde fonts.googleapis.com.',
    body: 'Si está activo, el navegador pide la fuente a Google (implicancia de privacidad: Google ve las IPs de tus visitantes).\n\nDesactivá y usá `fontUrl` propio o fuentes del sistema para evitar requests externos.',
  },
  'theme.cardBlur': {
    title: 'Blur de tarjetas glass',
    short: 'Intensidad del desenfoque en estilo glass.',
    body: 'Solo aplica a `cardStyle: glass`. Valores altos = más frosted glass; 0 = sin blur.',
  },
  'theme.cardBorderWidth': {
    title: 'Ancho de borde (outlined)',
    short: 'Grosor del borde en tarjetas outlined.',
    body: 'Solo aplica a `cardStyle: outlined`. Expresado en píxeles.',
  },
  'theme.showModeToggle': {
    title: 'Toggle claro/oscuro',
    short: 'Muestra el botón para cambiar modo en el header.',
    body: 'Los visitantes pueden alternar entre claro y oscuro. La preferencia se guarda en `localStorage`.',
  },
  'theme.clockPosition': {
    title: 'Posición del reloj',
    short: 'Header izquierda o derecha.',
    body: 'El reloj respeta el formato 12h/24h configurado abajo.',
  },
  'theme.clockFormat': {
    title: 'Formato del reloj',
    short: '12h con AM/PM o 24h.',
    body: 'Afecta el widget de reloj en el header del portal y la vista previa del admin.',
  },
  'theme.headerOpacity': {
    title: 'Opacidad del header',
    short: 'Transparencia de la barra superior (0–1).',
    body: '0 = invisible, 1 = opaco. Útil sobre fondos con mucho detalle visual.',
  },
  'theme.footerOpacity': {
    title: 'Opacidad del footer / status bar',
    short: 'Transparencia de la barra inferior (0–1).',
    body: 'Aplica al status bar cuando está visible.',
  },
  'theme.presets': {
    title: 'Presets de tema',
    short: 'Paletas completas con variantes claro y oscuro.',
    body: 'Cada preset define fondo, texto, superficies, bordes, accent e iconos para **ambos** modos.\n\nLos botones Oscuro/Claro solo eligen el **modo inicial**; el toggle del portal sigue funcionando.',
  },
  'theme.savePreset': {
    title: 'Guardar preset custom',
    short: 'Guarda la configuración actual como preset reutilizable.',
    body: 'Máximo 5 presets custom. No incluye tokens avanzados ni lista de presets anidada.',
  },
  'theme.resetDefaults': {
    title: 'Restaurar defaults',
    short: 'Vuelve el tema a los valores de fábrica de Umbral.',
    body: 'No borra presets custom guardados. Requiere guardar cambios para persistir.',
  },
  'theme.advanced.intro': {
    title: 'Tokens avanzados (Pro)',
    short: 'Editor de variables CSS del tema por modo.',
    body: 'Permite sobreescribir cualquier token (`--surface`, `--border`, sombras, etc.) por modo claro/oscuro.\n\nUsá **Derivar** para generar tokens a partir del accent.',
  },
  'theme.advanced.derive': {
    title: 'Derivar tokens',
    short: 'Genera tokens de superficie/borde desde el color de acento.',
    body: 'Recalcula valores coherentes sin editar cada campo a mano. No sobrescribe tokens que ya personalizaste manualmente si elegís merge parcial.',
  },
  'theme.advanced.shadowIntensity': {
    title: 'Intensidad de sombras',
    short: 'Multiplicador global de sombras de texto e iconos.',
    body: 'Afecta `--shadow-text` y `--shadow-icon`. Útil en temas muy planos o muy dramáticos.',
  },
  'theme.advanced.tokens': {
    title: 'Lista de tokens',
    short: 'Cada fila es una variable CSS del tema.',
    body: 'Los tokens vacíos usan el default del preset/motor. Base **shared** aplica a ambos modos; **dark/light** solo a ese modo.',
  },
  'theme.advanced.exportImport': {
    title: 'Exportar / importar tema',
    short: 'JSON portable del tema completo.',
    body: 'Exportá para backup o copiar entre portales. Import reemplaza `cfg.theme` (validado por schema).',
  },
  'theme.preview.mode': {
    title: 'Modo de la vista previa',
    short: 'Dark / Light / Auto en el panel (no afecta visitantes).',
    body: '**Auto** sigue la misma lógica que el portal (`colorMode` + estrategia). La preview embebida no lee la preferencia guardada del visitante.',
  },
  'theme.preview.openTab': {
    title: 'Preview en pestaña',
    short: 'Abre el portal con borrador de tema en otra pestaña.',
    body: 'Usa `localStorage` (`umbral-theme-preview`). Guardá cambios en el admin para que la pestaña pública los refleje al recargar.',
  },
  'card.autofill': {
    title: 'Auto-completar tarjeta',
    short: 'Rellena título, descripción e icono desde la URL.',
    body: 'Intenta scrapear meta tags de la URL. Si falla, busca en Wikipedia/Brave/Tavily según configuración de búsqueda externa.',
  },
  'card.aiEnhance': {
    title: 'Mejorar con IA',
    short: 'Reescribe título/descripción con el provider configurado.',
    body: 'Requiere tab IA activo y API key válida. No cambia la URL ni el icono.',
  },
  'card.descriptionFormat': {
    title: 'Formato Markdown',
    short: 'Descripción en Markdown sanitizado vs texto plano.',
    body: 'Markdown permite **negrita**, listas y links. Requiere feature `markdown` activa. El HTML se sanitiza en el servidor.',
  },
  'card.iconPicker': {
    title: 'Selector de iconos',
    short: 'Elegí iconos de packs instalados o assets subidos.',
    body: 'Pestaña **Íconos**: packs Git (Lucide, Simple Icons, etc.). **Assets**: PNG/SVG subidos.\n\nSin packs instalados, instalá uno desde **Íconos Git**.',
  },
  'assets.dropzone': {
    title: 'Subir assets',
    short: 'Arrastrá archivos o usá el selector.',
    body: 'Límites de tamaño y MIME types se configuran en **Hardening → Uploads**. SVG puede requerir sanitización activa.',
  },
  'assets.copyUrl': {
    title: 'Copiar URL del asset',
    short: 'Copia la ruta pública al portapapeles.',
    body: 'Usá `/api/assets/nombre.ext` como icono custom en tarjetas o como imagen de fondo.',
  },
  'assets.delete': {
    title: 'Eliminar asset',
    short: 'Borra el archivo del almacenamiento del portal.',
    body: 'Las tarjetas que referencien ese asset quedarán sin imagen hasta que actualices el icono.',
  },
  'audit.filters': {
    title: 'Filtros de auditoría',
    short: 'Acción, texto en detalle y rango de fechas.',
    body: 'Los eventos vienen de `data/audit.log`. Filtrá por tipo (`config.save`, `login`, etc.) o texto libre en el JSON de detalle.',
  },
  'audit.limit': {
    title: 'Límite de entradas',
    short: 'Cantidad máxima de líneas devueltas.',
    body: 'Orden cronológico inverso (más recientes primero). Subí el límite para exportaciones manuales.',
  },
  'audit.download': {
    title: 'Descargar log completo',
    short: 'Baja todo `audit.log` sin filtros.',
    body: 'Útil para archivo o análisis externo. El archivo puede crecer; rotación manual si hace falta.',
  },
  'iconPacks.intro': {
    title: 'Íconos Git',
    short: 'Instalá packs SVG desde repositorios públicos.',
    body: 'Simple Icons (marcas), Lucide (UI), Tabler, etc. Los iconos quedan en `data/icon-packs/` y se sirven por `/api/icons/`.',
  },
  'iconPacks.install': {
    title: 'Instalar pack',
    short: 'Clona el repo y copia los SVG al portal.',
    body: 'Puede tardar según tamaño del repo. Requiere red saliente desde el servidor.',
  },
  'iconPacks.uninstall': {
    title: 'Desinstalar pack',
    short: 'Elimina los SVG del pack del disco.',
    body: 'Las tarjetas con iconos `pack/nombre` dejarán de mostrar imagen hasta que cambies el icono.',
  },
  'iconPacks.refresh': {
    title: 'Actualizar catálogo',
    short: 'Relee packs instalados y actualiza el picker.',
    body: 'Usá después de instalar/desinstalar sin recargar la página.',
  },
  'iconPacks.customRepo': {
    title: 'Repo Git personalizado',
    short: 'URL de un repositorio con SVGs.',
    body: 'Debe ser accesible por HTTPS. Umbral clona en temp y copia según subpath/prefijo.',
  },
  'iconPacks.branch': {
    title: 'Rama del repo',
    short: 'Branch a clonar (ej. main, develop).',
    body: 'Default suele ser `main`. Verificá en el repo cuál es la rama activa.',
  },
  'iconPacks.subpath': {
    title: 'Subpath en el repo',
    short: 'Carpeta dentro del repo donde están los SVG.',
    body: 'Ej: `icons` en Lucide, `svg` en dashboard-icons. Solo se copian `.svg` de esa carpeta (recursivo según implementación).',
  },
  'iconPacks.prefix': {
    title: 'Prefijo del pack',
    short: 'ID usado en `prefijo/nombre-icono`.',
    body: 'Ej: `mi-pack` → iconos como `mi-pack/home.svg`. Debe ser único entre packs instalados.',
  },
  'advanced.oidc': {
    title: 'OIDC / SSO',
    short: 'Single Sign-On con proveedores OpenID Connect.',
    body: 'Configurá client ID/secret, issuer y scopes para Google, Keycloak, Authentik, etc.\n\nRequiere feature `oidc` activa y URLs de callback correctas en el IdP.',
  },
  'advanced.apiTokens': {
    title: 'Tokens API',
    short: 'Tokens de larga duración para automatización.',
    body: 'Permiten llamar endpoints admin sin cookie de sesión. Rotá tokens comprometidos y usá scopes mínimos.\n\nRequiere feature `apiTokens` activa.',
  },
} as const;

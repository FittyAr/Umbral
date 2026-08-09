// ──────────────────────────────────────────────────────────────────────────
// Help texts para los iconos "?" del admin
//
// Cada key corresponde a un setting de /admin → Hardening (y otras pestañas
// avanzadas). El modal que se abre al clickear el "?" lee de este objeto.
//
// Redacción en castellano rioplatense, tono directo, con el "por qué"
// además del "qué". Apuntamos a que un admin que NO es sysadmin pueda
// entender qué está tocando.
// ──────────────────────────────────────────────────────────────────────────

export interface HelpText {
  title: string;
  short: string; // tooltip de 1 línea
  body: string; // markdown-ish, se renderiza con whitespace-pre-wrap
}

export const HELP_TEXTS: Record<string, HelpText> = {
  // ── Sesión y cookies ──────────────────────────────────────────────
  'session.ttlHours': {
    title: 'Duración de la sesión (horas)',
    short: 'Cuánto tiempo vive la cookie de sesión antes de pedir login de nuevo.',
    body: `La cookie de sesión se renueva con cada request. Después de este tiempo de inactividad, el admin tiene que volver a poner la contraseña.

**Default 24h** es el sweet spot entre seguridad y usabilidad. Si tu Umbral está expuesto a internet bajalo a 1-4h. Si es sólo para vos en LAN, podés subirlo a 168h (1 semana) sin drama.`,
  },
  'session.cookieSameSite': {
    title: 'Cookie SameSite',
    short: 'Cómo se comporta la cookie con links cross-site.',
    body: `**Lax (default)**: la cookie se manda con navegaciones top-level (click en un link) pero NO con iframes/img/POST cross-site. Balance bueno.

**Strict**: la cookie NUNCA se manda en contexto cross-site. Más seguro pero rompe links desde otras apps (ej: Mattermost te manda al portal y la sesión no se reconoce).

**None**: la cookie se manda en todos los contextos. REQUIERE Secure flag. Sólo si sabés lo que hacés.`,
  },
  'session.cookieSecure': {
    title: 'Cookie Secure flag',
    short: 'Si la cookie sólo viaja sobre HTTPS.',
    body: `**Auto (recomendado)**: la cookie lleva el flag Secure sólo si el request es HTTPS. Si detectás HTTPS, endurcés; si no, dejás que funcione en HTTP para que no te trabes en dev.

**Always**: siempre lleva Secure. Usá esto si tenés TLS terminado en un proxy y el cliente SIEMPRE llega por HTTPS.

**Never**: nunca lleva Secure. La cookie viaja por HTTP en texto claro. NO recomendado salvo en LAN 100% aislada.`,
  },
  'session.rotateCsrfOnLogin': {
    title: 'Rotar CSRF en cada login',
    short: 'Si cambia el token CSRF cada vez que alguien inicia sesión.',
    body: `Activado: cada login genera un CSRF token nuevo. Si alguien tenía un tab abierto con un CSRF viejo, ese tab queda invalidado.

**Por qué importa**: si un atacante te roba el CSRF token (XSS, log compartido) y vos cambiás la contraseña sin rotar CSRF, el atacante sigue pudiendo hacer requests mutantes hasta que la sesión expire.

**Default false** porque la rotación de CSRF en cada login obliga al admin a refrescar el browser después de login. Es una mejora de seguridad menor vs la fricción que agrega.`,
  },

  // ── Login y CSRF ──────────────────────────────────────────────────
  'auth.minPasswordLength': {
    title: 'Largo mínimo del password',
    short: 'Caracteres mínimos al cambiar la contraseña.',
    body: `0 (default) = sin mínimo. Acepta passwords cortos por compat con configs viejas.

Subilo a 8-12 para producción. Más de 16 no aporta mucho (vs passphrase larga).`,
  },
  'auth.rateLimitMax': {
    title: 'Rate limit (intentos)',
    short: 'Máxima cantidad de intentos de login en la ventana de tiempo.',
    body: `Si alguien llega al límite, el endpoint /api/login devuelve 429 hasta que pase la ventana.

**Default 30 / 60s** = suficiente para vos equivocarte varias veces, pero un brute force se frena rápido. Si vas a exponer Umbral a internet, bajalo a 5-10.`,
  },
  'auth.rateLimitWindowSec': {
    title: 'Rate limit (ventana en segundos)',
    short: 'En cuántos segundos se resetea el contador de intentos.',
    body: `Funciona junto con rateLimitMax. Default 60s. Si bajás Max a 5, también bajá Window a 60s — sino bloqueás al user real.

Si querés ser muy estricto: 3 intentos / 5min. Si te bloqueás a vos mismo esperá 5min o reiniciá el container (no se persiste en disco).`,
  },
  'auth.csrfPolicy': {
    title: 'Política CSRF',
    short: 'Cuándo se exige el token CSRF.',
    body: `**Mutations (default)**: POST/PUT/DELETE/PATCH requieren CSRF. GET no. Es lo correcto en el 99% de los casos.

**All**: también los GET requieren CSRF. Paranoia máxima. Rara vez necesario.

**None**: no se chequea CSRF. **NO recomendado** salvo que estés en LAN 100% aislada y sabes lo que hacés. Un atacante que te haga clickear un link podría hacer cambios en tu config.`,
  },

  // ── Uploads ───────────────────────────────────────────────────────
  'uploads.maxBytesLogo': {
    title: 'Tamaño máx. del logo',
    short: 'Bytes máximos del logo (header de la portada).',
    body: `Default 1 MB. Es para el logo del header, no necesitás más. Si subís un SVG pesa unos pocos KB y re-processa con sharp igual (sharp lo rasteriza).`,
  },
  'uploads.maxBytesFavicon': {
    title: 'Tamaño máx. del favicon',
    short: 'Bytes máximos del favicon (.ico/.png).',
    body: `Default 256 KB. Un favicon de 32x32 pesa <5KB; este límite es generoso para ICOs animados o multi-resolución.`,
  },
  'uploads.maxBytesIcon': {
    title: 'Tamaño máx. de ícono de tarjeta',
    short: 'Bytes máximos de la imagen de cada tarjeta.',
    body: `Default 512 KB. Las imágenes de las tarjetas se re-encodan a WebP/AVIF en sizes razonables. Si querés íconos SVG livianos, dejá este valor.`,
  },
  'uploads.maxBytesBackground': {
    title: 'Tamaño máx. del fondo',
    short: 'Bytes máximos de la imagen de fondo.',
    body: `Default 5 MB. Es la única imagen grande del sistema. La optimizamos con sharp al servir pero igual la memoria del server la tiene que cargar.`,
  },
  'uploads.allowedMimeTypes': {
    title: 'MIME types permitidos',
    short: 'Lista de tipos de archivo que se pueden subir.',
    body: `Whitelist separada por comas. Default: png, jpeg, webp, svg, gif.

**Importante**: solo se permiten tipos \`image/*\`. No agregues \`text/html\`, \`application/javascript\`, etc. — Umbral no es un hosting de archivos, agregar un MIME ejecutable es vector de XSS si alguien encuentra forma de servirlo.

Si querés ser estricto sacá \`image/svg+xml\` (los SVG pueden contener JS). El toggle \`Permitir SVG\` de abajo es la forma fácil de hacer esto.`,
  },
  'uploads.allowSvg': {
    title: 'Permitir subir SVGs',
    short: 'Si se pueden subir archivos SVG.',
    body: `SVGs son vectores, pesan poco, son ideales para logos/íconos. PERO pueden contener JavaScript embebido que se ejecuta en el browser.

**Si activás esto**, UMbral sanitiza el SVG con DOMPurify antes de servirlo (si sanitizeSvg está activo). La sanitización remueve scripts, eventos y elementos peligrosos.`,
  },
  'uploads.sanitizeSvg': {
    title: 'Sanitizar SVG con DOMPurify',
    short: 'Pasa los SVGs subidos por DOMPurify antes de servirlos.',
    body: `DOMPurify parsea el SVG como HTML y remueve:
- Tags \`<script>\`, \`<foreignObject>\`
- Atributos \`on*\`, \`href="javascript:..."\`, \`xlink:href="javascript:..."\`
- \`<iframe>\`, \`<embed>\`, \`<object>\`

Default activado. Si lo desactivás y permitís SVG, cualquier SVG malicioso se sirve tal cual. NO recomendado.`,
  },
  'uploads.processImages': {
    title: 'Procesar imágenes con sharp',
    short: 'Re-encoda las imágenes subidas a WebP/AVIF al servirlas.',
    body: `Activado: cuando un user pide la imagen, sharp la re-encode on-the-fly al formato más eficiente para el browser. 50-80% menos bandwidth.

Desactivado: servimos la imagen original. Útil si tenés problemas de CPU o memoria con sharp (raro en hardware moderno).`,
  },

  // ── Red ───────────────────────────────────────────────────────────
  'network.trustForwardedFor': {
    title: 'Confiar en X-Forwarded-For',
    short: 'Si usar el header X-Forwarded-For para rate limit por IP.',
    body: `**SÓLO activá esto si tenés un reverse proxy (nginx, Caddy, Traefik) en frente que sanea y SOBREESCRIBE X-Forwarded-For**.

Si lo activás sin proxy, cualquier cliente puede mandar \`X-Forwarded-For: 1.2.3.4\` y bypasear el rate limit.

**Detección de "tengo proxy"**: Umbral mira el header de la request directo. Si ves el IP de tu red local en los logs, NO tenés proxy / está mal configurado.`,
  },
  'network.trustedProxies': {
    title: 'Proxies confiables',
    short: 'IPs/CIDRs de tus reverse proxies (informativo).',
    body: `Hoy es informativo, no funcional. Sirve de documentación para vos o tu equipo de cuándo se configuró el trust.

Formato: una IP o CIDR por línea. Ej: \`10.0.0.1\` o \`192.168.1.0/24\`.`,
  },
  'network.cookieDomain': {
    title: 'Cookie domain',
    short: 'A qué dominio se emite la cookie de sesión.',
    body: `Vacío (default) = la cookie se emite al hostname del request. Funciona en el 99% de los casos.

Con prefijo punto (\`.example.com\`): la cookie es válida para \`example.com\` Y todos sus subdominios. Útil si querés compartir sesión entre \`portal.example.com\` y \`docs.example.com\`.`,
  },
  'network.allowInternalHosts': {
    title: 'Permitir hosts internos en health check',
    short: 'Si el health check puede pegar a IPs privadas (10/8, 192.168/16, etc.).',
    body: `El health check hace HEAD requests a las URLs de las tarjetas para mostrar dot verde/rojo. Si tus tarjetas son servicios internos (1Panel en \`http://10.155.49.240:39611/\`, Excalidraw en otro container, etc.) este toggle DEBE estar activado.

**Default true** porque Umbral es un portal interno — el caso de uso primario es monitorear tus propios servicios.

**Cuándo desactivarlo**: si exponés Umbral a internet. La guard SSRF bloquea \`169.254.169.254\` (cloud metadata) SIEMPRE, esté como esté este toggle.`,
  },

  // ── Headers de seguridad ──────────────────────────────────────────
  'headers.csp': {
    title: 'Content-Security-Policy',
    short: 'Qué recursos puede cargar el browser.',
    body: `El default incluye:
- \`script-src 'self' 'unsafe-inline' 'unsafe-eval'\` — Alpine.js 3 necesita \`'unsafe-eval'\` para sus expresiones dinámicas
- \`img-src 'self' data: https:\` — permite favicons externos y data: URIs
- \`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com\` — Inter font de Google
- \`frame-ancestors 'none'\` — anti clickjacking

**Vacío = no se envía el header CSP** (modo permisivo, útil para debug).

Para endurecer: leé https://web.dev/articles/strict-csp. Cuesta porque Alpine 3 rompe con \`script-src 'self'\` puro.`,
  },
  'headers.xFrameOptions': {
    title: 'X-Frame-Options',
    short: 'Si la página se puede embeber en un iframe.',
    body: `**DENY (default)**: nadie puede embeber Umbral en un iframe. Anti clickjacking total.

**SAMEORIGIN**: sólo se permite embeber desde el mismo origen.

**NONE**: se permite embeber desde cualquier lado. NO recomendado.`,
  },
  'headers.referrerPolicy': {
    title: 'Referrer-Policy',
    short: 'Cuánta info se manda en el header Referer al navegar fuera.',
    body: `**no-referrer (default)**: no se manda nada. Máxima privacidad.

**same-origin**: solo se manda el referrer a links internos.

**strict-origin-when-cross-origin**: manda el origen (no el path) a links cross-origin HTTPS, nada a HTTP.

**no-referrer-when-downgrade**: manda el referrer full a HTTPS, nada al bajar a HTTP. Default histórico de los browsers.`,
  },
  'headers.permissionsPolicy': {
    title: 'Permissions-Policy',
    short: 'Qué features del browser puede usar la página (cámara, mic, geo, etc.).',
    body: `Default deshabilita cámara, micrófono y geolocalización. Si querés ser más estricto podés agregar \`payment=(), usb=(), magnetometer=()\`, etc.

Formato: lista de directivas separadas por coma. \`feature=()\` = bloquear, \`feature=(self)\` = permitir mismo origen, \`feature=(self "https://otro.com")\` = permitir origen + otro.`,
  },
  'headers.hsts': {
    title: 'HSTS mode',
    short: 'Cómo se envía el header Strict-Transport-Security.',
    body: `**Auto (default)**: lo activa sólo si el request es HTTPS. En LAN HTTP no hace nada, en producción HTTPS endurcés out-of-the-box.

**Always**: lo fuerza siempre. Útil si tu proxy siempre termina TLS.

**Never**: no se envía nunca. NO recomendado si estás en HTTPS.

**Cuidado con max-age**: una vez que un browser vio \`max-age=31536000\`, lo recuerda un año. Si después bajás HTTPS, los browsers NO van a poder llegar a tu sitio por un año. Testá primero con \`max-age=300\` (5 min).`,
  },
  'headers.hstsMaxAge': {
    title: 'HSTS Max-Age',
    short: 'Cuántos segundos el browser recuerda "sólo HTTPS para este dominio".',
    body: `Default 31536000 (1 año) — el sweet spot según RFC 6797.

**Antes de subir a producción**: probá con 300 (5 min) un rato. Si todo anda bien, subí a 3600 (1h), después 86400 (1 día), y recién ahí a 1 año. Esto te da tiempo de rollback si rompés algo.

0 desactiva HSTS incluso si Modo está en 'auto' o 'always'.`,
  },
  'headers.hstsIncludeSubDomains': {
    title: 'HSTS includeSubDomains',
    short: 'Si la regla HSTS aplica a subdominios también.',
    body: `**Activá SÓLO si TODOS tus subdominios son HTTPS**. Si tenés \`foo.example.com\` en HTTP, un browser que vio \`includeSubDomains\` no va a poder cargarlo por un año.

Default false por seguridad. Si tu dominio entero es HTTPS, activá y olvidate.`,
  },
  'headers.hstsPreload': {
    title: 'HSTS preload',
    short: 'Si querés enviar el dominio a la lista hardcodeada de Chrome/Firefox/Safari.',
    body: `Si activás esto y vas a https://hstspreload.org, Chrome/Firefox/Safari hardcodean tu dominio en sus binaries como "siempre HTTPS, siempre includeSubDomains". Es **permanente y muy difícil de revertir**.

**Requisito**: includeSubDomains=true, max-age >= 31536000, y TODOS los subdominios HTTPS. Por default Umbral no fuerza esto, queda en tu decisión.`,
  },

  // ── Theme ─────────────────────────────────────────────────────────
  'theme.groupLayout': {
    title: 'Layout de grupos',
    short: 'Vertical (apilado) u horizontal (columnas side-by-side).',
    body: `**Vertical (default)**: las categorías se apilan una debajo de la otra. Más natural para pocas categorías con muchas cards.

**Horizontal**: las categorías se ponen en columnas side-by-side. Útil si tenés 4+ categorías con pocas cards cada una. En mobile se sigue apilando.`,
  },
  'theme.showClock': {
    title: 'Mostrar reloj',
    short: 'Reloj HH:MM:SS en vivo en el header.',
    body: `Actualiza cada segundo, usa la hora del browser del user. No consume nada del server. Útil para portales tipo kiosk o workstations siempre prendidas.`,
  },
  'theme.showRefresh': {
    title: 'Mostrar botón de refresh',
    short: 'Botón en el header que recarga la config sin recargar la página.',
    body: `Más rápido que F5 y conserva el scroll/state del browser. Trae la config del server y refresca los assets. Útil si tenés scripts externos que modifican el config y querés reflejar cambios sin recargar todo.`,
  },
  'theme.showStatusBar': {
    title: 'Mostrar status bar',
    short: 'Pie de página con versión de Umbral y última actualización de la config.',
    body: `Muestra la versión del package.json y la fecha de \`_meta.updatedAt\` de la config. Útil para debug ("¿el server ya tiene la nueva config?") y para saber qué versión está corriendo cada portal en tu fleet.`,
  },

  // ── Layout ────────────────────────────────────────────────────────
  'layout.healthCheckInterval': {
    title: 'Intervalo de health check (segundos)',
    short: 'Cada cuántos segundos volver a probar las URLs marcadas.',
    body: `Default 60s. Mínimo 10s (evita martillar el server con muchas cards activas). Máximo 1h.

Si tenés muchas cards y ves lag, subilo a 120-300. Si necesitás detección de caídas rápida, bajalo a 30.`,
  },

  // ── IA ────────────────────────────────────────────────────────────
  'ai.systemPrompt': {
    title: 'System prompt del asistente IA',
    short: 'Las instrucciones de sistema que recibe la IA.',
    body: `Acá definís la "personalidad" del asistente. Si lo dejás vacío, Umbral usa uno default en castellano rioplatense optimizado para mejorar títulos/descripciones de tarjetas.

Modificalo si querés que la IA:
- Escriba en otro idioma o tono (más formal, más técnico, etc.)
- Ponga límites distintos (ej: "máximo 80 chars en título")
- Devuelva la respuesta en otro formato (markdown, lista, etc.)

**No se valida lo que pongas acá** — es texto libre que va directo al provider.`,
  },
  'ai.apiKey': {
    title: 'API Key del provider IA',
    short: 'Tu clave de API del provider que elegiste.',
    body: `**Se guarda en \`data/config.json\` en texto plano.** No usamos vault, encryption, ni nada. Esto es un trade-off documentado: la alternativa es pedir al user que cargue la key en cada request, lo cual es fricción enorme para algo que se usa en cada mejora.

**Mitigaciones**:
1. \`data/\` debería estar en un volume con filesystem permissions restrictivos
2. Si exponés Umbral a internet, poné un reverse proxy con auth frente a /admin
3. Si te comprometen, rotá la key en el provider (es 30 segundos en su panel)

Para Ollama/LM Studio local no hace falta — poné "ollama" o dejá vacío.`,
  },
  'ai.preset': {
    title: 'Preset de provider IA',
    short: 'Elegí un provider popular para autocompletar baseUrl y modelo.',
    body: `Elegir un preset te llena automáticamente la Base URL y el Modelo con valores oficiales (verificados contra la doc de cada provider en la fecha del commit).

Después podés editar cualquiera de los dos a mano — si dejás de matchear el preset, el dropdown vuelve automáticamente a "Custom / Otro".

**Custom** es para proxies internos, gateways privados, o providers nuevos que no estén en la lista. Ponés la URL a mano y listo.`,
  },
  'ai.model': {
    title: 'Modelo del provider',
    short: 'Qué modelo específico querés usar (ej: gpt-4o-mini, claude-sonnet-4-5).',
    body: `El nombre exacto que el provider espera en el parámetro \`model\` de la request.

Algunos providers (OpenAI, Google) aceptan aliases que siempre resuelven a la última versión (ej: \`gpt-4o-latest\`, \`gemini-2.0-flash\`). Otros (Anthropic, Mistral) requieren el nombre completo.

**Para Ollama / LM Studio local**: el modelo es el que descargaste con \`ollama pull\` o cargaste en la GUI. Pegá el nombre exacto.`,
  },

  // ── Branding ─────────────────────────────────────────────────────
  'branding.companyName': {
    title: 'Nombre de la empresa / equipo',
    short: 'Aparece en el header, title de la página y mensajes.',
    body: `Texto plano, hasta 80 chars. Se usa en:
- El title de la pestaña del browser (\`<title>\`)
- El header de la portada (si no hay logo)
- El subject de emails de auditoría
- Mensajes del sistema ("Bienvenido a {companyName}")

**Tip**: poné el nombre canónico del equipo o proyecto, no "Mi Empresa" — queda feo en logs.`,
  },
  'branding.logo': {
    title: 'Logo del header',
    short: 'Imagen que aparece arriba a la izquierda en la portada.',
    body: `Subilo desde el tab Assets y elegilo acá. Formatos: PNG, JPEG, WebP, SVG, GIF.

**Tamaño recomendado**: 200-400px de ancho, 40-80px de alto. El header lo escala con CSS \`max-height\`. Logos más grandes se ven pixelados en pantallas retina.

Si no ponés logo, se muestra el \`companyName\` como texto.`,
  },
  'branding.favicon': {
    title: 'Favicon',
    short: 'El ícono chiquito que aparece en la pestaña del browser.',
    body: `32×32 o 16×16 PNG, idealmente. ICO también funciona. SVG es soportado en browsers modernos.

Si no ponés favicon, los browsers muestran un cuadrado blanco o un ícono genérico — se ve poco prolijo.`,
  },

  // ── Tema (los que faltan) ────────────────────────────────────────
  'theme.background.type': {
    title: 'Tipo de fondo',
    short: 'Si el fondo es un color sólido, un gradiente CSS, o una imagen.',
    body: `**Gradiente / Color CSS** (default): un valor CSS libre. Ejemplos: \`#0f172a\` (azul oscuro), \`linear-gradient(135deg, #0f172a, #1e3a8a)\`, \`radial-gradient(circle, #1e3a8a, #0f172a)\`.

**Color sólido**: un hex sin gradient. Más simple, más rápido de render.

**Imagen**: una imagen subida. Útil para dashboards con branding fuerte (foto de la oficina, gráfico de fondo). El blur y overlay de abajo te dejan suavizarlo para que las cards se lean bien encima.`,
  },
  'theme.background.value': {
    title: 'Valor del fondo',
    short: 'El CSS (gradient/color) o URL de la imagen, según el tipo.',
    body: `Si tipo es **gradiente/color**: cualquier CSS válido. El sistema sanitiza con regex para bloquear inyecciones.

Si tipo es **imagen**: elegila del dropdown de Assets (sólo aparecen los PNG/JPG/WebP que subiste).

**Atajos útiles**:
- \`#0a0a0a\` — negro casi puro (modo oscuro)
- \`#f8fafc\` — casi blanco (modo claro)
- \`linear-gradient(135deg, #1e293b, #0f172a)\` — gradiente azul oscuro clásico
- \`linear-gradient(135deg, #fef3c7, #fde68a)\` — gradiente cálido amarillo`,
  },
  'theme.background.blur': {
    title: 'Blur del fondo',
    short: 'Cuánto se desenfoca la imagen/color de fondo (0-40px).',
    body: `Útil sólo si tenés una imagen de fondo y querés suavizarla para que las cards se lean encima. Con gradientes/color no hace nada visible.

**Regla**: 0 para imágenes nítidas (logos, fotos hero), 10-20 para imágenes decorativas, 30+ para imágenes que estorban mucho.`,
  },
  'theme.background.overlay': {
    title: 'Overlay opacity',
    short: 'Capa oscura/semi-transparente encima del fondo (0-1).',
    body: `Agrega un tinte (color configurado abajo) encima del fondo. Sirve para garantizar contraste con el texto de las cards, sin tener que tocar la imagen.

**0**: sin overlay (la imagen manda)
**0.3-0.5**: sutil, deja ver la imagen
**0.7+**: casi opaco, prioriza legibilidad

Con gradientes/color el overlay no se nota mucho.`,
  },
  'theme.background.overlayColor': {
    title: 'Color del overlay',
    short: 'El color de la capa de overlay (default negro).',
    body: `Default negro (#000000) para oscurecer. Blanco (#ffffff) si querés aclarar una imagen oscura. Cualquier hex color funciona.`,
  },
  'theme.accentColor': {
    title: 'Color de acento',
    short: 'Color de highlight (selección, links, hover).',
    body: `Se usa para:
- El color del dot de health check cuando la card está OK
- El border/background de los items seleccionados en admin
- Hover states en links
- Borde del input focused

**Tip**: un accent contrastante pero no estridente. \`#60a5fa\` (azul cielo) es el default porque funciona con fondos claros y oscuros.`,
  },
  'theme.textColor': {
    title: 'Color de texto',
    short: 'Color principal del texto en la portada.',
    body: `Default \`#f1f5f9\` (casi blanco). Cambialo si tu fondo es claro (\`#0f172a\` para azul oscuro, \`#1e293b\` para gris oscuro).

Asegurate de tener contraste suficiente con el fondo (WCAG AA = ratio 4.5:1 para texto normal).`,
  },
  'theme.cardStyle': {
    title: 'Estilo de tarjeta',
    short: 'Glass (blur), flat, o outlined.',
    body: `**Glass** (default): cards semi-transparentes con blur del fondo. Queda lindo con gradientes pero puede comer CPU en dispositivos viejos.

**Flat**: cards opacas, color sólido. Más rápido, más legible, menos "lujoso".

**Outlined**: cards transparentes con border. Equilibrio entre los dos.`,
  },
  'theme.fontFamily': {
    title: 'Tipografía',
    short: 'Qué fuente usar para todo el portal.',
    body: `Lista curada de Google Fonts + \`system-ui\` (la del SO del user). Cada opción carga su CSS de Google Fonts automáticamente.

**\`system-ui\`** no carga nada de Google — usa la fuente del sistema. Más rápido y respeta las preferencias del user.

Si necesitás una fuente custom (la de tu marca, por ejemplo), andá a Hardening → Headers de seguridad y editá \`fontUrl\` — pero ojo, el schema valida que venga de fonts.googleapis.com.`,
  },
  'theme.colorMode': {
    title: 'Modo de color',
    short: 'Auto, oscuro, o claro.',
    body: `**Auto** (default): el portal detecta el \`prefers-color-scheme\` del browser del user y elige light/dark automáticamente. Cambia solo si el user cambia su pref.

**Oscuro** / **Claro**: fuerza el modo. Útil si querés un look consistente sin importar el sistema.

El "modo" sólo afecta las variables CSS de la portada — la data en config no cambia.`,
  },

  // ── Layout (los que faltan) ───────────────────────────────────────
  'layout.columnsDesktop': {
    title: 'Columnas en desktop',
    short: 'Cuántas cards por fila en pantallas grandes.',
    body: `Default 4. Rangos:
- **2-3**: pocas cards, una por servicio importante
- **4-6**: el sweet spot para portales típicos
- **7-8**: requiere cards chicas, sólo si tenés muchas

Mirá la vista previa abajo del form para ver cómo queda.`,
  },
  'layout.columnsTablet': {
    title: 'Columnas en tablet',
    short: 'Cuántas cards por fila en tablets (entre 768px y 1024px).',
    body: `Default 3. Usá 2 si tenés cards con descripciones largas.`,
  },
  'layout.columnsMobile': {
    title: 'Columnas en mobile',
    short: 'Cuántas cards por fila en phones.',
    body: `Default 2. Poné 1 si tus cards son grandes o tienen mucho texto.`,
  },
  'layout.cardSize': {
    title: 'Tamaño de tarjeta',
    short: 'Chico, mediano, o grande.',
    body: `Define el padding y la densidad de la card.

**Chico**: más cards visibles, menos detalle.
**Mediano** (default): balance.
**Grande**: cards con más aire, mejor para pocos servicios importantes.`,
  },
  'layout.showDescriptions': {
    title: 'Mostrar descripciones',
    short: 'Si mostrar el texto debajo del título de cada card.',
    body: `Si lo desactivás, las cards muestran sólo título + ícono. Útil cuando tenés muchas cards y el espacio escasea, o cuando el user ya sabe qué es cada servicio.`,
  },

  // ── Tarjetas (form de edición) ──────────────────────────────────
  'card.title': {
    title: 'Título de la tarjeta',
    short: 'El texto principal que se ve en la card.',
    body: `Máximo 80 chars. Se muestra en negrita en la card.

**Tip**: si vas a usar el botón "Mejorar con IA" después, poné un título rough ("1Panel", "Hermes") y dejá que la IA lo pula con un system prompt custom.`,
  },
  'card.kind': {
    title: 'Tipo de tarjeta',
    short: 'Link (clickeable) o Note (informativa, sin link).',
    body: `**Link** (default): la card es clickeable y lleva a la URL. La URL es obligatoria.

**Note**: la card NO es clickeable. Sirve para tips, anuncios, info fija del equipo ("Próxima reunión: jueves 14hs"), recordatorios. La URL queda opcional y podés poner un link de referencia si querés.

Cambiar el tipo de una card existente a "Note" la oculta como link y la muestra como cuadro de texto.`,
  },
  'card.url': {
    title: 'URL de la tarjeta',
    short: 'A dónde lleva cuando el user hace click (sólo tipo "link").',
    body: `Acepta:
- \`https://servidor:puerto/path\` — servicio interno o externo
- \`/docs\`, \`/admin\` — rutas internas de Umbral
- \`http://10.x.x.x:port\` — IPs privadas (health check funciona con \`allowInternalHosts=true\`)

**El sistema normaliza automáticamente**:
- Saca whitespace/newlines del principio y final
- Si no tiene esquema (\`http://\`/\`https://\`) y no es path interno, le prepende \`http://\`
- Si empieza con \`//\`, le prepende \`http:\`

**No se permite**: \`javascript:\`, \`data:\`, \`vbscript:\`, ni nada que no sea http/https/path.`,
  },
  'card.description': {
    title: 'Descripción de la tarjeta',
    short: 'Texto debajo del título, máximo 200 chars.',
    body: `Una sola línea. Aparece debajo del título en la card. Útil para aclarar qué es el servicio o agregar contexto ("Backup semanal lunes 3AM", "Pedí acceso a #infra en Slack").

Si la dejás vacía, la card se ve más limpia pero pierde info útil. Si vas a usar "Auto-completar" o "Mejorar con IA", la IA también la pule.`,
  },
  'card.category': {
    title: 'Categoría',
    short: 'A qué grupo pertenece la card (Comunicación, Productividad, etc.).',
    body: `Las categorías se crean en el tab "Categorías" del admin. Cada card tiene que estar en una. Si borrás una categoría, las cards que estaban ahí se mueven automáticamente a la primera que quede.`,
  },
  'card.color': {
    title: 'Color de la card',
    short: 'Color de acento para el ícono y el dot de health check.',
    body: `No es el color de fondo — es el color del ícono/dot. Default \`#60a5fa\` (azul cielo).

**Tip**: usá colores consistentes por categoría. Comunicación en verde, Productividad en azul, Dev en púrpura. Le da identidad visual al portal.`,
  },
  'card.icon': {
    title: 'Ícono de la tarjeta',
    short: 'El dibujo pequeño al lado del título.',
    body: `Elegilo del picker de íconos (los predefinidos cubren los casos comunes). Si necesitás uno custom, desplegá el panel de abajo y tipeá el nombre de un Lucide icon o la URL de un asset que subiste.

**Nombres Lucide populares** que no están en el set default: \`rocket\`, \`database\`, \`server\`, \`terminal\`, \`github\`, \`docker\`, etc. Cualquier nombre de https://lucide.dev funciona.`,
  },
  'card.openInNewTab': {
    title: 'Abrir en nueva pestaña',
    short: 'Si la URL se abre en una pestaña nueva o reemplaza la actual.',
    body: `Default activado. Útil para servicios internos donde querés que el portal quede abierto en el background.

Desactivalo para links a docs o a URLs "externas" que el user va a querer cerrar sin volver.`,
  },
  'card.enabled': {
    title: 'Tarjeta activa',
    short: 'Si la card se muestra en la portada.',
    body: `Desactivar = la card se guarda en la config pero NO aparece. Útil para:
- Servicios que están en mantenimiento temporal
- Tarjetas de "Documentación" si querés sacarla del home
- Cards estacionales (eventos, campañas)

**No es lo mismo que borrar** — la card sigue ahí, sólo no se renderiza.`,
  },
  'card.healthCheck': {
    title: 'Health check (dot en vivo)',
    short: 'Ping periódico a la URL con un dot verde/rojo según respuesta.',
    body: `Activado: el server hace un HEAD request a la URL cada \`healthCheckInterval\` segundos (default 60s). Si responde 2xx, dot verde. Si falla o timeout, dot rojo.

**Costo**: 1 request por card cada N segundos. Con 10 cards a 60s = 600 req/hora. Nada, pero si tenés 100 cards可以考虑 subir el intervalo.

**Privacidad**: el server es el que hace el request, no el browser. Útil cuando el user no quiere que cada browser pegue contra la URL.

Para hosts internos (10/8, 192.168/16), el toggle \`Permitir hosts internos\` en Hardening → Red tiene que estar activo.`,
  },

  // ── Categorías ───────────────────────────────────────────────────
  'category.name': {
    title: 'Nombre de la categoría',
    short: 'El texto que se muestra como header de la sección.',
    body: `Lo que ven los users en la portada como título de la columna/sección. Sé descriptivo pero corto ("Comunicación", "Productividad", "Dev", "Operaciones", etc.).

Si tenés sólo una o dos categorías con muchas cards cada una, poné nombres más específicos ("Infraestructura", "Cliente A", "Cliente B").`,
  },
  'category.icon': {
    title: 'Ícono de la categoría',
    short: 'Ícono Lucide que aparece al lado del nombre.',
    body: `Cualquier nombre de Lucide (https://lucide.dev). Ejemplos: \`message-circle\`, \`briefcase\`, \`code\`, \`server\`, \`globe\`, etc.

Si el nombre no existe, el sistema usa un placeholder genérico. No rompe nada.`,
  },

  // ── Assets ───────────────────────────────────────────────────────
  'assets.upload': {
    title: 'Subir assets',
    short: 'Logos, favicons, íconos de tarjeta, fondos.',
    body: `**Tipos permitidos** (configurable en Hardening → Uploads): PNG, JPEG, WebP, SVG, GIF.

**Límites por tipo**:
- Logo: 1 MB
- Favicon: 256 KB
- Ícono de tarjeta: 512 KB
- Fondo: 5 MB

**Por qué estos límites**: los browsers tienen que descargar las imágenes cada vez que alguien carga el portal. Un logo de 5 MB es innecesario y mata el LCP.

Los SVG se sanitizan con DOMPurify antes de servirse (si \`Permitir SVG\` está activo). Esto previene XSS via SVG malicioso.`,
  },

  // ── Status ───────────────────────────────────────────────────────
  'status.check': {
    title: 'Status de las tarjetas',
    short: 'Ping HEAD a cada URL marcada con health check.',
    body: `El server hace un HEAD request a cada URL de las cards con \`healthCheck=true\`. Devuelve:
- **Verde** (2xx-3xx): la URL responde OK
- **Rojo** (4xx-5xx, fetch failed, timeout): algo no anda
- **"URL inválida"**: la URL de la card no parsea como http(s) o path

**No es un monitor production-grade**: no chequea contenido, no alerta, no loguea histórico. Es un "está vivo o no" superficial.

Para hosts internos (10/8, 192.168/16, docker compose local), el toggle \`Permitir hosts internos\` en Hardening → Red tiene que estar activo.`,
  },

  // ── Avanzado ─────────────────────────────────────────────────────
  'advanced.export': {
    title: 'Exportar configuración',
    short: 'Descargar el config.json actual a tu máquina.',
    body: `Útil para:
- Backup antes de un cambio grande
- Migrar a otro server (copiá data/ + importá el config)
- Versionar la config en git (NO recomendado por el apiKey, pero la parte de branding/layout sí)
- Compartir la config entre portales de la misma org

El archivo es \`data/config.json\` exacto, con un timestamp en el nombre.`,
  },
  'advanced.import': {
    title: 'Importar configuración',
    short: 'Subir un config.json y reemplazar el actual.',
    body: `**REEMPLAZA** la config actual. No es un merge.

**Cap de 1 MB** — un config típico pesa 5-50 KB, así que es muy generoso. Si te pasás, rechazamos.

**Cuidado**: el config importado puede tener una apiKey distinta a la que usás actualmente. Si es así, se reemplaza.

Después de importar, la página se recarga para aplicar.`,
  },
  'advanced.healthcheck': {
    title: 'Healthcheck del sistema',
    short: 'Verifica que el server está vivo y responde.',
    body: `Llama a \`GET /api/health\` (sin auth, público). Devuelve:
- \`status: 'ok'\` — todo bien
- \`version\` — versión del package.json
- \`uptime\` — segundos desde que arrancó el server

Útil para un uptime monitor externo (UptimeRobot, Better Uptime, etc.) que quiere saber si tu portal está vivo sin tener que parsear HTML.

Si Umbral está detrás de un reverse proxy, el healthcheck pasa por el proxy. Si ves \`status: 'degraded'\`, revisá los logs.`,
  },
  'advanced.reset': {
    title: 'Reset a defaults',
    short: 'Restaura la configuración a los valores de fábrica.',
    body: `**Pone TODA la config en defaults**, pero conserva:
- Tu password (no te desloguea)
- El CSRF token (las sesiones siguen vivas)
- Los assets subidos (fotos, logos)

**No conserva**: cards custom, categorías custom, theme custom, apiKey, etc.

Te pide escribir \`RESET\` para confirmar — no lo hacés por accidente.`,
  },

  // ── Seguridad (Password) ─────────────────────────────────────────
  'security.password': {
    title: 'Cambiar contraseña',
    short: 'Rota la password del admin. Invalida todas las otras sesiones.',
    body: `Tres campos: actual, nueva, confirmar. Si no coinciden, rechazamos.

Al guardar:
- Tu nueva password se hashea con bcrypt (cost 12)
- Se rota el CSRF token
- Se incrementa el \`authEpoch\` → **todas las sesiones existentes mueren al próximo request** (excepto la tuya, que sigue activa)

**Por qué importa invalidar otras sesiones**: si alguien te robó la sesión y vos cambiás la password sin invalidar, el atacante sigue adentro hasta que la cookie expire. Con epoch, la cookie queda muerta inmediatamente.`,
  },
  'security.csrf': {
    title: 'CSRF token',
    short: 'Token de un solo uso que valida requests de mutación.',
    body: `Se rota automáticamente al cambiar la password. Todas las requests POST/PUT/DELETE/PATCH deben mandar este token en el header \`x-csrf-token\`.

Si activás \`Rotar CSRF en cada login\` (Hardening), también rota cada vez que alguien inicia sesión.

**No lo copies a otros browsers/dispositivos** — está atado a tu sesión. Si lo perdés, hacé logout/login.`,
  },
};

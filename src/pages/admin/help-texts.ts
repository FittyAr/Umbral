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
};

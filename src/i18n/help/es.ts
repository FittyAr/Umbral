export type HelpText = { readonly title: string; readonly short: string; readonly body: string };

export const helpEs = {
  "session.ttlHours": {
    title: "Duración de la sesión (horas)",
    short: "Cuánto tiempo vive la cookie de sesión antes de pedir login de nuevo.",
    body: "La cookie de sesión se renueva con cada request. Después de este tiempo de inactividad, el admin tiene que volver a poner la contraseña.\n\n**Default 24h** es el sweet spot entre seguridad y usabilidad. Si tu Umbral está expuesto a internet bajalo a 1-4h. Si es sólo para vos en LAN, podés subirlo a 168h (1 semana) sin drama.",
  },
  "session.cookieSameSite": {
    title: "Cookie SameSite",
    short: "Cómo se comporta la cookie con links cross-site.",
    body: "**Lax (default)**: la cookie se manda con navegaciones top-level (click en un link) pero NO con iframes/img/POST cross-site. Balance bueno.\n\n**Strict**: la cookie NUNCA se manda en contexto cross-site. Más seguro pero rompe links desde otras apps (ej: Mattermost te manda al portal y la sesión no se reconoce).\n\n**None**: la cookie se manda en todos los contextos. REQUIERE Secure flag. Sólo si sabés lo que hacés.",
  },
  "session.cookieSecure": {
    title: "Cookie Secure flag",
    short: "Si la cookie sólo viaja sobre HTTPS.",
    body: "**Auto (recomendado)**: la cookie lleva el flag Secure sólo si el request es HTTPS. Si detectás HTTPS, endurcés; si no, dejás que funcione en HTTP para que no te trabes en dev.\n\n**Always**: siempre lleva Secure. Usá esto si tenés TLS terminado en un proxy y el cliente SIEMPRE llega por HTTPS.\n\n**Never**: nunca lleva Secure. La cookie viaja por HTTP en texto claro. NO recomendado salvo en LAN 100% aislada.",
  },
  "session.rotateCsrfOnLogin": {
    title: "Rotar CSRF en cada login",
    short: "Si cambia el token CSRF cada vez que alguien inicia sesión.",
    body: "Activado: cada login genera un CSRF token nuevo. Si alguien tenía un tab abierto con un CSRF viejo, ese tab queda invalidado.\n\n**Por qué importa**: si un atacante te roba el CSRF token (XSS, log compartido) y vos cambiás la contraseña sin rotar CSRF, el atacante sigue pudiendo hacer requests mutantes hasta que la sesión expire.\n\n**Default false** porque la rotación de CSRF en cada login obliga al admin a refrescar el browser después de login. Es una mejora de seguridad menor vs la fricción que agrega.",
  },
  "auth.minPasswordLength": {
    title: "Largo mínimo del password",
    short: "Caracteres mínimos al cambiar la contraseña.",
    body: "0 (default) = sin mínimo. Acepta passwords cortos por compat con configs viejas.\n\nSubilo a 8-12 para producción. Más de 16 no aporta mucho (vs passphrase larga).",
  },
  "auth.rateLimitMax": {
    title: "Rate limit (intentos)",
    short: "Máxima cantidad de intentos de login en la ventana de tiempo.",
    body: "Si alguien llega al límite, el endpoint /api/login devuelve 429 hasta que pase la ventana.\n\n**Default 30 / 60s** = suficiente para vos equivocarte varias veces, pero un brute force se frena rápido. Si vas a exponer Umbral a internet, bajalo a 5-10.",
  },
  "auth.rateLimitWindowSec": {
    title: "Rate limit (ventana en segundos)",
    short: "En cuántos segundos se resetea el contador de intentos.",
    body: "Funciona junto con rateLimitMax. Default 60s. Si bajás Max a 5, también bajá Window a 60s — sino bloqueás al user real.\n\nSi querés ser muy estricto: 3 intentos / 5min. Si te bloqueás a vos mismo esperá 5min o reiniciá el container (no se persiste en disco).",
  },
  "auth.csrfPolicy": {
    title: "Política CSRF",
    short: "Cuándo se exige el token CSRF.",
    body: "**Mutations (default)**: POST/PUT/DELETE/PATCH requieren CSRF. GET no. Es lo correcto en el 99% de los casos.\n\n**All**: también los GET requieren CSRF. Paranoia máxima. Rara vez necesario.\n\n**None**: no se chequea CSRF. **NO recomendado** salvo que estés en LAN 100% aislada y sabes lo que hacés. Un atacante que te haga clickear un link podría hacer cambios en tu config.",
  },
  "uploads.maxBytesLogo": {
    title: "Tamaño máx. del logo",
    short: "Bytes máximos del logo (header de la portada).",
    body: "Default 1 MB. Es para el logo del header, no necesitás más. Si subís un SVG pesa unos pocos KB y re-processa con sharp igual (sharp lo rasteriza).",
  },
  "uploads.maxBytesFavicon": {
    title: "Tamaño máx. del favicon",
    short: "Bytes máximos del favicon (.ico/.png).",
    body: "Default 256 KB. Un favicon de 32x32 pesa <5KB; este límite es generoso para ICOs animados o multi-resolución.",
  },
  "uploads.maxBytesIcon": {
    title: "Tamaño máx. de ícono de tarjeta",
    short: "Bytes máximos de la imagen de cada tarjeta.",
    body: "Default 512 KB. Las imágenes de las tarjetas se re-encodan a WebP/AVIF en sizes razonables. Si querés íconos SVG livianos, dejá este valor.",
  },
  "uploads.maxBytesBackground": {
    title: "Tamaño máx. del fondo",
    short: "Bytes máximos de la imagen de fondo.",
    body: "Default 5 MB. Es la única imagen grande del sistema. La optimizamos con sharp al servir pero igual la memoria del server la tiene que cargar.",
  },
  "uploads.allowedMimeTypes": {
    title: "MIME types permitidos",
    short: "Lista de tipos de archivo que se pueden subir.",
    body: "Whitelist separada por comas. Default: png, jpeg, webp, svg, gif.\n\n**Importante**: solo se permiten tipos `image/*`. No agregues `text/html`, `application/javascript`, etc. — Umbral no es un hosting de archivos, agregar un MIME ejecutable es vector de XSS si alguien encuentra forma de servirlo.\n\nSi querés ser estricto sacá `image/svg+xml` (los SVG pueden contener JS). El toggle `Permitir SVG` de abajo es la forma fácil de hacer esto.",
  },
  "uploads.allowSvg": {
    title: "Permitir subir SVGs",
    short: "Si se pueden subir archivos SVG.",
    body: "SVGs son vectores, pesan poco, son ideales para logos/íconos. PERO pueden contener JavaScript embebido que se ejecuta en el browser.\n\n**Si activás esto**, UMbral sanitiza el SVG con DOMPurify antes de servirlo (si sanitizeSvg está activo). La sanitización remueve scripts, eventos y elementos peligrosos.",
  },
  "uploads.sanitizeSvg": {
    title: "Sanitizar SVG con DOMPurify",
    short: "Pasa los SVGs subidos por DOMPurify antes de servirlos.",
    body: "DOMPurify parsea el SVG como HTML y remueve:\n- Tags `<script>`, `<foreignObject>`\n- Atributos `on*`, `href=\"javascript:...\"`, `xlink:href=\"javascript:...\"`\n- `<iframe>`, `<embed>`, `<object>`\n\nDefault activado. Si lo desactivás y permitís SVG, cualquier SVG malicioso se sirve tal cual. NO recomendado.",
  },
  "uploads.processImages": {
    title: "Procesar imágenes con sharp",
    short: "Re-encoda las imágenes subidas a WebP/AVIF al servirlas.",
    body: "Activado: cuando un user pide la imagen, sharp la re-encode on-the-fly al formato más eficiente para el browser. 50-80% menos bandwidth.\n\nDesactivado: servimos la imagen original. Útil si tenés problemas de CPU o memoria con sharp (raro en hardware moderno).",
  },
  "network.trustForwardedFor": {
    title: "Confiar en X-Forwarded-For",
    short: "Si usar el header X-Forwarded-For para rate limit por IP.",
    body: "**SÓLO activá esto si tenés un reverse proxy (nginx, Caddy, Traefik) en frente que sanea y SOBREESCRIBE X-Forwarded-For**.\n\nSi lo activás sin proxy, cualquier cliente puede mandar `X-Forwarded-For: 1.2.3.4` y bypasear el rate limit.\n\n**Detección de \"tengo proxy\"**: Umbral mira el header de la request directo. Si ves el IP de tu red local en los logs, NO tenés proxy / está mal configurado.",
  },
  "network.trustedProxies": {
    title: "Proxies confiables",
    short: "IPs/CIDRs de tus reverse proxies (informativo).",
    body: "Hoy es informativo, no funcional. Sirve de documentación para vos o tu equipo de cuándo se configuró el trust.\n\nFormato: una IP o CIDR por línea. Ej: `10.0.0.1` o `192.168.1.0/24`.",
  },
  "network.cookieDomain": {
    title: "Cookie domain",
    short: "A qué dominio se emite la cookie de sesión.",
    body: "Vacío (default) = la cookie se emite al hostname del request. Funciona en el 99% de los casos.\n\nCon prefijo punto (`.example.com`): la cookie es válida para `example.com` Y todos sus subdominios. Útil si querés compartir sesión entre `portal.example.com` y `docs.example.com`.",
  },
  "network.allowInternalHosts": {
    title: "Permitir hosts internos en health check",
    short: "Si el health check puede pegar a IPs privadas (10/8, 192.168/16, etc.).",
    body: "El health check hace HEAD requests a las URLs de las tarjetas para mostrar dot verde/rojo. Si tus tarjetas son servicios internos (1Panel en `http://10.155.49.240:39611/`, Excalidraw en otro container, etc.) este toggle DEBE estar activado.\n\n**Default true** porque Umbral es un portal interno — el caso de uso primario es monitorear tus propios servicios.\n\n**Cuándo desactivarlo**: si exponés Umbral a internet. La guard SSRF bloquea `169.254.169.254` (cloud metadata) SIEMPRE, esté como esté este toggle.",
  },
  "headers.csp": {
    title: "Content-Security-Policy",
    short: "Qué recursos puede cargar el browser.",
    body: "El default incluye:\n- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — Alpine.js 3 necesita `'unsafe-eval'` para sus expresiones dinámicas\n- `img-src 'self' data: https:` — permite favicons externos y data: URIs\n- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — Inter font de Google\n- `frame-ancestors 'none'` — anti clickjacking\n\n**Vacío = no se envía el header CSP** (modo permisivo, útil para debug).\n\nPara endurecer: leé https://web.dev/articles/strict-csp. Cuesta porque Alpine 3 rompe con `script-src 'self'` puro.",
  },
  "headers.xFrameOptions": {
    title: "X-Frame-Options",
    short: "Si la página se puede embeber en un iframe.",
    body: "**DENY (default)**: nadie puede embeber Umbral en un iframe. Anti clickjacking total.\n\n**SAMEORIGIN**: sólo se permite embeber desde el mismo origen.\n\n**NONE**: se permite embeber desde cualquier lado. NO recomendado.",
  },
  "headers.referrerPolicy": {
    title: "Referrer-Policy",
    short: "Cuánta info se manda en el header Referer al navegar fuera.",
    body: "**no-referrer (default)**: no se manda nada. Máxima privacidad.\n\n**same-origin**: solo se manda el referrer a links internos.\n\n**strict-origin-when-cross-origin**: manda el origen (no el path) a links cross-origin HTTPS, nada a HTTP.\n\n**no-referrer-when-downgrade**: manda el referrer full a HTTPS, nada al bajar a HTTP. Default histórico de los browsers.",
  },
  "headers.permissionsPolicy": {
    title: "Permissions-Policy",
    short: "Qué features del browser puede usar la página (cámara, mic, geo, etc.).",
    body: "Default deshabilita cámara, micrófono y geolocalización. Si querés ser más estricto podés agregar `payment=(), usb=(), magnetometer=()`, etc.\n\nFormato: lista de directivas separadas por coma. `feature=()` = bloquear, `feature=(self)` = permitir mismo origen, `feature=(self \"https://otro.com\")` = permitir origen + otro.",
  },
  "headers.hsts": {
    title: "HSTS mode",
    short: "Cómo se envía el header Strict-Transport-Security.",
    body: "**Auto (default)**: lo activa sólo si el request es HTTPS. En LAN HTTP no hace nada, en producción HTTPS endurcés out-of-the-box.\n\n**Always**: lo fuerza siempre. Útil si tu proxy siempre termina TLS.\n\n**Never**: no se envía nunca. NO recomendado si estás en HTTPS.\n\n**Cuidado con max-age**: una vez que un browser vio `max-age=31536000`, lo recuerda un año. Si después bajás HTTPS, los browsers NO van a poder llegar a tu sitio por un año. Testá primero con `max-age=300` (5 min).",
  },
  "headers.hstsMaxAge": {
    title: "HSTS Max-Age",
    short: "Cuántos segundos el browser recuerda \"sólo HTTPS para este dominio\".",
    body: "Default 31536000 (1 año) — el sweet spot según RFC 6797.\n\n**Antes de subir a producción**: probá con 300 (5 min) un rato. Si todo anda bien, subí a 3600 (1h), después 86400 (1 día), y recién ahí a 1 año. Esto te da tiempo de rollback si rompés algo.\n\n0 desactiva HSTS incluso si Modo está en 'auto' o 'always'.",
  },
  "headers.hstsIncludeSubDomains": {
    title: "HSTS includeSubDomains",
    short: "Si la regla HSTS aplica a subdominios también.",
    body: "**Activá SÓLO si TODOS tus subdominios son HTTPS**. Si tenés `foo.example.com` en HTTP, un browser que vio `includeSubDomains` no va a poder cargarlo por un año.\n\nDefault false por seguridad. Si tu dominio entero es HTTPS, activá y olvidate.",
  },
  "headers.hstsPreload": {
    title: "HSTS preload",
    short: "Si querés enviar el dominio a la lista hardcodeada de Chrome/Firefox/Safari.",
    body: "Si activás esto y vas a https://hstspreload.org, Chrome/Firefox/Safari hardcodean tu dominio en sus binaries como \"siempre HTTPS, siempre includeSubDomains\". Es **permanente y muy difícil de revertir**.\n\n**Requisito**: includeSubDomains=true, max-age >= 31536000, y TODOS los subdominios HTTPS. Por default Umbral no fuerza esto, queda en tu decisión.",
  },
  "theme.groupLayout": {
    title: "Layout de grupos",
    short: "Vertical (apilado) u horizontal (columnas side-by-side).",
    body: "**Vertical (default)**: las categorías se apilan una debajo de la otra. Más natural para pocas categorías con muchas cards.\n\n**Horizontal**: las categorías se ponen en columnas side-by-side. Útil si tenés 4+ categorías con pocas cards cada una. En mobile se sigue apilando.",
  },
  "theme.showClock": {
    title: "Mostrar reloj",
    short: "Reloj HH:MM:SS en vivo en el header.",
    body: "Actualiza cada segundo, usa la hora del browser del user. No consume nada del server. Útil para portales tipo kiosk o workstations siempre prendidas.",
  },
  "theme.showRefresh": {
    title: "Mostrar botón de refresh",
    short: "Botón en el header que recarga la config sin recargar la página.",
    body: "Más rápido que F5 y conserva el scroll/state del browser. Trae la config del server y refresca los assets. Útil si tenés scripts externos que modifican el config y querés reflejar cambios sin recargar todo.",
  },
  "theme.showStatusBar": {
    title: "Mostrar status bar",
    short: "Pie de página con versión de Umbral y última actualización de la config.",
    body: "Muestra la versión del package.json y la fecha de `_meta.updatedAt` de la config. Útil para debug (\"¿el server ya tiene la nueva config?\") y para saber qué versión está corriendo cada portal en tu fleet.",
  },
  "theme.animations.cardEntrance": {
    title: "Entrada de las tarjetas",
    short: "Cómo aparecen las tarjetas al cargar la portada.",
    body: "**Sin animación (default)**: las tarjetas se dibujan directo, es lo más rápido.\n\n**Aparecer (fade)**: pasan de transparente a visible.\n\n**Crecer (scale)**: además arrancan un 4% más chicas.\n\nEs CSS puro (`@keyframes`), no hay JavaScript involucrado: el HTML se sirve completo igual, así que el contenido se ve incluso si la animación no corre.",
  },
  "theme.animations.cardEntranceDuration": {
    title: "Duración de la entrada",
    short: "Cuánto dura la animación de cada tarjeta, en milisegundos.",
    body: "Entre 100 y 2000 ms, default 600. Arriba de 1000 se empieza a sentir lento en portales con muchas tarjetas. Este mismo valor se usa para el efecto del header.",
  },
  "theme.animations.cardEntranceStagger": {
    title: "Retardo entre tarjetas",
    short: "Cuánto espera cada tarjeta respecto de la anterior.",
    body: "En 0 (default) todas entran juntas. Con 60-80 ms se genera el efecto de cascada.\n\nEl escalonado se corta en la tarjeta 12: más allá de eso el retardo acumulado sería tan largo que la última aparecería mucho después de que el usuario ya scrolleó, así que el resto entra junto.",
  },
  "theme.animations.categoryEntrance": {
    title: "Entrada de las categorías",
    short: "Anima el bloque entero de cada categoría, no sólo sus tarjetas.",
    body: "Se puede combinar con la entrada de tarjetas: la categoría entra y las tarjetas entran dentro de ella. Si las dos usan el mismo efecto puede sentirse doble, así que suele quedar mejor una sutil (`fade` en la categoría) y otra más marcada (`slide-up` en las tarjetas), o directamente una sola.\n\nUsa la misma duración, curva y retardo que la entrada de tarjetas.",
  },
  "theme.animations.entranceEasing": {
    title: "Curva del movimiento",
    short: "Cómo reparte la velocidad la animación a lo largo de su duración.",
    body: "**Frena al final (default)**: arranca rápido y desacelera. Es lo que se siente más natural para algo que aparece.\n\n**Suave en ambas puntas**: arranca y termina lento.\n\n**Constante**: velocidad pareja, se siente mecánico.\n\n**Rebote**: se pasa del valor final y vuelve. Con `scale` o los slides queda simpático; con duraciones cortas casi no se nota.",
  },
  "theme.animations.entranceTrigger": {
    title: "Cuándo se dispara la entrada",
    short: "Al cargar la página, o cuando el elemento entra en pantalla.",
    body: "**Al cargar (default)**: todo anima una vez, al abrir el portal. No necesita JavaScript.\n\n**Al entrar en pantalla**: cada tarjeta o categoría anima cuando aparece al scrollear. Es la única animación que usa JavaScript (un `IntersectionObserver` de unas pocas líneas, inline, sin dependencias). **Sin JavaScript no se esconde nada**: el portal se ve completo y quieto, nunca vacío.\n\nEn portales que entran enteros en una pantalla las dos opciones se ven igual.\n\nEl header siempre anima al cargar, porque está arriba de todo.",
  },
  "theme.animations.entranceDistance": {
    title: "Distancia del desplazamiento",
    short: "Cuántos píxeles recorre el elemento en los efectos de slide.",
    body: "Entre 4 y 64 px, default 16. Sólo afecta a los efectos de slide; `fade`, `scale` y `blur` lo ignoran, por eso el control aparece recién cuando elegís un slide.\n\nValores altos se sienten dramáticos pero pueden hacer que el contenido \"salte\" en pantallas chicas.",
  },
  "theme.animations.cardHover": {
    title: "Hover de las tarjetas",
    short: "Qué hace la tarjeta cuando pasás el mouse por encima.",
    body: "**El de siempre (default)**: sube 2 px y cambia el sombreado, que es lo que Umbral hizo siempre.\n\n**Sin movimiento**: deja el cambio de color pero saca el desplazamiento. Útil en pantallas táctiles o en portales tipo kiosk.\n\n**Levantar**: sube más (6 px).\n\n**Agrandar**: escala un 3%.\n\n**Resplandor**: agrega un halo con el color de acento.\n\n**Inclinar**: sube y rota un grado.",
  },
  "theme.animations.hoverDuration": {
    title: "Duración del hover",
    short: "Cuánto tarda la transición al pasar el mouse, en milisegundos.",
    body: "Entre 0 y 600 ms, default 180 (el valor histórico de Umbral). En 0 el cambio es instantáneo. Arriba de 300 se empieza a sentir pesado, porque el hover es una respuesta directa a lo que hace la mano.\n\nAfecta a todas las transiciones de la tarjeta: transform, sombra, fondo y borde.",
  },
  "theme.animations.headerEffect": {
    title: "Efecto del header",
    short: "Misma animación de entrada, aplicada al header de la portada.",
    body: "Usa los mismos efectos y la misma duración que la entrada de las tarjetas. Se puede combinar: header con `fade` y tarjetas con `scale`, por ejemplo.",
  },
  "theme.animations.titleTypewriter": {
    title: "Título con máquina de escribir",
    short: "Escribe el nombre de la empresa letra por letra.",
    body: "Es el único efecto que necesita JavaScript. **El texto se sirve completo en el HTML igual**: sin JS el título se ve normal, no vacío. Tampoco afecta el SEO ni los lectores de pantalla.\n\nEscribe una sola vez al cargar, no cicla ni borra.",
  },
  "theme.animations.counters": {
    title: "Contadores animados",
    short: "La cantidad de apps en la status bar cuenta desde cero.",
    body: "Requiere tener la status bar activada (`theme.showStatusBar`). El número final está en el HTML servido, la animación sólo lo reemplaza cuando el contador entra en pantalla.",
  },
  "theme.animations.respectReducedMotion": {
    title: "Respetar «reducir movimiento» del sistema",
    short: "No animar nada para quien pidió menos movimiento en su sistema operativo.",
    body: "Dejalo en true (default). Cuando está activo, las animaciones se envuelven en `@media (prefers-reduced-motion: no-preference)`, así que quien configuró «reducir movimiento» en Windows/macOS/iOS/Android ve el portal quieto.\n\nApagarlo fuerza las animaciones incluso ahí, lo cual puede causar malestar a personas con trastornos vestibulares. El CSS global mantiene un guard mínimo sobre las transiciones de todos modos.",
  },
  "layout.healthCheckInterval": {
    title: "Intervalo de health check (segundos)",
    short: "Cada cuántos segundos volver a probar las URLs marcadas.",
    body: "Default 60s. Mínimo 10s (evita martillar el server con muchas cards activas). Máximo 1h.\n\nSi tenés muchas cards y ves lag, subilo a 120-300. Si necesitás detección de caídas rápida, bajalo a 30.",
  },
  "ai.systemPrompt": {
    title: "System prompt del asistente IA",
    short: "Las instrucciones de sistema que recibe la IA.",
    body: "Acá definís la \"personalidad\" del asistente. Si lo dejás vacío, Umbral usa uno default en castellano rioplatense optimizado para mejorar títulos/descripciones de tarjetas.\n\nModificalo si querés que la IA:\n- Escriba en otro idioma o tono (más formal, más técnico, etc.)\n- Ponga límites distintos (ej: \"máximo 80 chars en título\")\n- Devuelva la respuesta en otro formato (markdown, lista, etc.)\n\n**No se valida lo que pongas acá** — es texto libre que va directo al provider.",
  },
  "ai.apiKey": {
    title: "API Key del provider IA",
    short: "Tu clave de API del provider que elegiste.",
    body: "**Se guarda en `data/config.json` en texto plano.** No usamos vault, encryption, ni nada. Esto es un trade-off documentado: la alternativa es pedir al user que cargue la key en cada request, lo cual es fricción enorme para algo que se usa en cada mejora.\n\n**Mitigaciones**:\n1. `data/` debería estar en un volume con filesystem permissions restrictivos\n2. Si exponés Umbral a internet, poné un reverse proxy con auth frente a /admin\n3. Si te comprometen, rotá la key en el provider (es 30 segundos en su panel)\n\nPara Ollama/LM Studio local no hace falta — poné \"ollama\" o dejá vacío.",
  },
  "ai.preset": {
    title: "Preset de provider IA",
    short: "Elegí un provider popular para autocompletar baseUrl y modelo.",
    body: "Elegir un preset te llena automáticamente la Base URL y el Modelo con valores oficiales (verificados contra la doc de cada provider en la fecha del commit).\n\nDespués podés editar cualquiera de los dos a mano — si dejás de matchear el preset, el dropdown vuelve automáticamente a \"Custom / Otro\".\n\n**Custom** es para proxies internos, gateways privados, o providers nuevos que no estén en la lista. Ponés la URL a mano y listo.",
  },
  "ai.model": {
    title: "Modelo del provider",
    short: "Qué modelo específico querés usar (ej: gpt-4o-mini, claude-sonnet-4-5).",
    body: "El nombre exacto que el provider espera en el parámetro `model` de la request.\n\nAlgunos providers (OpenAI, Google) aceptan aliases que siempre resuelven a la última versión (ej: `gpt-4o-latest`, `gemini-2.0-flash`). Otros (Anthropic, Mistral) requieren el nombre completo.\n\n**Para Ollama / LM Studio local**: el modelo es el que descargaste con `ollama pull` o cargaste en la GUI. Pegá el nombre exacto.",
  },
  "ai.language": {
    title: "Idioma de la IA",
    short: "En qué idioma escribe la IA cuando mejora una tarjeta.",
    body: "Default **Castellano (rioplatense)** — el tono que ven los users en la UI de Umbral. Si tus servicios y usuarios son en otro idioma, cambialo acá.\n\n**Idiomas soportados**: Castellano, English, Português (brasileiro), Français, Deutsch, Italiano.\n\n**Cómo se usa**: cuando hacés click en \"Mejorar con IA\" y `systemPrompt` está vacío, el server inyecta el template del idioma elegido como system prompt. La IA recibe la instrucción de escribir el title/description en ese idioma.\n\n**No afecta** al contenido que ya escribiste vos. Si tu tarjeta ya tiene texto y la IA sólo lo pule, lo deja en el idioma original — el `language` sólo aplica cuando la IA genera desde cero.\n\n**Override manual**: si querés un tono o idioma custom, llená `System prompt` a mano y el template se ignora.",
  },
  "branding.companyName": {
    title: "Nombre de la empresa / equipo",
    short: "Aparece en el header, title de la página y mensajes.",
    body: "Texto plano, hasta 80 chars. Se usa en:\n- El title de la pestaña del browser (`<title>`)\n- El header de la portada (si no hay logo)\n- El subject de emails de auditoría\n- Mensajes del sistema (\"Bienvenido a {companyName}\")\n\n**Tip**: poné el nombre canónico del equipo o proyecto, no \"Mi Empresa\" — queda feo en logs.",
  },
  "branding.logo": {
    title: "Logo del header",
    short: "Imagen que aparece arriba a la izquierda en la portada.",
    body: "Subilo desde el tab Assets y elegilo acá. Formatos: PNG, JPEG, WebP, SVG, GIF.\n\n**Tamaño recomendado**: 200-400px de ancho, 40-80px de alto. El header lo escala con CSS `max-height`. Logos más grandes se ven pixelados en pantallas retina.\n\nSi no ponés logo, se muestra el `companyName` como texto.",
  },
  "branding.favicon": {
    title: "Favicon",
    short: "El ícono chiquito que aparece en la pestaña del browser.",
    body: "32×32 o 16×16 PNG, idealmente. ICO también funciona. SVG es soportado en browsers modernos.\n\nSi no ponés favicon, los browsers muestran un cuadrado blanco o un ícono genérico — se ve poco prolijo.",
  },
  "theme.background.type": {
    title: "Tipo de fondo",
    short: "Si el fondo es un color sólido, un gradiente CSS, o una imagen.",
    body: "**Gradiente / Color CSS** (default): un valor CSS libre. Ejemplos: `#0f172a` (azul oscuro), `linear-gradient(135deg, #0f172a, #1e3a8a)`, `radial-gradient(circle, #1e3a8a, #0f172a)`.\n\n**Color sólido**: un hex sin gradient. Más simple, más rápido de render.\n\n**Imagen**: una imagen subida. Útil para dashboards con branding fuerte (foto de la oficina, gráfico de fondo). El blur y overlay de abajo te dejan suavizarlo para que las cards se lean bien encima.",
  },
  "theme.background.value": {
    title: "Valor del fondo",
    short: "El CSS (gradient/color) o URL de la imagen, según el tipo.",
    body: "Si tipo es **gradiente/color**: cualquier CSS válido. El sistema sanitiza con regex para bloquear inyecciones.\n\nSi tipo es **imagen**: elegila del dropdown de Assets (sólo aparecen los PNG/JPG/WebP que subiste).\n\n**Atajos útiles**:\n- `#0a0a0a` — negro casi puro (modo oscuro)\n- `#f8fafc` — casi blanco (modo claro)\n- `linear-gradient(135deg, #1e293b, #0f172a)` — gradiente azul oscuro clásico\n- `linear-gradient(135deg, #fef3c7, #fde68a)` — gradiente cálido amarillo",
  },
  "theme.background.blur": {
    title: "Blur del fondo",
    short: "Cuánto se desenfoca la imagen/color de fondo (0-40px).",
    body: "Útil sólo si tenés una imagen de fondo y querés suavizarla para que las cards se lean encima. Con gradientes/color no hace nada visible.\n\n**Regla**: 0 para imágenes nítidas (logos, fotos hero), 10-20 para imágenes decorativas, 30+ para imágenes que estorban mucho.",
  },
  "theme.background.overlay": {
    title: "Overlay opacity",
    short: "Capa oscura/semi-transparente encima del fondo (0-1).",
    body: "Agrega un tinte (color configurado abajo) encima del fondo. Sirve para garantizar contraste con el texto de las cards, sin tener que tocar la imagen.\n\n**0**: sin overlay (la imagen manda)\n**0.3-0.5**: sutil, deja ver la imagen\n**0.7+**: casi opaco, prioriza legibilidad\n\nCon gradientes/color el overlay no se nota mucho.",
  },
  "theme.background.overlayColor": {
    title: "Color del overlay",
    short: "El color de la capa de overlay (default negro).",
    body: "Default negro (#000000) para oscurecer. Blanco (#ffffff) si querés aclarar una imagen oscura. Cualquier hex color funciona.",
  },
  "theme.accentColor": {
    title: "Color de acento",
    short: "Color de highlight (selección, links, hover).",
    body: "Se usa para:\n- El color del dot de health check cuando la card está OK\n- El border/background de los items seleccionados en admin\n- Hover states en links\n- Borde del input focused\n\n**Tip**: un accent contrastante pero no estridente. `#60a5fa` (azul cielo) es el default porque funciona con fondos claros y oscuros.",
  },
  "theme.textColor": {
    title: "Color de texto",
    short: "Color principal del texto en la portada.",
    body: "Default `#f1f5f9` (casi blanco). Cambialo si tu fondo es claro (`#0f172a` para azul oscuro, `#1e293b` para gris oscuro).\n\nAsegurate de tener contraste suficiente con el fondo (WCAG AA = ratio 4.5:1 para texto normal).",
  },
  "theme.cardStyle": {
    title: "Estilo de tarjeta",
    short: "Glass (blur), flat, o outlined.",
    body: "**Glass** (default): cards semi-transparentes con blur del fondo. Queda lindo con gradientes pero puede comer CPU en dispositivos viejos.\n\n**Flat**: cards opacas, color sólido. Más rápido, más legible, menos \"lujoso\".\n\n**Outlined**: cards transparentes con border. Equilibrio entre los dos.",
  },
  "theme.fontFamily": {
    title: "Tipografía",
    short: "Qué fuente usar para todo el portal.",
    body: "Lista curada de Google Fonts + `system-ui` (la del SO del user). Cada opción carga su CSS de Google Fonts automáticamente.\n\n**`system-ui`** no carga nada de Google — usa la fuente del sistema. Más rápido y respeta las preferencias del user.\n\nSi necesitás una fuente custom (la de tu marca, por ejemplo), andá a Hardening → Headers de seguridad y editá `fontUrl` — pero ojo, el schema valida que venga de fonts.googleapis.com.",
  },
  "theme.colorMode": {
    title: "Modo de color",
    short: "Auto, oscuro, o claro.",
    body: "**Auto** (default): el portal elige light/dark según `theme.autoStrategy`:\n- **system** (default): `prefers-color-scheme` del navegador/OS.\n- **schedule**: claro entre 7 y 19, oscuro el resto.\n\n**Oscuro** / **Claro**: fuerza el modo. Útil si querés un look consistente.\n\nPodés ocultar el toggle de la portada con `theme.showModeToggle`. El override del user persiste en `localStorage`.",
  },
  "layout.columnsDesktop": {
    title: "Columnas en desktop",
    short: "Cuántas cards por fila en pantallas grandes.",
    body: "Default 4. Rangos:\n- **2-3**: pocas cards, una por servicio importante\n- **4-6**: el sweet spot para portales típicos\n- **7-8**: requiere cards chicas, sólo si tenés muchas\n\nMirá la **vista previa** a la derecha del formulario para ver cómo queda.",
  },
  "layout.columnsTablet": {
    title: "Columnas en tablet",
    short: "Cuántas cards por fila en tablets (entre 768px y 1024px).",
    body: "Default 3. Usá 2 si tenés cards con descripciones largas.",
  },
  "layout.columnsMobile": {
    title: "Columnas en mobile",
    short: "Cuántas cards por fila en phones.",
    body: "Default 2. Poné 1 si tus cards son grandes o tienen mucho texto.",
  },
  "layout.cardSize": {
    title: "Tamaño de tarjeta",
    short: "Chico, mediano, o grande.",
    body: "Define el padding y la densidad de la card.\n\n**Chico**: más cards visibles, menos detalle.\n**Mediano** (default): balance.\n**Grande**: cards con más aire, mejor para pocos servicios importantes.",
  },
  "layout.showDescriptions": {
    title: "Mostrar descripciones",
    short: "Si mostrar el texto debajo del título de cada card.",
    body: "Si lo desactivás, las cards muestran sólo título + ícono. Útil cuando tenés muchas cards y el espacio escasea, o cuando el user ya sabe qué es cada servicio.",
  },
  "layout.gap": {
    title: "Espaciado entre tarjetas",
    short: "Distancia entre cards en la grilla (en rem).",
    body: "Default **1rem**. Valores bajos (0–0.5) densifican la grilla; valores altos (1.5–3) dan más aire. Mirá la vista previa a la derecha para calibrar.",
  },
  "layout.categoryGap": {
    title: "Espaciado entre categorías",
    short: "Aire vertical entre un bloque de categoría y el siguiente (en rem).",
    body: "Default **2rem**. Es la separación de entrada de cada categoría con título, así que también define cuánto respira la primera respecto del encabezado de la página.\n\nEn layout horizontal, donde las categorías son columnas lado a lado, el mismo valor controla el espacio entre esas columnas.\n\n**Ojo con el modo compacto**: si está activo, este valor se aplica a la mitad, igual que el resto del espaciado.",
  },
  "layout.ghostCategoryGap": {
    title: "Espaciado de tarjetas sueltas",
    short: "Aire antes de un bloque de tarjetas sin categoría (en rem).",
    body: "Default **0.35rem**. Las tarjetas sueltas viven en una *categoría fantasma*: un bloque sin título que aparece entre grupos. Como no tiene encabezado, necesita mucho menos aire que una categoría normal — con el mismo valor quedaría flotando sin que se entienda a qué pertenece.\n\nSubilo si querés que las sueltas se lean como un bloque aparte; bajalo a 0 para que queden pegadas al grupo de arriba.",
  },
  "layout.maxWidth": {
    title: "Ancho máximo del contenido",
    short: "Ancho máximo del contenedor principal en px.",
    body: "Default **1280px**. En monitores ultra-wide evita que las cards se estiren demasiado. Valores menores (960–1120) concentran el contenido; mayores (1440–1920) aprovechan pantallas grandes.",
  },
  "layout.gridAlign": {
    title: "Alineación del contenido",
    short: "Centrado o alineado a la izquierda.",
    body: "**Centrado** (default): el bloque de contenido queda en el medio de la pantalla.\n\n**Izquierda**: el contenido se alinea al borde izquierdo — útil en layouts asimétricos o cuando hay sidebar externo.",
  },
  "layout.cardRadius": {
    title: "Radio de esquinas",
    short: "Qué tan redondeadas son las esquinas de cada card (px).",
    body: "Default **12px**. **0** = esquinas rectas (look más técnico). Valores altos (20–32) dan un aspecto más suave/bubble.",
  },
  "layout.compact": {
    title: "Modo compacto",
    short: "Reduce paddings verticales de secciones y tarjetas.",
    body: "Útil cuando tenés muchas categorías y cards — encaja más contenido en pantalla sin reducir el número de columnas. Combinalo con **cardSize: chico** para máxima densidad.",
  },
  "layout.preview": {
    title: "Vista previa de layout",
    short: "Simula cómo se verá la grilla en distintos viewports.",
    body: "El conmutador **Móvil / Tablet / Desktop** cambia cuántas columnas se aplican en el preview (los breakpoints reales no disparan dentro del panel angosto).\n\nLa preview respeta gap, tamaño de card, radio, descripciones, modo compacto y la disposición de grupos del tema.",
  },
  "cards.grouping": {
    title: "Tarjetas agrupadas por categoría",
    short: "Organizá y mové tarjetas entre categorías.",
    body: "Las tarjetas se muestran agrupadas según el orden de categorías del tab **Categorías**.\n\n**Arrastrá** con el handle `⋮⋮` para reordenar dentro de un grupo o mover entre grupos. **Soltá entre grupos** (o al inicio/fin) para dejar la tarjeta **sin grupo**: aparece en la portada en esa ubicación, sin título de categoría.\n\n**Selector de categoría** en cada fila: alternativa accesible por teclado. Incluye **Sin grupo**.\n\nCon **filtro de texto** activo el arrastre se deshabilita (la lista parcial no representa el orden real) — usá el selector para mover.\n\nLas tarjetas huérfanas (categoría borrada) aparecen en **Sin categoría**.\n\nInternamente las sueltas viven en categorías fantasma (`isGhost: true`): no se editan en el tab Categorías y se auto-eliminan al vaciarse.",
  },
  "card.title": {
    title: "Título de la tarjeta",
    short: "El texto principal que se ve en la card.",
    body: "Máximo 80 chars. Se muestra en negrita en la card.\n\n**Tip**: si vas a usar el botón \"Mejorar con IA\" después, poné un título rough (\"1Panel\", \"Hermes\") y dejá que la IA lo pula con un system prompt custom.",
  },
  "card.kind": {
    title: "Tipo de tarjeta",
    short: "Link (clickeable) o Note (informativa, sin link).",
    body: "**Link** (default): la card es clickeable y lleva a la URL. La URL es obligatoria.\n\n**Note**: la card NO es clickeable. Sirve para tips, anuncios, info fija del equipo (\"Próxima reunión: jueves 14hs\"), recordatorios. La URL queda opcional y podés poner un link de referencia si querés.\n\nCambiar el tipo de una card existente a \"Note\" la oculta como link y la muestra como cuadro de texto.",
  },
  "card.url": {
    title: "URL de la tarjeta",
    short: "A dónde lleva cuando el user hace click (sólo tipo \"link\").",
    body: "Acepta:\n- `https://servidor:puerto/path` — servicio interno o externo\n- `/docs`, `/admin` — rutas internas de Umbral\n- `http://10.x.x.x:port` — IPs privadas (health check funciona con `allowInternalHosts=true`)\n\n**El sistema normaliza automáticamente**:\n- Saca whitespace/newlines del principio y final\n- Si no tiene esquema (`http://`/`https://`) y no es path interno, le prepende `http://`\n- Si empieza con `//`, le prepende `http:`\n\n**No se permite**: `javascript:`, `data:`, `vbscript:`, ni nada que no sea http/https/path.",
  },
  "card.description": {
    title: "Descripción de la tarjeta",
    short: "Texto debajo del título. Plain: 200 chars. Markdown (opt-in): 1000 chars.",
    body: "Aparece debajo del título en la card. Útil para aclarar qué es el servicio o agregar contexto (\"Backup semanal lunes 3AM\", \"Pedí acceso a #infra en Slack\").\n\n**Plain (default)**: 200 chars. Texto plano, escapado por seguridad. No se interpreta nada.\n\n**Markdown (opt-in)**: 1000 chars. Si la feature `features.markdown` está activa, aparece un toggle \"Markdown\" en el form. El preview se renderiza con la misma lib (`marked` + `DOMPurify`) que el server, así que lo que ves es lo que sale.\n\nMarkdown soportado (GitHub-flavored, GFM): listas, links, **negrita**, `código`, ```bloques```, tablas, blockquotes, line breaks. Tags HTML permitidos: `a, b, i, em, strong, p, br, ul, ol, li, h1-6, blockquote, code, pre, span, div, img, table` (cualquier otro se escapa). Atributos: `href, title, alt, src, class`. `href` con protocolo no-http (ej: `javascript:`) se bloquea.\n\n**Si la feature está apagada**: el toggle no aparece en el form. El server fuerza plain + límite 200 aunque alguien mande `descriptionFormat: \"markdown\"` por la API.\n\nSi la dejás vacía, la card se ve más limpia pero pierde info útil. Si vas a usar \"Auto-completar\" o \"Mejorar con IA\", la IA también la pule.",
  },
  "card.pinned": {
    title: "Tarjeta fijada (pinned)",
    short: "Aparece arriba en su categoría, sin importar el orden.",
    body: "Las tarjetas **fijadas** se renderizan primero en su categoría, sin importar el campo `order`. Útil para destacar servicios críticos (VPN, status page, monitor) que querés que el usuario vea primero sin reorderar manualmente.\n\n**Cómo se prioriza**:\n1. Pinned primero (entre las pinned, mantiene el orden por `order`).\n2. Después, el resto por `order` ASC.\n\n**Cuándo NO pinear**:\n- Si querés que la card esté primero SOLO para vos (admin) y no para los visitantes, no tenés flag per-user todavía — pinear afecta a todos.\n- Si querés un orden estable entre muchas cards, mejor usar `order` numérico.\n\n**Si la feature está apagada**: el checkbox no aparece en el form. El server fuerza `pinned: false` en cualquier card que mande `pinned: true` por la API.",
  },
  "card.tags": {
    title: "Tags de la tarjeta",
    short: "Etiquetas kebab-case cross-cutting. Max 10 por tarjeta.",
    body: "Las tags son **cross-cutting**: complementan la categoría con dimensiones alternativas (ej: \"urgent\", \"frontend\", \"legacy\", \"migrar-pronto\"). Una card puede tener tags de varias dimensiones sin necesidad de cambiar su categoría.\n\n**Formato**: kebab-case lowercase (a-z, 0-9, guiones), max 30 chars por tag, max 10 tags por tarjeta. Ejemplos válidos: `api`, `backend-go`, `legacy-v1`, `urgent`.\n\n**Cómo se usan**:\n- Búsqueda: el input de búsqueda arriba de la portada matchea contra el texto de la card Y las tags. Escribís \"urgent\" y te aparece toda card con esa tag.\n- Filtrado futuro: la UI podría agregar un pill-row \"filtrar por tag\" (no incluido en esta ola — solo búsqueda).\n- Organización visual: en la lista de cards del admin, las tags aparecen como chips chicos al lado del URL.\n\n**Cuándo NO usar tags**: si tenés una dimensión con 5+ valores que querés usar para filtrar visualmente, mejor una sub-categoría (`isSubpage: true`). Las tags son para info complementaria, no para agrupar navegación.\n\n**Si la feature está apagada**: el campo no aparece en el form, y el server dropea cualquier `tags[]` que venga en el JSON al guardar. Defense-in-depth: aunque alguien bypassee el cliente y mande tags por la API, no se persisten si la feature no está activa.",
  },
  "card.category": {
    title: "Categoría",
    short: "A qué grupo pertenece la card (Comunicación, Productividad, etc.).",
    body: "Las categorías se crean en el tab \"Categorías\" del admin. Cada card tiene que estar en una. Si borrás una categoría, las cards que estaban ahí se mueven automáticamente a la primera que quede.",
  },
  "card.color": {
    title: "Color de la card",
    short: "Color de acento para el ícono y el dot de health check.",
    body: "No es el color de fondo — es el color del ícono/dot. Default `#60a5fa` (azul cielo).\n\n**Tip**: usá colores consistentes por categoría. Comunicación en verde, Productividad en azul, Dev en púrpura. Le da identidad visual al portal.",
  },
  "card.span": {
    title: "Ancho de la tarjeta",
    short: "Cuántas columnas del grid ocupa. Default 1.",
    body: "Sirve para darle más peso visual a una tarjeta: con 3 columnas configuradas, una tarjeta de ancho 2 ocupa dos tercios de la fila y las demás siguen abajo.\n\n**Se adapta solo**: el valor se recorta a las columnas disponibles de cada breakpoint. Si pedís 4 pero en mobile tenés 1 columna, ahí ocupa 1. No hace falta configurar nada por dispositivo.\n\n**Truco**: elegí el máximo (8) para \"todo el ancho\". Como 8 es también el máximo de columnas en desktop, siempre se recorta al total configurado — la tarjeta sigue full width aunque después cambies las columnas en la pestaña Layout.\n\n**Ojo**: no cambia el alto ni el contenido, sólo el ancho. Una tarjeta muy ancha con poco texto puede verse vacía; combinala con una descripción.",
  },
  "card.icon": {
    title: "Ícono de la tarjeta",
    short: "El dibujo pequeño al lado del título.",
    body: "Elegilo del picker de íconos (los predefinidos cubren los casos comunes). Si necesitás uno custom, desplegá el panel de abajo y tipeá el nombre de un Lucide icon o la URL de un asset que subiste.\n\n**Nombres Lucide populares** que no están en el set default: `rocket`, `database`, `server`, `terminal`, `github`, `docker`, etc. Cualquier nombre de https://lucide.dev funciona.",
  },
  "card.openInNewTab": {
    title: "Abrir en nueva pestaña",
    short: "Si la URL se abre en una pestaña nueva o reemplaza la actual.",
    body: "Default activado. Útil para servicios internos donde querés que el portal quede abierto en el background.\n\nDesactivalo para links a docs o a URLs \"externas\" que el user va a querer cerrar sin volver.",
  },
  "card.enabled": {
    title: "Tarjeta activa",
    short: "Si la card se muestra en la portada.",
    body: "Desactivar = la card se guarda en la config pero NO aparece. Útil para:\n- Servicios que están en mantenimiento temporal\n- Tarjetas de \"Documentación\" si querés sacarla del home\n- Cards estacionales (eventos, campañas)\n\n**No es lo mismo que borrar** — la card sigue ahí, sólo no se renderiza.",
  },
  "card.healthCheck": {
    title: "Health check (dot en vivo)",
    short: "Ping periódico a la URL con un dot verde/rojo según respuesta.",
    body: "Activado: el server hace un HEAD request a la URL cada `healthCheckInterval` segundos (default 60s). Si responde 2xx, dot verde. Si falla o timeout, dot rojo.\n\n**Costo**: 1 request por card cada N segundos. Con 10 cards a 60s = 600 req/hora. Nada, pero si tenés 100 cards可以考虑 subir el intervalo.\n\n**Privacidad**: el server es el que hace el request, no el browser. Útil cuando el user no quiere que cada browser pegue contra la URL.\n\nPara hosts internos (10/8, 192.168/16), el toggle `Permitir hosts internos` en Hardening → Red tiene que estar activo.",
  },
  "category.name": {
    title: "Nombre de la categoría",
    short: "El texto que se muestra como header de la sección.",
    body: "Lo que ven los users en la portada como título de la columna/sección. Sé descriptivo pero corto (\"Comunicación\", \"Productividad\", \"Dev\", \"Operaciones\", etc.).\n\nSi tenés sólo una o dos categorías con muchas cards cada una, poné nombres más específicos (\"Infraestructura\", \"Cliente A\", \"Cliente B\").",
  },
  "category.icon": {
    title: "Ícono de la categoría",
    short: "Ícono Lucide que aparece al lado del nombre.",
    body: "Cualquier nombre de Lucide (https://lucide.dev). Ejemplos: `message-circle`, `briefcase`, `code`, `server`, `globe`, etc.\n\nSi el nombre no existe, el sistema usa un placeholder genérico. No rompe nada.",
  },
  "category.order": {
    title: "Ordenar categorías",
    short: "Arrastrá las filas para definir el orden en la portada.",
    body: "Cada fila tiene un handle `⋮⋮` a la izquierda. Mantené apretado y arrastrá para reordenar. El orden que definas acá es el orden en que aparecen las secciones/columnas en la portada (lo ven los users).\n\n**Tips:**\n- El id (kebab-case) NO cambia al reordenar — sólo la posición en la lista.\n- Las cards adentro de cada categoría mantienen su propio orden independiente (lo definís en la pestaña Tarjetas).\n- El cambio se persiste al apretar \"Guardar cambios\" arriba a la derecha.\n- Si una categoría queda vacía (sin cards activas), no aparece en la portada — pero sigue contando en el orden para cuando le agregues cards.",
  },
  "category.lock": {
    title: "Bloqueo con contraseña de categoría",
    short: "Oculta las tarjetas de la categoría hasta que el usuario ingrese la contraseña.",
    body: "Cuando activás el bloqueo con contraseña en una categoría:\n- En la portada (homepage) o en su subpágina se muestra el título de la categoría, pero sus tarjetas/enlaces quedan ocultos.\n- Se muestra una caja solicitando la contraseña para desbloquear el contenido.\n- Al ingresar la contraseña correcta, las tarjetas se revelan inmediatamente y el desbloqueo se conserva durante la sesión del navegador.\n- Las tarjetas protegidas no son accesibles a través del buscador rápido hasta que la categoría se desbloquee.",
  },
  "category.subpage": {
    title: "Subpágina independiente",
    short: "Convierte la categoría en una página dedicada accesible solo por su URL.",
    body: "Al marcar una categoría como **Subpágina independiente**:\n- **NO aparecerá en la portada principal (`/`)**.\n- Los usuarios podrán acceder a ella únicamente ingresando a su URL directa: `/{id_categoria}` (ejemplo: `/prueba`).\n- Si además tiene activado el bloqueo por contraseña, solicitará la clave en su subpágina antes de mostrar los enlaces.\n- Es ideal para secciones privadas, departamentos internos, links secundarios o portales de acceso restringido.",
  },
  "assets.upload": {
    title: "Subir assets",
    short: "Logos, favicons, íconos de tarjeta, fondos.",
    body: "**Tipos permitidos** (configurable en Hardening → Uploads): PNG, JPEG, WebP, SVG, GIF.\n\n**Límites por tipo**:\n- Logo: 1 MB\n- Favicon: 256 KB\n- Ícono de tarjeta: 512 KB\n- Fondo: 5 MB\n\n**Por qué estos límites**: los browsers tienen que descargar las imágenes cada vez que alguien carga el portal. Un logo de 5 MB es innecesario y mata el LCP.\n\nLos SVG se sanitizan con DOMPurify antes de servirse (si `Permitir SVG` está activo). Esto previene XSS via SVG malicioso.",
  },
  "status.check": {
    title: "Status de las tarjetas",
    short: "Ping HEAD a cada URL marcada con health check.",
    body: "El server hace un HEAD request a cada URL de las cards con `healthCheck=true`. Devuelve:\n- **Verde** (2xx-3xx): la URL responde OK\n- **Rojo** (4xx-5xx, fetch failed, timeout): algo no anda\n- **\"URL inválida\"**: la URL de la card no parsea como http(s) o path\n\n**No es un monitor production-grade**: no chequea contenido, no alerta, no loguea histórico. Es un \"está vivo o no\" superficial.\n\nPara hosts internos (10/8, 192.168/16, docker compose local), el toggle `Permitir hosts internos` en Hardening → Red tiene que estar activo.",
  },
  "advanced.export": {
    title: "Exportar configuración",
    short: "Descargar el config.json actual a tu máquina.",
    body: "Útil para:\n- Backup antes de un cambio grande\n- Migrar a otro server (copiá data/ + importá el config)\n- Versionar la config en git (NO recomendado por el apiKey, pero la parte de branding/layout sí)\n- Compartir la config entre portales de la misma org\n\nEl archivo es `data/config.json` exacto, con un timestamp en el nombre.",
  },
  "advanced.import": {
    title: "Importar configuración",
    short: "Subir un config.json y reemplazar el actual.",
    body: "**REEMPLAZA** la config actual. No es un merge.\n\n**Cap de 1 MB** — un config típico pesa 5-50 KB, así que es muy generoso. Si te pasás, rechazamos.\n\n**Cuidado**: el config importado puede tener una apiKey distinta a la que usás actualmente. Si es así, se reemplaza.\n\nDespués de importar, la página se recarga para aplicar.",
  },
  "advanced.healthcheck": {
    title: "Healthcheck del sistema",
    short: "Verifica que el server está vivo y responde.",
    body: "Llama a `GET /api/health` (sin auth, público). Devuelve:\n- `status: 'ok'` — todo bien\n- `version` — versión del package.json\n- `uptime` — segundos desde que arrancó el server\n\nÚtil para un uptime monitor externo (UptimeRobot, Better Uptime, etc.) que quiere saber si tu portal está vivo sin tener que parsear HTML.\n\nSi Umbral está detrás de un reverse proxy, el healthcheck pasa por el proxy. Si ves `status: 'degraded'`, revisá los logs.",
  },
  "advanced.reset": {
    title: "Reset a defaults",
    short: "Restaura la configuración a los valores de fábrica.",
    body: "**Pone TODA la config en defaults**, pero conserva:\n- Tu password (no te desloguea)\n- El CSRF token (las sesiones siguen vivas)\n- Los assets subidos (fotos, logos)\n\n**No conserva**: cards custom, categorías custom, theme custom, apiKey, etc.\n\nTe pide escribir `RESET` para confirmar — no lo hacés por accidente.",
  },
  "advanced.features": {
    title: "Features (opt-in)",
    short: "Cada feature nueva arranca apagada. Prendé las que necesites.",
    body: "Esta grilla lista **todas las features nuevas** de Umbral. Cada una es opt-in: default `enabled: false`, así que si no la activás, ni se ejecuta, ni se carga su dependencia, ni aparece en la UI.\n\n**Cómo funciona**:\n- Switch ON → la feature se habilita al guardar (botón \"Guardar cambios\").\n- Switch OFF → la feature se apaga. Si tenía datos, quedan guardados en config.json pero inertes; al volver a ON reaparecen tal cual.\n- Cada toggle queda logueado en audit.log (ej: `feature_toggle: i18n: false→true`).\n\n**¿Por qué opt-in?** El principio 7 del roadmap: \"si no la usás, no la pagás\". Las features pesadas (qr, oidc, totp2fa) traen dependencias npm que sólo se cargan si las activás.\n\n**¿Qué hay disponible hoy?** i18n, markdown, tags, pinned, presets, audit log viewer. El resto (webhooks, métricas, multi-user, multi-portal, etc.) entra en olas 2/3/4.\n\nMás detalle en `/docs` cuando cada ola se libere.",
  },
  "advanced.metrics": {
    title: "Métricas de latencia",
    short: "Sparklines y resumen (avg, p95, max) por card con health-check.",
    body: "**Métricas** registra la latencia de cada check de health en un ring buffer en memoria (últimas 100 muestras por card, ~1.5h con check cada 60s). El sparkline SVG se renderiza al lado del dot de health check en la portada (sólo si la feature está activa). El dashboard muestra una tabla con avg / p95 / max / último por card.\n\n**Cómo interpretar**:\n- **Avg**: latencia promedio. Si sube de repente, algo se puso lento.\n- **P95**: percentil 95. Mejor métrica para \"experiencia del usuario\" — refleja el peor caso realista.\n- **Max**: pico. Si es muy alto vs avg, hay outliers (cold start, network blip).\n- **Último**: estado del último check (ok/fail + tiempo relativo).\n\n**Cuándo mirar**:\n- Después de un deploy: ¿la latencia subió?\n- Cuando un servicio se siente lento: ¿p95 está bien o se va al carajo?\n- Antes de reportar \"el sistema está lento\": ¿los datos lo confirman o es percepción?\n\n**Limitaciones**:\n- Ring buffer en memoria: si Umbral se reinicia, se pierde. Trade-off aceptado para evitar I/O en cada check.\n- Sparkline inline (SVG, sin librería). Es una polilínea simple — si necesitás gráficos avanzados (bar charts, heatmaps), usá la data de `/api/metrics?id=...` en un dashboard externo (Grafana con JSON datasource, etc.).\n- Sin persistencia a disco en esta versión. La opción `persistToDisk` del schema queda como no-op preparada para futuro.\n\n**Si la feature está apagada**: la sección no aparece en el admin, los sparklines no se renderizan en la portada, y `/api/metrics` devuelve 404. Defense-in-depth: aunque alguien mande samples por la API, no se registran.",
  },
  "advanced.maintenance": {
    title: "Ventanas de mantenimiento",
    short: "Programa ventanas donde las cards están en mantenimiento. Suprime webhooks de health_fail durante la ventana.",
    body: "Las **ventanas de mantenimiento** son periodos donde esperás que una (o todas) las cards fallen — típicamente durante deploys, migraciones de DB, mantenimiento de infra. Durante la ventana, las cards afectadas:\n\n- Muestran un **badge ámbar \"🔧 Mantenimiento\"** en la portada con la razón que pusiste.\n- **NO disparan webhooks** de `health_fail` (reducir spam durante el deploy). El health check sigue corriendo (los dots se ponen rojos en la portada), pero el admin ya sabe que está fallando — para qué notificar.\n- Siguen disparando `health_recover` cuando vuelven a OK. Útil para confirmar que el deploy terminó bien.\n\n**Cuándo usar**:\n- Deploy de una versión nueva: ventana de 30min sobre todos los servicios.\n- Mantenimiento de un servicio específico: ventana de 2h sobre 1-2 cards.\n- Migración de DB: ventana sobre las cards que dependen de esa DB.\n\n**Cuándo NO usar**:\n- Para deshabilitar una card permanentemente, mejor `enabled: false` en la card misma.\n- Si querés pausar webhooks sin mostrar badge: bajá el `cooldownMin` o deshabilitá el webhook temporalmente con `enabled: false`.\n\n**Auto-cleanup**: las ventanas con `endsAt` más de 24h en el pasado se marcan como \"históricas\" en el admin pero NO se borran automáticamente. La idea es que el admin las vea y decida si las quiere borrar manualmente (botón ×). No queremos borrar info que pueda ser útil para debugging post-mortem.\n\n**Timezone**: las timestamps se almacenan en UTC. El UI del admin las muestra en hora local del browser. Si tu equipo está distribuido, todos ven la misma hora UTC en el config.json, pero la UI adapta a la zona del browser.\n\n**Si la feature está apagada**: la sección no aparece en el admin, y el render ignora las windows (badge no se muestra + webhooks no las respetan). Defense-in-depth: aunque alguien mande windows en el JSON, el server dropea el array al guardar si la feature no está activa.",
  },
  "advanced.webhooks": {
    title: "Webhooks de notificación",
    short: "Notifica a Slack/Discord/ntfy/etc cuando una card con health-check cambia de estado.",
    body: "Los webhooks convierten a Umbral en un **centro de notificaciones activas**: cuando una card con `healthCheck: true` cambia de healthy a failing (o viceversa), Umbral hace POST a las URLs que configures.\n\n**Eventos**:\n- `health_fail`: se dispara cuando la card pasa de healthy a failing (después de N checks consecutivos fallidos, configurable por webhook).\n- `health_recover`: se dispara cuando la card vuelve a healthy. Útil para confirmar que el problema se resolvió.\n\n**Threshold (minFailures)**: cuántos checks consecutivos deben fallar antes de disparar `health_fail`. Default 3. Si tus checks son cada 60s, son 3 minutos de falla sostenida antes de notificar. Útil para absorber blips transitorios.\n\n**Cooldown**: minutos entre notificaciones del mismo webhook. Default 30. Evita el spam si un servicio tiene altibajos.\n\n**Cómo se arman los payloads**: Umbral manda **siempre JSON crudo** con este shape (los services tipo Slack/Discord pueden recibirlo via un proxy o webhook adapter, o el admin puede usar un endpoint custom que parsee):\n```json\n{\n  \"event\": \"health_fail\",\n  \"card\": { \"id\": \"...\", \"title\": \"...\", \"url\": \"...\" },\n  \"status\": { \"ok\": false, \"code\": 503, \"latencyMs\": 1234 },\n  \"consecutiveFailures\": 3,\n  \"threshold\": 3,\n  \"timestamp\": \"2026-08-19T...\",\n  \"portal\": { \"name\": \"Mi Empresa\" }\n}\n```\nHeaders: `X-Umbral-Event`, `X-Umbral-Card`, `User-Agent: Umbral-Webhook/1.0`.\n\n**Seguridad**:\n- SSRF guard activo: bloquea loopback (127.0.0.1), private IPs (10/8, 172.16/12, 192.168/16) y cloud metadata. Para apuntar a un servicio interno (Gotify en LAN), activá `security.network.allowInternalHosts` en Hardening.\n- Timeout 8s por webhook (no queremos que un endpoint lento trabe el health check).\n- `redirect: 'manual'`: no seguimos redirects — cierra el bypass clásico de SSRF por redirección.\n- El header `X-Umbral-Event` permite al receiver rutear sin parsear el body.\n\n**Estado en memoria**: los contadores de \"falla consecutiva\" y \"último fire\" son en memoria (no persisten a disco). Si Umbral se reinicia, los contadores arrancan de 0. Para un deploy de larga vida, esto significa que después de un restart, hay que esperar `minFailures` checks antes de que el primer `health_fail` dispare. Trade-off aceptable para evitar escribir/serializar el estado en cada check.\n\n**Testing**: el botón \"Probar\" al lado de cada webhook (o \"Probar antes de guardar\" en el form de alta) manda un payload de ejemplo a la URL. Útil para verificar que el endpoint responde bien antes de esperar una falla real.",
  },
  "advanced.audit": {
    title: "Visor de audit log",
    short: "Lee data/audit.log desde el navegador con filtros.",
    body: "**Lee las últimas N entradas** del archivo `data/audit.log` y las muestra en una tabla con scroll virtual. Cada fila es un evento (timestamp + acción + detalle).\n\n**Filtros disponibles**:\n- **Acción**: dropdown con las acciones distintas que existen en el log (ej: `config_update`, `login_ok`, `asset_delete`).\n- **Detalle contiene**: substring case-insensitive sobre el campo `detail` (útil para buscar \"features\", \"i18n\", etc.).\n- **Desde / Hasta**: datetime-local en zona UTC. \"Hasta\" incluye el minuto seleccionado.\n- **Límite**: 50 / 200 / 500 / 1000 entradas.\n\n**Acciones**:\n- **Limpiar**: resetea filtros.\n- **Descargar log completo**: baja las últimas 1000 entradas como archivo `.log` para análisis offline.\n\n**Cuándo mirar el audit log**:\n- \"¿Quién desactivó la categoría X?\" → filter por action=`config_update` y detail contiene \"X\".\n- \"¿A qué hora arrancamos a recibir errores de auth?\" → filter por action=`login_ok` (o buscar nuevas actions que aparezcan después).\n- \"¿Qué cambios se hicieron en la última hora?\" → setear \"Desde\" a `Date.now() - 1h`.\n\n**Retención**: el log rota automáticamente a 10MB (mantiene 3 backups). Para retención de meses, exportá periódicamente o configurá un sidecar que copie el archivo.\n\nSi la feature está apagada, esta sección no aparece y el endpoint `/api/audit` devuelve 404.",
  },
  "advanced.multiPortal": {
    title: "Multi-Portal",
    short: "Permite servir múltiples portales/dashboards desde una misma instancia según dominio o prefijo de ruta.",
    body: "**Multi-Portal** te permite aislar configuraciones, tarjetas, categorías, assets y logs para diferentes equipos o entornos (ej: \"IT\", \"Marketing\", \"Dev\", \"Clientes\") en una única instalación de Umbral.\n\n**Cómo funciona el enrutamiento**:\n1. **Por Host (Dominio / Subdominio)**: Podés asociar un portal a un host específico (ej: `dev.portal.local` o `marketing.empresa.com`). Admite comodines (wildcards) como `*.empresa.com`.\n2. **Por Path Prefix (Prefijo de ruta)**: Podés rutear por prefijo (ej: `/dev`, `/marketing`).\n3. **Portal Default (Fallback)**: Cualquier petición que no coincida con los portales registrados es atendida por el portal default (`default`).\n\n**Estructura de datos en disco**:\nAl activar la feature, los datos se auto-migran transparentemente:\n- `data/portals/default/config.json`: Configuración del portal por defecto.\n- `data/portals/<portal-id>/config.json`: Configuración independiente de cada portal.\n- `data/portals/<portal-id>/uploads/`: Assets y logos propios de ese portal.\n- `data/portals/<portal-id>/audit.log`: Log de auditoría aislado por portal.\n\n**Gestión de portales**:\nPodés agregar nuevos portales definiendo un ID kebab-case único, un nombre representativo, y opcionalmente su host o pathPrefix.",
  },
  "security.multiUser": {
    title: "Usuarios (multi-user)",
    short: "Crea usuarios con roles (admin/editor/viewer) y login con username.",
    body: "**Multi-user** te permite crear varios admins/editores/viewers en lugar de compartir un único password. Cada user tiene su propio username, password (hasheado con bcrypt cost 12) y rol. El **password único** (super-admin) sigue siendo válido como rescue path por default — el admin puede deshabilitarlo en \"Modo de acceso\".\n\n**Modos de acceso** (3 estados):\n- `password-only` (default): sólo el password único. Si tenías un deploy legacy y no querés complicar, esto es lo que pasa antes de tocar nada.\n- `both`: password único + login con username. El password único sigue siendo válido para \"emergencias\" (ej: perder acceso a un user y necesitas entrar a crear uno nuevo).\n- `users-only`: sólo los users de la lista. El password único deja de funcionar. **Cuidado**: si quedás sin users válidos y single password off, NO podés entrar. El server rechaza este save si users está vacío. Confirmación dura: el form de \"Solo usuarios\" chequea que haya al menos un user antes de aplicar.\n\n**Roles**:\n- `admin`: full access (incluye gestión de users y config).\n- `editor`: puede editar cards/categorías/tema/branding, no tocar seguridad ni users.\n- `viewer`: solo lectura. Útil para auditoría, soporte, integraciones.\n\n**Sesiones per-user**: cada user tiene un `userEpoch` independiente. Cambiarle la password a Alice (o resetearla desde acá) incrementa su epoch, lo que invalida todas las sesiones de Alice sin tocar a Bob. Esto cierra el gap de \"comprometieron a Alice, le cambio la pass, pero sus sesiones viejas siguen vivas\" que tenía el sistema de password único.\n\n**Login con TOTP** (features.totp2fa, Ola 3.2): si está activa, cada user puede activar su propio 2FA. El password único super-admin **NO** puede protegerse con TOTP — intencional. Si perdés acceso a los TOTP seeds, el password único es el rescue path. Por eso sigue siendo válido por default.\n\n**Si la feature está apagada**: la sección no aparece en el tab Password, el server dropea `users[]` al guardar (defense in depth), y el login con username devuelve 401.",
  },
  "security.accessMode": {
    title: "Modo de acceso",
    short: "Tres modos para el login: solo password, password+usuarios, o solo usuarios.",
    body: "Define cómo se puede entrar al portal:\n\n**`password-only`** (default histórico): sólo el password único. Es lo que tenías antes de Ola 3.1. Simple, un solo secret que rotar si se filtra.\n\n**`both`**: password único + login con username. Tenés los dos mundos. El password único sirve como rescue path si perder acceso a un user (sesión expirada, MFA roto, etc). Trade-off: hay dos superficies de ataque.\n\n**`users-only`**: sólo los users. El password único deja de existir. **No recomendado** salvo que tengas compliance estricto o querés un único punto de entrada. Riesgo: si quedás sin users válidos (ej: borraste el último admin), no podés entrar — el server rechaza este save si users[] está vacío, pero si lo habilitás y después borrás el último user, quedás afuera y necesitás editar el JSON manualmente.\n\n**Decisión recomendada**: `both` (default si la feature multi-user está activa). Te da audit log per-user + la red de seguridad del password único.\n\n**Caveat legal**: si necesitás compliance PCI-DSS o similar que exija \"single point of authentication\", `users-only` te acerca a eso. Pero usualmente el password único sigue siendo aceptable como service account de emergencia documentado.",
  },
  "security.password": {
    title: "Cambiar contraseña",
    short: "Rota la password del admin. Invalida todas las otras sesiones.",
    body: "Tres campos: actual, nueva, confirmar. Si no coinciden, rechazamos.\n\nAl guardar:\n- Tu nueva password se hashea con bcrypt (cost 12)\n- Se rota el CSRF token\n- Se incrementa el `authEpoch` → **todas las sesiones existentes mueren al próximo request** (excepto la tuya, que sigue activa)\n\n**Por qué importa invalidar otras sesiones**: si alguien te robó la sesión y vos cambiás la password sin invalidar, el atacante sigue adentro hasta que la cookie expire. Con epoch, la cookie queda muerta inmediatamente.",
  },
  "security.csrf": {
    title: "CSRF token",
    short: "Token de un solo uso que valida requests de mutación.",
    body: "Se rota automáticamente al cambiar la password. Todas las requests POST/PUT/DELETE/PATCH deben mandar este token en el header `x-csrf-token`.\n\nSi activás `Rotar CSRF en cada login` (Hardening), también rota cada vez que alguien inicia sesión.\n\n**No lo copies a otros browsers/dispositivos** — está atado a tu sesión. Si lo perdés, hacé logout/login.",
  },
  "externalSearch.intro": {
    title: "Búsqueda externa para auto-completar",
    short: "Fallback cuando el scrape del sitio falla. Default: Wikipedia + DuckDuckGo (sin key).",
    body: "El botón \"Auto-completar\" del form de tarjeta intenta primero **scrapear el sitio** (GET a la URL + parseo de meta tags). Cuando eso falla — porque el servicio es interno y no tiene HTML público, porque la URL es una IP:puerto sin DNS, porque el sitio devuelve un login vacío, etc. — hace **fallback a búsqueda externa** por el nombre del servicio.\n\n**Orden de búsqueda**:\n1. **Brave Search** (si tenés key cargada) — mejor calidad, 2000 req/mes gratis\n2. **Tavily** (si tenés key) — optimizado para AI, 1000 req/mes\n3. **Wikipedia REST** — sin key, cubre la mayoría de productos conocidos\n4. **DuckDuckGo Instant Answer** — sin key, resultados inconsistentes\n\nSi ninguna encuentra algo, el toast te avisa y queda el form como está.",
  },
  "externalSearch.brave": {
    title: "Brave Search API key",
    short: "Tier gratis: 2000 req/mes. Mejor calidad que Wikipedia/DDG.",
    body: "**Setup**:\n1. Andá a https://brave.com/search/api/\n2. Creá una cuenta, generá una API key (empieza con `BSA...`)\n3. Pegala acá\n\n**Tier gratis**:\n- 2000 requests / mes\n- 1 req/segundo de rate limit (suficiente para el auto-completar humano)\n- Resultados de calidad Google, con snippet y a veces imagen del profile\n\n**Privacidad**: la query que mandás a Brave es el nombre del servicio. No incluye la URL.",
  },
  "externalSearch.tavily": {
    title: "Tavily API key",
    short: "Tier gratis: 1000 req/mes. Optimizado para AI agents.",
    body: "**Setup**:\n1. Andá a https://tavily.com\n2. Sign up, generá API key (empieza con `tvly-...`)\n3. Pegala acá\n\n**Tier gratis**:\n- 1000 requests / mes\n- Rate limit generoso\n- Devuelve resultados limpios, optimizados para que un LLM los consuma\n\n**Cuándo preferir Tavily sobre Brave**: si vas a usar también el provider IA para mejorar tarjetas, Tavily devuelve contenido más \"AI-friendly\" (menos HTML, más texto limpio). Brave es mejor si querés resultados más web-estilo.\n\n**Privacidad**: la query es el nombre del servicio.",
  },
  "theme.bgEditMode": {
    title: "Fondo por modo claro/oscuro",
    short: "Editá el fondo del portal en modo oscuro y claro por separado.",
    body: "Cada modo tiene su propio fondo (gradiente, color o imagen). Usá **Copiar del otro modo** para partir de la paleta existente y ajustar.\n\nEl toggle claro/oscuro del portal usa el fondo correspondiente al modo activo.",
  },
  "theme.advancedCss": {
    title: "CSS avanzado del fondo",
    short: "Editá el valor del fondo como texto CSS libre.",
    body: "Desactiva el constructor visual y permite pegar cualquier valor CSS válido: `linear-gradient(...)`, `radial-gradient(...)`, color hex, etc.\n\nÚtil para fondos complejos que el builder no cubre.",
  },
  "theme.gradientBuilder": {
    title: "Constructor de gradiente",
    short: "Armá gradientes con ángulo y stops de color.",
    body: "Ajustá el **ángulo** (0–360°) y cada **stop** (color + posición %). La vista previa se actualiza al instante.\n\nPodés eliminar stops extra si hay más de dos.",
  },
  "theme.iconTint": {
    title: "Tinte de iconos SVG",
    short: "Cómo se colorean los iconos de las tarjetas.",
    body: "**Original (default)**: respeta los colores del SVG (logos de marca).\n\n**Accent / Texto / Propio**: aplica un color uniforme vía máscara CSS.\n\nUsá Original para GitHub, Docker, etc.; Accent o Texto para iconos monocromáticos de packs UI.",
  },
  "theme.iconColor": {
    title: "Color de icono personalizado",
    short: "Color usado cuando el tinte es \"Propio\".",
    body: "Sólo aplica si **Tinte de iconos** está en **Proprio**. Se define por modo claro/oscuro en la rampa avanzada.",
  },
  "theme.autoStrategy": {
    title: "Estrategia modo automático",
    short: "Cómo el portal elige claro u oscuro cuando el modo es Auto.",
    body: "**Sistema**: sigue la preferencia del SO/navegador (`prefers-color-scheme`).\n\n**Horario**: claro de 7:00 a 19:00, oscuro el resto (hora del servidor).",
  },
  "theme.textRamp": {
    title: "Rampa de texto",
    short: "Colores de texto principal, muted, subtle y faint por modo.",
    body: "La rampa define la jerarquía tipográfica. El badge **AA ✓** indica contraste WCAG ≥ 4.5:1 contra la superficie.\n\nSi baja contraste, ajustá `--text` o la superficie en tokens avanzados.",
  },
  "theme.derivedPalette": {
    title: "Paleta derivada",
    short: "Vista de los colores calculados a partir del accent y tokens.",
    body: "Muestra cómo el motor de tema combina accent, superficies y bordes. Solo lectura; editá en **Colores** o **Avanzado**.",
  },
  "theme.fontWeight": {
    title: "Peso de la tipografía",
    short: "Grosor de la fuente del portal (400–700).",
    body: "Afecta títulos, tarjetas y widgets. 400 = regular, 600–700 = más marcado en dashboards corporativos.",
  },
  "theme.useGoogleFonts": {
    title: "Google Fonts",
    short: "Cargar la fuente desde fonts.googleapis.com.",
    body: "Si está activo, el navegador pide la fuente a Google (implicancia de privacidad: Google ve las IPs de tus visitantes).\n\nDesactivá y usá `fontUrl` propio o fuentes del sistema para evitar requests externos.",
  },
  "theme.cardBlur": {
    title: "Blur de tarjetas glass",
    short: "Intensidad del desenfoque en estilo glass.",
    body: "Solo aplica a `cardStyle: glass`. Valores altos = más frosted glass; 0 = sin blur.",
  },
  "theme.cardBorderWidth": {
    title: "Ancho de borde (outlined)",
    short: "Grosor del borde en tarjetas outlined.",
    body: "Solo aplica a `cardStyle: outlined`. Expresado en píxeles.",
  },
  "theme.showModeToggle": {
    title: "Toggle claro/oscuro",
    short: "Muestra el botón para cambiar modo en el header.",
    body: "Los visitantes pueden alternar entre claro y oscuro. La preferencia se guarda en `localStorage`.",
  },
  "theme.clockPosition": {
    title: "Posición del reloj",
    short: "Header izquierda o derecha.",
    body: "El reloj respeta el formato 12h/24h configurado abajo.",
  },
  "theme.clockFormat": {
    title: "Formato del reloj",
    short: "12h con AM/PM o 24h.",
    body: "Afecta el widget de reloj en el header del portal y la vista previa del admin.",
  },
  "theme.headerOpacity": {
    title: "Opacidad del header",
    short: "Transparencia de la barra superior (0–1).",
    body: "0 = invisible, 1 = opaco. Útil sobre fondos con mucho detalle visual.",
  },
  "theme.footerOpacity": {
    title: "Opacidad del footer / status bar",
    short: "Transparencia de la barra inferior (0–1).",
    body: "Aplica al status bar cuando está visible.",
  },
  "theme.presets": {
    title: "Presets de tema",
    short: "Paletas completas con variantes claro y oscuro.",
    body: "Cada preset define fondo, texto, superficies, bordes, accent e iconos para **ambos** modos.\n\nLos botones Oscuro/Claro solo eligen el **modo inicial**; el toggle del portal sigue funcionando.",
  },
  "theme.savePreset": {
    title: "Guardar preset custom",
    short: "Guarda la configuración actual como preset reutilizable.",
    body: "Máximo 5 presets custom. No incluye tokens avanzados ni lista de presets anidada.",
  },
  "theme.resetDefaults": {
    title: "Restaurar defaults",
    short: "Vuelve el tema a los valores de fábrica de Umbral.",
    body: "No borra presets custom guardados. Requiere guardar cambios para persistir.",
  },
  "theme.advanced.intro": {
    title: "Tokens avanzados (Pro)",
    short: "Editor de variables CSS del tema por modo.",
    body: "Permite sobreescribir cualquier token (`--surface`, `--border`, sombras, etc.) por modo claro/oscuro.\n\nUsá **Derivar** para generar tokens a partir del accent.",
  },
  "theme.advanced.derive": {
    title: "Derivar tokens",
    short: "Genera tokens de superficie/borde desde el color de acento.",
    body: "Recalcula valores coherentes sin editar cada campo a mano. No sobrescribe tokens que ya personalizaste manualmente si elegís merge parcial.",
  },
  "theme.advanced.shadowIntensity": {
    title: "Intensidad de sombras",
    short: "Multiplicador global de sombras de texto e iconos.",
    body: "Afecta `--shadow-text` y `--shadow-icon`. Útil en temas muy planos o muy dramáticos.",
  },
  "theme.advanced.tokens": {
    title: "Lista de tokens",
    short: "Cada fila es una variable CSS del tema.",
    body: "Los tokens vacíos usan el default del preset/motor. Base **shared** aplica a ambos modos; **dark/light** solo a ese modo.",
  },
  "theme.advanced.exportImport": {
    title: "Exportar / importar tema",
    short: "JSON portable del tema completo.",
    body: "Exportá para backup o copiar entre portales. Import reemplaza `cfg.theme` (validado por schema).",
  },
  "theme.preview.mode": {
    title: "Modo de la vista previa",
    short: "Dark / Light / Auto en el panel (no afecta visitantes).",
    body: "**Auto** sigue la misma lógica que el portal (`colorMode` + estrategia). La preview embebida no lee la preferencia guardada del visitante.",
  },
  "theme.preview.openTab": {
    title: "Preview en pestaña",
    short: "Abre el portal con borrador de tema en otra pestaña.",
    body: "Usa `localStorage` (`umbral-theme-preview`). Guardá cambios en el admin para que la pestaña pública los refleje al recargar.",
  },
  "card.autofill": {
    title: "Auto-completar tarjeta",
    short: "Rellena título, descripción e icono desde la URL.",
    body: "Intenta scrapear meta tags de la URL. Si falla, busca en Wikipedia/Brave/Tavily según configuración de búsqueda externa.",
  },
  "card.aiEnhance": {
    title: "Mejorar con IA",
    short: "Reescribe título/descripción con el provider configurado.",
    body: "Requiere tab IA activo y API key válida. No cambia la URL ni el icono.",
  },
  "card.descriptionFormat": {
    title: "Formato Markdown",
    short: "Descripción en Markdown sanitizado vs texto plano.",
    body: "Markdown permite **negrita**, listas y links. Requiere feature `markdown` activa. El HTML se sanitiza en el servidor.",
  },
  "card.iconPicker": {
    title: "Selector de iconos",
    short: "Elegí iconos de packs instalados o assets subidos.",
    body: "Pestaña **Íconos**: packs Git (Lucide, Simple Icons, etc.). **Assets**: PNG/SVG subidos.\n\nSin packs instalados, instalá uno desde **Íconos Git**.",
  },
  "assets.dropzone": {
    title: "Subir assets",
    short: "Arrastrá archivos o usá el selector.",
    body: "Límites de tamaño y MIME types se configuran en **Hardening → Uploads**. SVG puede requerir sanitización activa.",
  },
  "assets.copyUrl": {
    title: "Copiar URL del asset",
    short: "Copia la ruta pública al portapapeles.",
    body: "Usá `/api/assets/nombre.ext` como icono custom en tarjetas o como imagen de fondo.",
  },
  "assets.delete": {
    title: "Eliminar asset",
    short: "Borra el archivo del almacenamiento del portal.",
    body: "Las tarjetas que referencien ese asset quedarán sin imagen hasta que actualices el icono.",
  },
  "audit.filters": {
    title: "Filtros de auditoría",
    short: "Acción, texto en detalle y rango de fechas.",
    body: "Los eventos vienen de `data/audit.log`. Filtrá por tipo (`config.save`, `login`, etc.) o texto libre en el JSON de detalle.",
  },
  "audit.limit": {
    title: "Límite de entradas",
    short: "Cantidad máxima de líneas devueltas.",
    body: "Orden cronológico inverso (más recientes primero). Subí el límite para exportaciones manuales.",
  },
  "audit.download": {
    title: "Descargar log completo",
    short: "Baja todo `audit.log` sin filtros.",
    body: "Útil para archivo o análisis externo. El archivo puede crecer; rotación manual si hace falta.",
  },
  "iconPacks.intro": {
    title: "Íconos Git",
    short: "Instalá packs SVG desde repositorios públicos.",
    body: "Simple Icons (marcas), Lucide (UI), Tabler, etc. Los iconos quedan en `data/icon-packs/` y se sirven por `/api/icons/`.",
  },
  "iconPacks.install": {
    title: "Instalar pack",
    short: "Clona el repo y copia los SVG al portal.",
    body: "Puede tardar según tamaño del repo. Requiere red saliente desde el servidor.",
  },
  "iconPacks.uninstall": {
    title: "Desinstalar pack",
    short: "Elimina los SVG del pack del disco.",
    body: "Las tarjetas con iconos `pack/nombre` dejarán de mostrar imagen hasta que cambies el icono.",
  },
  "iconPacks.refresh": {
    title: "Actualizar catálogo",
    short: "Relee packs instalados y actualiza el picker.",
    body: "Usá después de instalar/desinstalar sin recargar la página.",
  },
  "iconPacks.customRepo": {
    title: "Repo Git personalizado",
    short: "URL de un repositorio con SVGs.",
    body: "Debe ser accesible por HTTPS. Umbral clona en temp y copia según subpath/prefijo.",
  },
  "iconPacks.branch": {
    title: "Rama del repo",
    short: "Branch a clonar (ej. main, develop).",
    body: "Default suele ser `main`. Verificá en el repo cuál es la rama activa.",
  },
  "iconPacks.subpath": {
    title: "Subpath en el repo",
    short: "Carpeta dentro del repo donde están los SVG.",
    body: "Ej: `icons` en Lucide, `svg` en dashboard-icons. Solo se copian `.svg` de esa carpeta (recursivo según implementación).",
  },
  "iconPacks.prefix": {
    title: "Prefijo del pack",
    short: "ID usado en `prefijo/nombre-icono`.",
    body: "Ej: `mi-pack` → iconos como `mi-pack/home.svg`. Debe ser único entre packs instalados.",
  },
  "advanced.oidc": {
    title: "OIDC / SSO",
    short: "Single Sign-On con proveedores OpenID Connect.",
    body: "Configurá client ID/secret, issuer y scopes para Google, Keycloak, Authentik, etc.\n\nRequiere feature `oidc` activa y URLs de callback correctas en el IdP.",
  },
  "advanced.apiTokens": {
    title: "Tokens API",
    short: "Tokens de larga duración para automatización.",
    body: "Permiten llamar endpoints admin sin cookie de sesión. Rotá tokens comprometidos y usá scopes mínimos.\n\nRequiere feature `apiTokens` activa.",
  },
} as const;
export type HelpCatalog = typeof helpEs;
import type { HelpCatalog } from './es.ts';

export const helpEn = {
  "session.ttlHours": {
    title: "Session duration (hours)",
    short: "How long the session cookie lives before login is required again.",
    body: "The session cookie is renewed on every request. After this period of inactivity, the admin must enter the password again.\n\n**Default 24h** is the sweet spot between security and usability. If your Umbral instance is exposed to the internet, lower it to 1–4h. If it's only for you on a LAN, you can raise it to 168h (1 week) without issue.",
  },
  "session.cookieSameSite": {
    title: "Cookie SameSite",
    short: "How the cookie behaves with cross-site links.",
    body: "**Lax (default)**: the cookie is sent with top-level navigations (clicking a link) but NOT with cross-site iframes/img/POST. Good balance.\n\n**Strict**: the cookie is NEVER sent in a cross-site context. More secure but breaks links from other apps (e.g. Mattermost sends you to the portal and the session is not recognized).\n\n**None**: the cookie is sent in all contexts. REQUIRES the Secure flag. Only if you know what you're doing.",
  },
  "session.cookieSecure": {
    title: "Cookie Secure flag",
    short: "Whether the cookie only travels over HTTPS.",
    body: "**Auto (recommended)**: the cookie gets the Secure flag only if the request is HTTPS. If HTTPS is detected, you harden; otherwise it still works over HTTP so dev doesn't get stuck.\n\n**Always**: always sets Secure. Use this if TLS terminates at a proxy and the client ALWAYS arrives over HTTPS.\n\n**Never**: never sets Secure. The cookie travels over HTTP in plain text. NOT recommended except on a fully isolated LAN.",
  },
  "session.rotateCsrfOnLogin": {
    title: "Rotate CSRF on each login",
    short: "Whether the CSRF token changes every time someone logs in.",
    body: "Enabled: each login generates a new CSRF token. If someone had a tab open with an old CSRF token, that tab is invalidated.\n\n**Why it matters**: if an attacker steals your CSRF token (XSS, shared log) and you change the password without rotating CSRF, the attacker can still make mutating requests until the session expires.\n\n**Default false** because rotating CSRF on every login forces the admin to refresh the browser after login. It's a minor security improvement vs the friction it adds.",
  },
  "auth.minPasswordLength": {
    title: "Minimum password length",
    short: "Minimum characters when changing the password.",
    body: "0 (default) = no minimum. Accepts short passwords for compatibility with old configs.\n\nRaise it to 8–12 for production. More than 16 doesn't add much (vs a long passphrase).",
  },
  "auth.rateLimitMax": {
    title: "Rate limit (attempts)",
    short: "Maximum number of login attempts within the time window.",
    body: "If someone hits the limit, the /api/login endpoint returns 429 until the window passes.\n\n**Default 30 / 60s** = enough for you to mistype several times, but brute force is stopped quickly. If you expose Umbral to the internet, lower it to 5–10.",
  },
  "auth.rateLimitWindowSec": {
    title: "Rate limit (window in seconds)",
    short: "How many seconds until the attempt counter resets.",
    body: "Works together with rateLimitMax. Default 60s. If you lower Max to 5, also lower Window to 60s — otherwise you block real users.\n\nIf you want to be very strict: 3 attempts / 5min. If you lock yourself out, wait 5min or restart the container (not persisted to disk).",
  },
  "auth.csrfPolicy": {
    title: "CSRF policy",
    short: "When the CSRF token is required.",
    body: "**Mutations (default)**: POST/PUT/DELETE/PATCH require CSRF. GET does not. Correct for 99% of cases.\n\n**All**: GET also requires CSRF. Maximum paranoia. Rarely needed.\n\n**None**: CSRF is not checked. **NOT recommended** unless you're on a fully isolated LAN and know what you're doing. An attacker who gets you to click a link could change your config.",
  },
  "uploads.maxBytesLogo": {
    title: "Max logo size",
    short: "Maximum bytes for the logo (homepage header).",
    body: "Default 1 MB. This is for the header logo — you don't need more. If you upload an SVG it weighs a few KB and still gets reprocessed with sharp (sharp rasterizes it).",
  },
  "uploads.maxBytesFavicon": {
    title: "Max favicon size",
    short: "Maximum bytes for the favicon (.ico/.png).",
    body: "Default 256 KB. A 32×32 favicon weighs <5KB; this limit is generous for animated or multi-resolution ICOs.",
  },
  "uploads.maxBytesIcon": {
    title: "Max card icon size",
    short: "Maximum bytes for each card's image.",
    body: "Default 512 KB. Card images are re-encoded to WebP/AVIF at reasonable sizes. If you want lightweight SVG icons, keep this value.",
  },
  "uploads.maxBytesBackground": {
    title: "Max background size",
    short: "Maximum bytes for the background image.",
    body: "Default 5 MB. It's the only large image in the system. We optimize it with sharp when serving, but the server still has to load it into memory.",
  },
  "uploads.allowedMimeTypes": {
    title: "Allowed MIME types",
    short: "List of file types that can be uploaded.",
    body: "Comma-separated whitelist. Default: png, jpeg, webp, svg, gif.\n\n**Important**: only `image/*` types are allowed. Don't add `text/html`, `application/javascript`, etc. — Umbral is not a file host; adding an executable MIME type is an XSS vector if someone finds a way to serve it.\n\nIf you want to be strict, remove `image/svg+xml` (SVGs can contain JS). The `Allow SVG` toggle below is the easy way to do this.",
  },
  "uploads.allowSvg": {
    title: "Allow SVG uploads",
    short: "Whether SVG files can be uploaded.",
    body: "SVGs are vectors, lightweight, ideal for logos/icons. BUT they can contain embedded JavaScript that runs in the browser.\n\n**If you enable this**, Umbral sanitizes the SVG with DOMPurify before serving it (if sanitizeSvg is active). Sanitization removes scripts, events, and dangerous elements.",
  },
  "uploads.sanitizeSvg": {
    title: "Sanitize SVG with DOMPurify",
    short: "Runs uploaded SVGs through DOMPurify before serving.",
    body: "DOMPurify parses the SVG as HTML and removes:\n- Tags `<script>`, `<foreignObject>`\n- Attributes `on*`, `href=\"javascript:...\"`, `xlink:href=\"javascript:...\"`\n- `<iframe>`, `<embed>`, `<object>`\n\nEnabled by default. If you disable it and allow SVG, any malicious SVG is served as-is. NOT recommended.",
  },
  "uploads.processImages": {
    title: "Process images with sharp",
    short: "Re-encodes uploaded images to WebP/AVIF when serving.",
    body: "Enabled: when a user requests the image, sharp re-encodes it on-the-fly to the most efficient format for the browser. 50–80% less bandwidth.\n\nDisabled: we serve the original image. Useful if you have CPU or memory issues with sharp (rare on modern hardware).",
  },
  "network.trustForwardedFor": {
    title: "Trust X-Forwarded-For",
    short: "Whether to use the X-Forwarded-For header for IP-based rate limiting.",
    body: "**ONLY enable this if you have a reverse proxy (nginx, Caddy, Traefik) in front that sanitizes and OVERWRITES X-Forwarded-For**.\n\nIf you enable it without a proxy, any client can send `X-Forwarded-For: 1.2.3.4` and bypass rate limiting.\n\n**Detecting \"I have a proxy\"**: Umbral looks at the request header directly. If you see your local network IP in the logs, you don't have a proxy / it's misconfigured.",
  },
  "network.trustedProxies": {
    title: "Trusted proxies",
    short: "IPs/CIDRs of your reverse proxies (informational).",
    body: "Currently informational, not functional. Serves as documentation for you or your team on when trust was configured.\n\nFormat: one IP or CIDR per line. E.g. `10.0.0.1` or `192.168.1.0/24`.",
  },
  "network.cookieDomain": {
    title: "Cookie domain",
    short: "Which domain the session cookie is issued to.",
    body: "Empty (default) = the cookie is issued to the request hostname. Works in 99% of cases.\n\nWith dot prefix (`.example.com`): the cookie is valid for `example.com` AND all its subdomains. Useful if you want to share a session between `portal.example.com` and `docs.example.com`.",
  },
  "network.allowInternalHosts": {
    title: "Allow internal hosts in health check",
    short: "Whether the health check can hit private IPs (10/8, 192.168/16, etc.).",
    body: "The health check sends HEAD requests to card URLs to show a green/red dot. If your cards point to internal services (1Panel at `http://10.155.49.240:39611/`, Excalidraw in another container, etc.) this toggle MUST be enabled.\n\n**Default true** because Umbral is an internal portal — the primary use case is monitoring your own services.\n\n**When to disable**: if you expose Umbral to the internet. The SSRF guard blocks `169.254.169.254` (cloud metadata) ALWAYS, regardless of this toggle.",
  },
  "headers.csp": {
    title: "Content-Security-Policy",
    short: "Which resources the browser can load.",
    body: "The default includes:\n- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — Alpine.js 3 needs `'unsafe-eval'` for its dynamic expressions\n- `img-src 'self' data: https:` — allows external favicons and data: URIs\n- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — Inter font from Google\n- `frame-ancestors 'none'` — anti clickjacking\n\n**Empty = CSP header is not sent** (permissive mode, useful for debugging).\n\nTo harden: read https://web.dev/articles/strict-csp. It's hard because Alpine 3 breaks with pure `script-src 'self'`.",
  },
  "headers.xFrameOptions": {
    title: "X-Frame-Options",
    short: "Whether the page can be embedded in an iframe.",
    body: "**DENY (default)**: nobody can embed Umbral in an iframe. Full anti-clickjacking.\n\n**SAMEORIGIN**: embedding is only allowed from the same origin.\n\n**NONE**: embedding from anywhere is allowed. NOT recommended.",
  },
  "headers.referrerPolicy": {
    title: "Referrer-Policy",
    short: "How much info is sent in the Referer header when navigating away.",
    body: "**no-referrer (default)**: nothing is sent. Maximum privacy.\n\n**same-origin**: referrer is only sent to internal links.\n\n**strict-origin-when-cross-origin**: sends the origin (not the path) to cross-origin HTTPS links, nothing to HTTP.\n\n**no-referrer-when-downgrade**: sends full referrer to HTTPS, nothing when downgrading to HTTP. Historical browser default.",
  },
  "headers.permissionsPolicy": {
    title: "Permissions-Policy",
    short: "Which browser features the page can use (camera, mic, geo, etc.).",
    body: "Default disables camera, microphone, and geolocation. To be stricter you can add `payment=(), usb=(), magnetometer=()`, etc.\n\nFormat: comma-separated list of directives. `feature=()` = block, `feature=(self)` = allow same origin, `feature=(self \"https://other.com\")` = allow origin + other.",
  },
  "headers.hsts": {
    title: "HSTS mode",
    short: "How the Strict-Transport-Security header is sent.",
    body: "**Auto (default)**: enabled only if the request is HTTPS. On LAN HTTP it does nothing; on production HTTPS you harden out-of-the-box.\n\n**Always**: forced always. Useful if your proxy always terminates TLS.\n\n**Never**: never sent. NOT recommended if you're on HTTPS.\n\n**Watch out for max-age**: once a browser sees `max-age=31536000`, it remembers for a year. If you later drop HTTPS, browsers won't be able to reach your site for a year. Test first with `max-age=300` (5 min).",
  },
  "headers.hstsMaxAge": {
    title: "HSTS Max-Age",
    short: "How many seconds the browser remembers \"HTTPS only for this domain\".",
    body: "Default 31536000 (1 year) — the sweet spot per RFC 6797.\n\n**Before going to production**: try 300 (5 min) for a while. If everything works, raise to 3600 (1h), then 86400 (1 day), and only then to 1 year. This gives you time to roll back if something breaks.\n\n0 disables HSTS even if Mode is 'auto' or 'always'.",
  },
  "headers.hstsIncludeSubDomains": {
    title: "HSTS includeSubDomains",
    short: "Whether the HSTS rule applies to subdomains too.",
    body: "**Enable ONLY if ALL your subdomains are HTTPS**. If you have `foo.example.com` on HTTP, a browser that saw `includeSubDomains` won't be able to load it for a year.\n\nDefault false for safety. If your entire domain is HTTPS, enable it and forget about it.",
  },
  "headers.hstsPreload": {
    title: "HSTS preload",
    short: "Whether to submit the domain to Chrome/Firefox/Safari's hardcoded list.",
    body: "If you enable this and go to https://hstspreload.org, Chrome/Firefox/Safari hardcode your domain in their binaries as \"always HTTPS, always includeSubDomains\". It's **permanent and very hard to revert**.\n\n**Requirement**: includeSubDomains=true, max-age >= 31536000, and ALL subdomains on HTTPS. By default Umbral doesn't force this — it's your decision.",
  },
  "theme.groupLayout": {
    title: "Group layout",
    short: "Vertical (stacked) or horizontal (side-by-side columns).",
    body: "**Vertical (default)**: categories stack one below the other. More natural for few categories with many cards.\n\n**Horizontal**: categories are placed in side-by-side columns. Useful if you have 4+ categories with few cards each. On mobile it still stacks.",
  },
  "theme.showClock": {
    title: "Show clock",
    short: "Live HH:MM:SS clock in the header.",
    body: "Updates every second, uses the user's browser time. No server load. Useful for kiosk-style portals or always-on workstations.",
  },
  "theme.showRefresh": {
    title: "Show refresh button",
    short: "Header button that reloads config without refreshing the page.",
    body: "Faster than F5 and preserves scroll/browser state. Fetches config from the server and refreshes assets. Useful if external scripts modify config and you want changes reflected without a full reload.",
  },
  "theme.showStatusBar": {
    title: "Show status bar",
    short: "Footer with Umbral version and last config update.",
    body: "Shows the package.json version and the `_meta.updatedAt` date from config. Useful for debugging (\"does the server have the new config yet?\") and knowing which version each portal in your fleet is running.",
  },
  "layout.healthCheckInterval": {
    title: "Health check interval (seconds)",
    short: "How often to re-test URLs marked for health check.",
    body: "Default 60s. Minimum 10s (avoids hammering the server with many active cards). Maximum 1h.\n\nIf you have many cards and see lag, raise it to 120–300. If you need fast outage detection, lower it to 30.",
  },
  "ai.systemPrompt": {
    title: "AI assistant system prompt",
    short: "The system instructions the AI receives.",
    body: "Here you define the assistant's \"personality\". If left empty, Umbral uses a default optimized for improving card titles/descriptions.\n\nChange it if you want the AI to:\n- Write in another language or tone (more formal, more technical, etc.)\n- Apply different limits (e.g. \"max 80 chars for title\")\n- Return responses in another format (markdown, list, etc.)\n\n**Whatever you put here is not validated** — it's free text sent directly to the provider.",
  },
  "ai.apiKey": {
    title: "AI provider API key",
    short: "Your API key for the provider you chose.",
    body: "**Stored in `data/config.json` in plain text.** We don't use a vault, encryption, or anything else. This is a documented trade-off: the alternative is asking the user to enter the key on every request, which is huge friction for something used on every enhancement.\n\n**Mitigations**:\n1. `data/` should be on a volume with restrictive filesystem permissions\n2. If you expose Umbral to the internet, put a reverse proxy with auth in front of /admin\n3. If compromised, rotate the key at the provider (30 seconds in their panel)\n\nFor local Ollama/LM Studio no key is needed — put \"ollama\" or leave empty.",
  },
  "ai.preset": {
    title: "AI provider preset",
    short: "Pick a popular provider to auto-fill baseUrl and model.",
    body: "Choosing a preset automatically fills Base URL and Model with official values (verified against each provider's docs at commit time).\n\nYou can still edit either field manually — if they no longer match the preset, the dropdown automatically returns to \"Custom / Other\".\n\n**Custom** is for internal proxies, private gateways, or new providers not on the list. Enter the URL manually and you're done.",
  },
  "ai.model": {
    title: "Provider model",
    short: "Which specific model to use (e.g. gpt-4o-mini, claude-sonnet-4-5).",
    body: "The exact name the provider expects in the `model` parameter of the request.\n\nSome providers (OpenAI, Google) accept aliases that always resolve to the latest version (e.g. `gpt-4o-latest`, `gemini-2.0-flash`). Others (Anthropic, Mistral) require the full name.\n\n**For local Ollama / LM Studio**: the model is the one you downloaded with `ollama pull` or loaded in the GUI. Paste the exact name.",
  },
  "ai.language": {
    title: "AI language",
    short: "Which language the AI writes in when improving a card.",
    body: "Default **English** — the tone users see in Umbral's UI. If your services and users are in another language, change it here.\n\n**Supported languages**: Spanish, English, Portuguese (Brazilian), French, German, Italian.\n\n**How it's used**: when you click \"Enhance with AI\" and `systemPrompt` is empty, the server injects the chosen language template as the system prompt. The AI is instructed to write title/description in that language.\n\n**Does not affect** content you already wrote. If your card already has text and the AI only polishes it, it stays in the original language — `language` only applies when the AI generates from scratch.\n\n**Manual override**: if you want a custom tone or language, fill in `System prompt` manually and the template is ignored.",
  },
  "branding.companyName": {
    title: "Company / team name",
    short: "Appears in the header, page title, and messages.",
    body: "Plain text, up to 80 chars. Used in:\n- Browser tab title (`<title>`)\n- Homepage header (if there's no logo)\n- Audit email subjects\n- System messages (\"Welcome to {companyName}\")\n\n**Tip**: use your team's or project's canonical name, not \"My Company\" — it looks bad in logs.",
  },
  "branding.logo": {
    title: "Header logo",
    short: "Image shown top-left on the homepage.",
    body: "Upload it from the Assets tab and select it here. Formats: PNG, JPEG, WebP, SVG, GIF.\n\n**Recommended size**: 200–400px wide, 40–80px tall. The header scales it with CSS `max-height`. Larger logos look pixelated on retina screens.\n\nIf you don't set a logo, `companyName` is shown as text.",
  },
  "branding.favicon": {
    title: "Favicon",
    short: "The small icon in the browser tab.",
    body: "32×32 or 16×16 PNG, ideally. ICO also works. SVG is supported in modern browsers.\n\nWithout a favicon, browsers show a white square or generic icon — looks unpolished.",
  },
  "theme.background.type": {
    title: "Background type",
    short: "Whether the background is a solid color, CSS gradient, or image.",
    body: "**Gradient / CSS color** (default): a free CSS value. Examples: `#0f172a` (dark blue), `linear-gradient(135deg, #0f172a, #1e3a8a)`, `radial-gradient(circle, #1e3a8a, #0f172a)`.\n\n**Solid color**: a hex without gradient. Simpler, faster to render.\n\n**Image**: an uploaded image. Useful for dashboards with strong branding (office photo, background graphic). Blur and overlay below let you soften it so cards read well on top.",
  },
  "theme.background.value": {
    title: "Background value",
    short: "The CSS (gradient/color) or image URL, depending on type.",
    body: "If type is **gradient/color**: any valid CSS. The system sanitizes with regex to block injections.\n\nIf type is **image**: pick it from the Assets dropdown (only PNG/JPG/WebP you uploaded appear).\n\n**Useful shortcuts**:\n- `#0a0a0a` — near-black (dark mode)\n- `#f8fafc` — near-white (light mode)\n- `linear-gradient(135deg, #1e293b, #0f172a)` — classic dark blue gradient\n- `linear-gradient(135deg, #fef3c7, #fde68a)` — warm yellow gradient",
  },
  "theme.background.blur": {
    title: "Background blur",
    short: "How much the background image/color is blurred (0–40px).",
    body: "Useful only with a background image when you want to soften it so cards read on top. With gradients/color there's no visible effect.\n\n**Rule**: 0 for sharp images (logos, hero photos), 10–20 for decorative images, 30+ for busy images.",
  },
  "theme.background.overlay": {
    title: "Overlay opacity",
    short: "Dark/semi-transparent layer on top of the background (0–1).",
    body: "Adds a tint (color configured below) on top of the background. Ensures contrast with card text without editing the image.\n\n**0**: no overlay (image dominates)\n**0.3–0.5**: subtle, image still visible\n**0.7+**: nearly opaque, prioritizes readability\n\nWith gradients/color the overlay isn't very noticeable.",
  },
  "theme.background.overlayColor": {
    title: "Overlay color",
    short: "Color of the overlay layer (default black).",
    body: "Default black (#000000) to darken. White (#ffffff) if you want to lighten a dark image. Any hex color works.",
  },
  "theme.accentColor": {
    title: "Accent color",
    short: "Highlight color (selection, links, hover).",
    body: "Used for:\n- Health check dot color when the card is OK\n- Border/background of selected items in admin\n- Link hover states\n- Focused input border\n\n**Tip**: a contrasting but not harsh accent. `#60a5fa` (sky blue) is the default because it works on light and dark backgrounds.",
  },
  "theme.textColor": {
    title: "Text color",
    short: "Main text color on the homepage.",
    body: "Default `#f1f5f9` (near white). Change it if your background is light (`#0f172a` for dark blue, `#1e293b` for dark gray).\n\nEnsure sufficient contrast with the background (WCAG AA = 4.5:1 ratio for normal text).",
  },
  "theme.cardStyle": {
    title: "Card style",
    short: "Glass (blur), flat, or outlined.",
    body: "**Glass** (default): semi-transparent cards with background blur. Looks great with gradients but can cost CPU on old devices.\n\n**Flat**: opaque cards, solid color. Faster, more readable, less \"luxurious\".\n\n**Outlined**: transparent cards with a border. Balance between the two.",
  },
  "theme.fontFamily": {
    title: "Typography",
    short: "Which font to use for the entire portal.",
    body: "Curated list of Google Fonts + `system-ui` (the user's OS font). Each option loads its Google Fonts CSS automatically.\n\n**`system-ui`** loads nothing from Google — uses the system font. Faster and respects user preferences.\n\nIf you need a custom font (your brand, for example), go to Hardening → Security headers and edit `fontUrl` — but note the schema validates it comes from fonts.googleapis.com.",
  },
  "theme.colorMode": {
    title: "Color mode",
    short: "Auto, dark, or light.",
    body: "**Auto** (default): the portal picks light/dark per `theme.autoStrategy`:\n- **system** (default): browser/OS `prefers-color-scheme`.\n- **schedule**: light between 7 and 19, dark otherwise.\n\n**Dark** / **Light**: force the mode. Useful for a consistent look.\n\nYou can hide the homepage toggle with `theme.showModeToggle`. User override persists in `localStorage`.",
  },
  "layout.columnsDesktop": {
    title: "Desktop columns",
    short: "How many cards per row on large screens.",
    body: "Default 4. Ranges:\n- **2–3**: few cards, one per important service\n- **4–6**: sweet spot for typical portals\n- **7–8**: requires small cards, only if you have many\n\nCheck the preview below the form to see how it looks.",
  },
  "layout.columnsTablet": {
    title: "Tablet columns",
    short: "How many cards per row on tablets (768px–1024px).",
    body: "Default 3. Use 2 if you have cards with long descriptions.",
  },
  "layout.columnsMobile": {
    title: "Mobile columns",
    short: "How many cards per row on phones.",
    body: "Default 2. Set 1 if your cards are large or have a lot of text.",
  },
  "layout.cardSize": {
    title: "Card size",
    short: "Small, medium, or large.",
    body: "Defines card padding and density.\n\n**Small**: more cards visible, less detail.\n**Medium** (default): balance.\n**Large**: more spacious cards, better for a few important services.",
  },
  "layout.showDescriptions": {
    title: "Show descriptions",
    short: "Whether to show text below each card title.",
    body: "If disabled, cards show only title + icon. Useful when you have many cards and space is tight, or when users already know what each service is.",
  },
  "layout.gap": {
    title: "Gap between cards",
    short: "Distance between cards in the grid (rem).",
    body: "Default **1rem**. Lower values (0–0.5) densify the grid; higher values (1.5–3) add breathing room. Use the preview on the right to calibrate.",
  },
  "layout.maxWidth": {
    title: "Max content width",
    short: "Maximum width of the main container in px.",
    body: "Default **1280px**. On ultra-wide monitors prevents cards from stretching too much. Lower values (960–1120) focus content; higher (1440–1920) use large screens.",
  },
  "layout.gridAlign": {
    title: "Content alignment",
    short: "Centered or left-aligned.",
    body: "**Centered** (default): content block sits in the middle of the screen.\n\n**Left**: content aligns to the left edge — useful for asymmetric layouts or external sidebars.",
  },
  "layout.cardRadius": {
    title: "Corner radius",
    short: "How rounded card corners are (px).",
    body: "Default **12px**. **0** = square corners (more technical look). Higher values (20–32) give a softer/bubble appearance.",
  },
  "layout.compact": {
    title: "Compact mode",
    short: "Reduces vertical padding of sections and cards.",
    body: "Useful with many categories and cards — fits more content on screen without reducing column count. Combine with **small card size** for maximum density.",
  },
  "layout.preview": {
    title: "Layout preview",
    short: "Simulates how the grid looks on different viewports.",
    body: "The **Mobile / Tablet / Desktop** switch changes column count in the preview (real breakpoints don't fire inside the narrow panel).\n\nThe preview respects gap, card size, radius, descriptions, compact mode, and theme group layout.",
  },
  "cards.grouping": {
    title: "Cards grouped by category",
    short: "Organize and move cards between categories.",
    body: "Cards are grouped following category order from the **Categories** tab.\n\n**Drag** with the `⋮⋮` handle to reorder within a group or move between groups. **Drop between groups** (or at the start/end) to leave the card **ungrouped**: it shows on the homepage at that position, with no category title.\n\n**Category selector** on each row: keyboard-accessible alternative. Includes **Ungrouped**.\n\nWith an active **text filter**, drag is disabled (partial list doesn't represent real order) — use the selector to move cards.\n\nOrphan cards (deleted category) appear under **Uncategorized**.\n\nUngrouped cards live in ghost categories (`isGhost: true`): they are hidden from the Categories tab and auto-removed when empty.",
  },
  "card.title": {
    title: "Card title",
    short: "The main text shown on the card.",
    body: "Maximum 80 chars. Shown in bold on the card.\n\n**Tip**: if you'll use \"Enhance with AI\" later, put a rough title (\"1Panel\", \"Hermes\") and let the AI polish it with a custom system prompt.",
  },
  "card.kind": {
    title: "Card type",
    short: "Link (clickable) or Note (informational, no link).",
    body: "**Link** (default): the card is clickable and goes to the URL. URL is required.\n\n**Note**: the card is NOT clickable. For tips, announcements, fixed team info (\"Next meeting: Thursday 2pm\"), reminders. URL is optional and you can add a reference link if you want.\n\nChanging an existing card to \"Note\" hides it as a link and shows it as a text box.",
  },
  "card.url": {
    title: "Card URL",
    short: "Where it goes when the user clicks (link type only).",
    body: "Accepts:\n- `https://server:port/path` — internal or external service\n- `/docs`, `/admin` — internal Umbral routes\n- `http://10.x.x.x:port` — private IPs (health check works with `allowInternalHosts=true`)\n\n**The system normalizes automatically**:\n- Strips leading/trailing whitespace/newlines\n- If there's no scheme (`http://`/`https://`) and it's not an internal path, prepends `http://`\n- If it starts with `//`, prepends `http:`\n\n**Not allowed**: `javascript:`, `data:`, `vbscript:`, or anything that isn't http/https/path.",
  },
  "card.description": {
    title: "Card description",
    short: "Text below the title. Plain: 200 chars. Markdown (opt-in): 1000 chars.",
    body: "Appears below the title on the card. Useful to clarify what the service is or add context (\"Weekly backup Monday 3AM\", \"Request access in #infra on Slack\").\n\n**Plain (default)**: 200 chars. Plain text, escaped for security. Nothing is interpreted.\n\n**Markdown (opt-in)**: 1000 chars. If the `features.markdown` feature is active, a \"Markdown\" toggle appears in the form. Preview renders with the same lib (`marked` + `DOMPurify`) as the server, so what you see is what you get.\n\nSupported Markdown (GitHub-flavored, GFM): lists, links, **bold**, `code`, ```blocks```, tables, blockquotes, line breaks. Allowed HTML tags: `a, b, i, em, strong, p, br, ul, ol, li, h1-6, blockquote, code, pre, span, div, img, table` (anything else is escaped). Attributes: `href, title, alt, src, class`. `href` with non-http protocol (e.g. `javascript:`) is blocked.\n\n**If the feature is off**: the toggle doesn't appear in the form. The server forces plain + 200 limit even if someone sends `descriptionFormat: \"markdown\"` via the API.\n\nIf left empty, the card looks cleaner but loses useful info. If you use \"Autofill\" or \"Enhance with AI\", the AI polishes it too.",
  },
  "card.pinned": {
    title: "Pinned card",
    short: "Appears at the top of its category regardless of order.",
    body: "**Pinned** cards render first in their category regardless of the `order` field. Useful to highlight critical services (VPN, status page, monitor) you want users to see first without manual reordering.\n\n**How priority works**:\n1. Pinned first (among pinned, order by `order` is preserved).\n2. Then the rest by ascending `order`.\n\n**When NOT to pin**:\n- If you want the card first ONLY for you (admin) and not visitors, there's no per-user flag yet — pinning affects everyone.\n- If you want stable order among many cards, use numeric `order` instead.\n\n**If the feature is off**: the checkbox doesn't appear in the form. The server forces `pinned: false` on any card that sends `pinned: true` via the API.",
  },
  "card.tags": {
    title: "Card tags",
    short: "Kebab-case cross-cutting labels. Max 10 per card.",
    body: "Tags are **cross-cutting**: they complement the category with alternative dimensions (e.g. \"urgent\", \"frontend\", \"legacy\", \"migrate-soon\"). A card can have tags from several dimensions without changing its category.\n\n**Format**: kebab-case lowercase (a-z, 0-9, hyphens), max 30 chars per tag, max 10 tags per card. Valid examples: `api`, `backend-go`, `legacy-v1`, `urgent`.\n\n**How they're used**:\n- Search: the search input above the homepage matches card text AND tags. Type \"urgent\" and every card with that tag appears.\n- Future filtering: the UI may add a \"filter by tag\" pill row (not in this wave — search only).\n- Visual organization: in the admin card list, tags appear as small chips next to the URL.\n\n**When NOT to use tags**: if you have a dimension with 5+ values you want for visual filtering, use a sub-category (`isSubpage: true`) instead. Tags are for complementary info, not navigation grouping.\n\n**If the feature is off**: the field doesn't appear in the form, and the server drops any `tags[]` in JSON on save. Defense-in-depth: even if someone bypasses the client and sends tags via the API, they aren't persisted if the feature isn't active.",
  },
  "card.category": {
    title: "Category",
    short: "Which group the card belongs to (Communication, Productivity, etc.).",
    body: "Categories are created in the admin \"Categories\" tab. Every card must belong to one. If you delete a category, cards that were in it move automatically to the first one left.",
  },
  "card.color": {
    title: "Card color",
    short: "Accent color for the icon and health check dot.",
    body: "Not the background color — it's the icon/dot color. Default `#60a5fa` (sky blue).\n\n**Tip**: use consistent colors per category. Communication in green, Productivity in blue, Dev in purple. Gives the portal visual identity.",
  },
  "card.icon": {
    title: "Card icon",
    short: "The small graphic next to the title.",
    body: "Pick from the icon picker (built-in icons cover common cases). For a custom icon, expand the panel below and type a Lucide icon name or the URL of an uploaded asset.\n\n**Popular Lucide names** not in the default set: `rocket`, `database`, `server`, `terminal`, `github`, `docker`, etc. Any name from https://lucide.dev works.",
  },
  "card.openInNewTab": {
    title: "Open in new tab",
    short: "Whether the URL opens in a new tab or replaces the current one.",
    body: "Enabled by default. Useful for internal services where you want the portal to stay open in the background.\n\nDisable for links to docs or \"external\" URLs the user will want to close without coming back.",
  },
  "card.enabled": {
    title: "Card enabled",
    short: "Whether the card appears on the homepage.",
    body: "Disabled = the card is saved in config but does NOT appear. Useful for:\n- Services in temporary maintenance\n- \"Documentation\" cards you want off the home page\n- Seasonal cards (events, campaigns)\n\n**Not the same as deleting** — the card is still there, it just isn't rendered.",
  },
  "card.healthCheck": {
    title: "Health check (live dot)",
    short: "Periodic ping to the URL with a green/red dot based on response.",
    body: "Enabled: the server sends a HEAD request to the URL every `healthCheckInterval` seconds (default 60s). 2xx response = green dot. Failure or timeout = red dot.\n\n**Cost**: 1 request per card every N seconds. With 10 cards at 60s = 600 req/hour. Negligible, but with 100 cards consider increasing the interval.\n\n**Privacy**: the server makes the request, not the browser. Useful when users shouldn't have every browser hit the URL.\n\nFor internal hosts (10/8, 192.168/16), the `Allow internal hosts` toggle in Hardening → Network must be enabled.",
  },
  "category.name": {
    title: "Category name",
    short: "Text shown as the section header.",
    body: "What users see on the homepage as the column/section title. Be descriptive but short (\"Communication\", \"Productivity\", \"Dev\", \"Operations\", etc.).\n\nIf you only have one or two categories with many cards each, use more specific names (\"Infrastructure\", \"Client A\", \"Client B\").",
  },
  "category.icon": {
    title: "Category icon",
    short: "Lucide icon shown next to the name.",
    body: "Any Lucide name (https://lucide.dev). Examples: `message-circle`, `briefcase`, `code`, `server`, `globe`, etc.\n\nIf the name doesn't exist, the system uses a generic placeholder. Nothing breaks.",
  },
  "category.order": {
    title: "Reorder categories",
    short: "Drag rows to set order on the homepage.",
    body: "Each row has a `⋮⋮` handle on the left. Hold and drag to reorder. The order you set here is the order sections/columns appear on the homepage (what users see).\n\n**Tips:**\n- The id (kebab-case) does NOT change when reordering — only position in the list.\n- Cards inside each category keep their own independent order (set in the Cards tab).\n- Changes persist when you click \"Save changes\" top right.\n- If a category is empty (no active cards), it doesn't appear on the homepage — but still counts in order for when you add cards.",
  },
  "category.lock": {
    title: "Category password lock",
    short: "Hides category cards until the user enters the password.",
    body: "When you enable password lock on a category:\n- On the homepage or its subpage, the category title is shown but its cards/links are hidden.\n- A box prompts for the password to unlock the content.\n- With the correct password, cards are revealed immediately and unlock persists for the browser session.\n- Protected cards aren't accessible via quick search until the category is unlocked.",
  },
  "category.subpage": {
    title: "Independent subpage",
    short: "Turns the category into a dedicated page accessible only by its URL.",
    body: "When you mark a category as **Independent subpage**:\n- **It will NOT appear on the main homepage (`/`)**.\n- Users can access it only by its direct URL: `/{category_id}` (example: `/prueba`).\n- If password lock is also enabled, it asks for the password on its subpage before showing links.\n- Ideal for private sections, internal departments, secondary links, or restricted-access portals.",
  },
  "assets.upload": {
    title: "Upload assets",
    short: "Logos, favicons, card icons, backgrounds.",
    body: "**Allowed types** (configurable in Hardening → Uploads): PNG, JPEG, WebP, SVG, GIF.\n\n**Limits by type**:\n- Logo: 1 MB\n- Favicon: 256 KB\n- Card icon: 512 KB\n- Background: 5 MB\n\n**Why these limits**: browsers download images every time someone loads the portal. A 5 MB logo is unnecessary and kills LCP.\n\nSVGs are sanitized with DOMPurify before serving (if `Allow SVG` is active). This prevents XSS via malicious SVG.",
  },
  "status.check": {
    title: "Card status",
    short: "HEAD ping to each URL marked with health check.",
    body: "The server sends a HEAD request to each URL of cards with `healthCheck=true`. Returns:\n- **Green** (2xx–3xx): URL responds OK\n- **Red** (4xx–5xx, fetch failed, timeout): something is wrong\n- **\"Invalid URL\"**: the card URL doesn't parse as http(s) or path\n\n**Not production-grade monitoring**: doesn't check content, doesn't alert, doesn't log history. It's a superficial \"alive or not\".\n\nFor internal hosts (10/8, 192.168/16, local docker compose), the `Allow internal hosts` toggle in Hardening → Network must be enabled.",
  },
  "advanced.export": {
    title: "Export configuration",
    short: "Download the current config.json to your machine.",
    body: "Useful for:\n- Backup before a big change\n- Migrating to another server (copy data/ + import config)\n- Versioning config in git (NOT recommended because of apiKey, but branding/layout is fine)\n- Sharing config between portals in the same org\n\nThe file is exact `data/config.json`, with a timestamp in the filename.",
  },
  "advanced.import": {
    title: "Import configuration",
    short: "Upload a config.json and replace the current one.",
    body: "**REPLACES** the current config. Not a merge.\n\n**1 MB cap** — a typical config weighs 5–50 KB, so it's very generous. If you exceed it, we reject.\n\n**Caution**: imported config may have a different apiKey than you're using. If so, it gets replaced.\n\nAfter import, the page reloads to apply changes.",
  },
  "advanced.healthcheck": {
    title: "System healthcheck",
    short: "Verifies the server is alive and responding.",
    body: "Calls `GET /api/health` (no auth, public). Returns:\n- `status: 'ok'` — all good\n- `version` — package.json version\n- `uptime` — seconds since the server started\n\nUseful for an external uptime monitor (UptimeRobot, Better Uptime, etc.) that wants to know if your portal is alive without parsing HTML.\n\nIf Umbral is behind a reverse proxy, the healthcheck goes through the proxy. If you see `status: 'degraded'`, check the logs.",
  },
  "advanced.reset": {
    title: "Reset to defaults",
    short: "Restores configuration to factory values.",
    body: "**Sets ALL config to defaults**, but keeps:\n- Your password (doesn't log you out)\n- The CSRF token (sessions stay alive)\n- Uploaded assets (photos, logos)\n\n**Does NOT keep**: custom cards, custom categories, custom theme, apiKey, etc.\n\nYou must type `RESET` to confirm — you won't do it by accident.",
  },
  "advanced.features": {
    title: "Features (opt-in)",
    short: "Each new feature starts off. Enable the ones you need.",
    body: "This grid lists **all new Umbral features**. Each is opt-in: default `enabled: false`, so if you don't enable it, it doesn't run, its dependency isn't loaded, and it doesn't appear in the UI.\n\n**How it works**:\n- Switch ON → feature enables on save (\"Save changes\" button).\n- Switch OFF → feature turns off. If it had data, it stays in config.json but inactive; turning ON again brings it back as-is.\n- Each toggle is logged in audit.log (e.g. `feature_toggle: i18n: false→true`).\n\n**Why opt-in?** Roadmap principle 7: \"if you don't use it, you don't pay for it\". Heavy features (qr, oidc, totp2fa) bring npm dependencies that only load when enabled.\n\n**What's available today?** i18n, markdown, tags, pinned, presets, audit log viewer. The rest (webhooks, metrics, multi-user, multi-portal, etc.) arrives in waves 2/3/4.\n\nMore detail in `/docs` when each wave ships.",
  },
  "advanced.metrics": {
    title: "Latency metrics",
    short: "Sparklines and summary (avg, p95, max) per health-check card.",
    body: "**Metrics** records health check latency in an in-memory ring buffer (last 100 samples per card, ~1.5h with 60s checks). The SVG sparkline renders next to the health dot on the homepage (only if the feature is active). The dashboard shows a table with avg / p95 / max / latest per card.\n\n**How to interpret**:\n- **Avg**: average latency. A sudden rise means something got slow.\n- **P95**: 95th percentile. Better metric for \"user experience\" — reflects realistic worst case.\n- **Max**: peak. If much higher than avg, there are outliers (cold start, network blip).\n- **Latest**: last check state (ok/fail + relative time).\n\n**When to look**:\n- After a deploy: did latency go up?\n- When a service feels slow: is p95 fine or spiking?\n- Before reporting \"the system is slow\": do the numbers confirm it or is it perception?\n\n**Limitations**:\n- In-memory ring buffer: if Umbral restarts, data is lost. Accepted trade-off to avoid I/O on every check.\n- Inline sparkline (SVG, no library). Simple polyline — for advanced charts (bar charts, heatmaps), use data from `/api/metrics?id=...` in an external dashboard (Grafana with JSON datasource, etc.).\n- No disk persistence in this version. Schema option `persistToDisk` is a no-op prepared for the future.\n\n**If the feature is off**: the section doesn't appear in admin, sparklines don't render on the homepage, and `/api/metrics` returns 404. Defense-in-depth: even if someone sends samples via the API, they aren't recorded.",
  },
  "advanced.maintenance": {
    title: "Maintenance windows",
    short: "Schedule windows where cards are in maintenance. Suppresses health_fail webhooks during the window.",
    body: "**Maintenance windows** are periods when you expect one (or all) cards to fail — typically during deploys, DB migrations, infra maintenance. During the window, affected cards:\n\n- Show an **amber \"🔧 Maintenance\" badge** on the homepage with the reason you entered.\n- **Do NOT fire** `health_fail` webhooks (reduce spam during deploy). Health check still runs (dots turn red on the homepage), but admin already knows it's failing — no need to notify.\n- Still fire `health_recover` when back to OK. Useful to confirm the deploy finished well.\n\n**When to use**:\n- New version deploy: 30min window over all services.\n- Single service maintenance: 2h window over 1–2 cards.\n- DB migration: window over cards that depend on that DB.\n\n**When NOT to use**:\n- To permanently disable a card, use `enabled: false` on the card itself.\n- To pause webhooks without showing a badge: lower `cooldownMin` or temporarily disable the webhook with `enabled: false`.\n\n**Auto-cleanup**: windows with `endsAt` more than 24h in the past are marked \"historical\" in admin but NOT auto-deleted. Admin can see them and delete manually (× button). We don't want to remove info useful for post-mortem debugging.\n\n**Timezone**: timestamps are stored in UTC. Admin UI shows them in browser local time. If your team is distributed, everyone sees the same UTC time in config.json, but the UI adapts to the browser zone.\n\n**If the feature is off**: the section doesn't appear in admin, and rendering ignores windows (no badge + webhooks don't respect them). Defense-in-depth: even if someone sends windows in JSON, the server drops the array on save if the feature isn't active.",
  },
  "advanced.webhooks": {
    title: "Notification webhooks",
    short: "Notify Slack/Discord/ntfy/etc when a health-check card changes state.",
    body: "Webhooks turn Umbral into an **active notification hub**: when a card with `healthCheck: true` changes from healthy to failing (or vice versa), Umbral POSTs to URLs you configure.\n\n**Events**:\n- `health_fail`: fires when the card goes from healthy to failing (after N consecutive failed checks, configurable per webhook).\n- `health_recover`: fires when the card is healthy again. Useful to confirm the issue is resolved.\n\n**Threshold (minFailures)**: how many consecutive checks must fail before firing `health_fail`. Default 3. If checks are every 60s, that's 3 minutes of sustained failure before notifying. Useful to absorb transient blips.\n\n**Cooldown**: minutes between notifications from the same webhook. Default 30. Prevents spam if a service flaps.\n\n**How payloads are built**: Umbral always sends **raw JSON** with this shape (Slack/Discord-style services can receive it via a proxy or webhook adapter, or admin can use a custom endpoint that parses it):\n```json\n{\n  \"event\": \"health_fail\",\n  \"card\": { \"id\": \"...\", \"title\": \"...\", \"url\": \"...\" },\n  \"status\": { \"ok\": false, \"code\": 503, \"latencyMs\": 1234 },\n  \"consecutiveFailures\": 3,\n  \"threshold\": 3,\n  \"timestamp\": \"2026-08-19T...\",\n  \"portal\": { \"name\": \"My Company\" }\n}\n```\nHeaders: `X-Umbral-Event`, `X-Umbral-Card`, `User-Agent: Umbral-Webhook/1.0`.\n\n**Security**:\n- SSRF guard active: blocks loopback (127.0.0.1), private IPs (10/8, 172.16/12, 192.168/16), and cloud metadata. To point at an internal service (Gotify on LAN), enable `security.network.allowInternalHosts` in Hardening.\n- 8s timeout per webhook (don't want a slow endpoint to block health check).\n- `redirect: 'manual'`: no redirect following — closes classic SSRF bypass via redirect.\n- Header `X-Umbral-Event` lets the receiver route without parsing the body.\n\n**In-memory state**: consecutive failure counters and \"last fire\" are in memory (not persisted). If Umbral restarts, counters start at 0. For long-lived deploys, after restart you wait `minFailures` checks before the first `health_fail` fires. Accepted trade-off to avoid writing/serializing state on every check.\n\n**Testing**: the \"Test\" button next to each webhook (or \"Test before save\" in the add form) sends a sample payload to the URL. Useful to verify the endpoint responds before waiting for a real failure.",
  },
  "advanced.audit": {
    title: "Audit log viewer",
    short: "Read data/audit.log from the browser with filters.",
    body: "**Reads the last N entries** from `data/audit.log` and shows them in a virtual-scroll table. Each row is an event (timestamp + action + detail).\n\n**Available filters**:\n- **Action**: dropdown of distinct actions in the log (e.g. `config_update`, `login_ok`, `asset_delete`).\n- **Detail contains**: case-insensitive substring on the `detail` field (useful to search \"features\", \"i18n\", etc.).\n- **From / To**: datetime-local in UTC. \"To\" includes the selected minute.\n- **Limit**: 50 / 200 / 500 / 1000 entries.\n\n**Actions**:\n- **Clear**: reset filters.\n- **Download full log**: download last 1000 entries as a `.log` file for offline analysis.\n\n**When to check the audit log**:\n- \"Who disabled category X?\" → filter action=`config_update` and detail contains \"X\".\n- \"When did auth errors start?\" → filter action=`login_ok` (or look for new actions after).\n- \"What changed in the last hour?\" → set \"From\" to `Date.now() - 1h`.\n\n**Retention**: log rotates automatically at 10MB (keeps 3 backups). For months of retention, export periodically or configure a sidecar to copy the file.\n\nIf the feature is off, this section doesn't appear and `/api/audit` returns 404.",
  },
  "advanced.multiPortal": {
    title: "Multi-Portal",
    short: "Serve multiple portals/dashboards from one instance by domain or route prefix.",
    body: "**Multi-Portal** lets you isolate config, cards, categories, assets, and logs for different teams or environments (e.g. \"IT\", \"Marketing\", \"Dev\", \"Clients\") in a single Umbral installation.\n\n**How routing works**:\n1. **By Host (Domain / Subdomain)**: Associate a portal with a specific host (e.g. `dev.portal.local` or `marketing.company.com`). Supports wildcards like `*.company.com`.\n2. **By Path Prefix**: Route by prefix (e.g. `/dev`, `/marketing`).\n3. **Default Portal (Fallback)**: Any request that doesn't match registered portals is served by the default portal (`default`).\n\n**On-disk data structure**:\nWhen you enable the feature, data auto-migrates transparently:\n- `data/portals/default/config.json`: Default portal configuration.\n- `data/portals/<portal-id>/config.json`: Independent configuration per portal.\n- `data/portals/<portal-id>/uploads/`: Assets and logos for that portal.\n- `data/portals/<portal-id>/audit.log`: Isolated audit log per portal.\n\n**Portal management**:\nAdd new portals by defining a unique kebab-case ID, a display name, and optionally host or pathPrefix.",
  },
  "security.multiUser": {
    title: "Users (multi-user)",
    short: "Create users with roles (admin/editor/viewer) and username login.",
    body: "**Multi-user** lets you create several admins/editors/viewers instead of sharing one password. Each user has their own username, password (hashed with bcrypt cost 12), and role. The **single password** (super-admin) remains valid as a rescue path by default — admin can disable it in \"Access mode\".\n\n**Access modes** (3 states):\n- `password-only` (default): single password only. If you had a legacy deploy and don't want complexity, this is what you get before touching anything.\n- `both`: single password + username login. Single password stays valid for \"emergencies\" (e.g. lost access to a user and need to create a new one).\n- `users-only`: only listed users. Single password stops working. **Caution**: if you end up with no valid users and single password off, you can't get in. Server rejects this save if users is empty. Hard confirmation: \"Users only\" form checks at least one user before applying.\n\n**Roles**:\n- `admin`: full access (includes user and config management).\n- `editor`: can edit cards/categories/theme/branding, not security or users.\n- `viewer`: read-only. Useful for audit, support, integrations.\n\n**Per-user sessions**: each user has an independent `userEpoch`. Changing Alice's password (or resetting it here) increments her epoch, invalidating all Alice sessions without touching Bob. Closes the gap where \"Alice was compromised, I changed her password, but old sessions stayed alive\" that the single-password system had.\n\n**TOTP login** (features.totp2fa, Wave 3.2): if active, each user can enable their own 2FA. Single super-admin password **cannot** be protected with TOTP — intentional. If you lose TOTP seeds, single password is the rescue path. That's why it stays valid by default.\n\n**If the feature is off**: section doesn't appear in Password tab, server drops `users[]` on save (defense in depth), and username login returns 401.",
  },
  "security.accessMode": {
    title: "Access mode",
    short: "Three login modes: password only, password+users, or users only.",
    body: "Defines how you can sign in to the portal:\n\n**`password-only`** (historical default): single password only. What you had before Wave 3.1. Simple, one secret to rotate if leaked.\n\n**`both`**: single password + username login. Both worlds. Single password serves as rescue if you lose access to a user (expired session, broken MFA, etc). Trade-off: two attack surfaces.\n\n**`users-only`**: users only. Single password ceases to exist. **Not recommended** unless you have strict compliance or want a single entry point. Risk: if you end up with no valid users (e.g. deleted the last admin), you can't get in — server rejects save if users[] is empty, but if you enable it and then delete the last user, you're locked out and must edit JSON manually.\n\n**Recommended choice**: `both` (default when multi-user feature is active). Gives per-user audit log + single-password safety net.\n\n**Compliance caveat**: if you need PCI-DSS or similar requiring \"single point of authentication\", `users-only` gets you closer. But usually the single password is still acceptable as a documented emergency service account.",
  },
  "security.password": {
    title: "Change password",
    short: "Rotate the admin password. Invalidates all other sessions.",
    body: "Three fields: current, new, confirm. If they don't match, we reject.\n\nOn save:\n- New password is hashed with bcrypt (cost 12)\n- CSRF token is rotated\n- `authEpoch` is incremented → **all existing sessions die on the next request** (except yours, which stays active)\n\n**Why invalidating other sessions matters**: if someone stole your session and you change the password without invalidating, the attacker stays in until the cookie expires. With epoch, the cookie is dead immediately.",
  },
  "security.csrf": {
    title: "CSRF token",
    short: "One-time token that validates mutating requests.",
    body: "Rotates automatically when changing the password. All POST/PUT/DELETE/PATCH requests must send this token in the `x-csrf-token` header.\n\nIf you enable `Rotate CSRF on each login` (Hardening), it also rotates every time someone logs in.\n\n**Don't copy it to other browsers/devices** — it's tied to your session. If you lose it, log out and log in again.",
  },
  "externalSearch.intro": {
    title: "External search for autofill",
    short: "Fallback when site scrape fails. Default: Wikipedia + DuckDuckGo (no key).",
    body: "The \"Autofill\" button on the card form first tries to **scrape the site** (GET the URL + parse meta tags). When that fails — internal service with no public HTML, IP:port URL with no DNS, site returns empty login, etc. — it falls back to **external search** by service name.\n\n**Search order**:\n1. **Brave Search** (if you have a key) — best quality, 2000 req/month free\n2. **Tavily** (if you have a key) — optimized for AI, 1000 req/month\n3. **Wikipedia REST** — no key, covers most known products\n4. **DuckDuckGo Instant Answer** — no key, inconsistent results\n\nIf none find anything, you get a toast and the form stays as-is.",
  },
  "externalSearch.brave": {
    title: "Brave Search API key",
    short: "Free tier: 2000 req/month. Better quality than Wikipedia/DDG.",
    body: "**Setup**:\n1. Go to https://brave.com/search/api/\n2. Create an account, generate an API key (starts with `BSA...`)\n3. Paste it here\n\n**Free tier**:\n- 2000 requests / month\n- 1 req/second rate limit (enough for human autofill)\n- Google-quality results, with snippet and sometimes profile image\n\n**Privacy**: the query sent to Brave is the service name. It doesn't include the URL.",
  },
  "externalSearch.tavily": {
    title: "Tavily API key",
    short: "Free tier: 1000 req/month. Optimized for AI agents.",
    body: "**Setup**:\n1. Go to https://tavily.com\n2. Sign up, generate API key (starts with `tvly-...`)\n3. Paste it here\n\n**Free tier**:\n- 1000 requests / month\n- Generous rate limit\n- Clean results optimized for LLM consumption\n\n**When to prefer Tavily over Brave**: if you also use the AI provider to enhance cards, Tavily returns more \"AI-friendly\" content (less HTML, more clean text). Brave is better for web-style results.\n\n**Privacy**: the query is the service name.",
  },
  "theme.bgEditMode": {
    title: "Background per light/dark mode",
    short: "Edit the portal background separately for dark and light mode.",
    body: "Each mode has its own background (gradient, color, or image). Use **Copy from other mode** to start from the existing palette and adjust.\n\nThe portal light/dark toggle uses the background for the active mode.",
  },
  "theme.advancedCss": {
    title: "Advanced background CSS",
    short: "Edit the background value as free CSS text.",
    body: "Disables the visual builder and lets you paste any valid CSS value: `linear-gradient(...)`, `radial-gradient(...)`, hex color, etc.\n\nUseful for complex backgrounds the builder doesn't cover.",
  },
  "theme.gradientBuilder": {
    title: "Gradient builder",
    short: "Build gradients with angle and color stops.",
    body: "Adjust **angle** (0–360°) and each **stop** (color + position %). Preview updates instantly.\n\nYou can remove extra stops if there are more than two.",
  },
  "theme.iconTint": {
    title: "SVG icon tint",
    short: "How card SVG icons are colored.",
    body: "**Original (default)**: respects SVG colors (brand logos).\n\n**Accent / Text / Custom**: applies a uniform color via CSS mask.\n\nUse Original for GitHub, Docker, etc.; Accent or Text for monochrome icons from UI packs.",
  },
  "theme.iconColor": {
    title: "Custom icon color",
    short: "Color used when tint is \"Custom\".",
    body: "Only applies if **Icon tint** is **Custom**. Defined per light/dark mode in the advanced ramp.",
  },
  "theme.autoStrategy": {
    title: "Auto mode strategy",
    short: "How the portal picks light or dark when mode is Auto.",
    body: "**System**: follows OS/browser preference (`prefers-color-scheme`).\n\n**Schedule**: light from 7:00 to 19:00, dark otherwise (server time).",
  },
  "theme.textRamp": {
    title: "Text ramp",
    short: "Primary, muted, subtle, and faint text colors per mode.",
    body: "The ramp defines typographic hierarchy. **AA ✓** badge indicates WCAG contrast ≥ 4.5:1 against the surface.\n\nIf contrast drops, adjust `--text` or the surface in advanced tokens.",
  },
  "theme.derivedPalette": {
    title: "Derived palette",
    short: "View of colors calculated from accent and tokens.",
    body: "Shows how the theme engine combines accent, surfaces, and borders. Read-only; edit in **Colors** or **Advanced**.",
  },
  "theme.fontWeight": {
    title: "Font weight",
    short: "Portal font weight (400–700).",
    body: "Affects titles, cards, and widgets. 400 = regular, 600–700 = bolder for corporate dashboards.",
  },
  "theme.useGoogleFonts": {
    title: "Google Fonts",
    short: "Load the font from fonts.googleapis.com.",
    body: "When enabled, the browser requests the font from Google (privacy implication: Google sees your visitors' IPs).\n\nDisable and use your own `fontUrl` or system fonts to avoid external requests.",
  },
  "theme.cardBlur": {
    title: "Glass card blur",
    short: "Blur intensity for glass style.",
    body: "Only applies to `cardStyle: glass`. Higher values = more frosted glass; 0 = no blur.",
  },
  "theme.cardBorderWidth": {
    title: "Border width (outlined)",
    short: "Border thickness for outlined cards.",
    body: "Only applies to `cardStyle: outlined`. Expressed in pixels.",
  },
  "theme.showModeToggle": {
    title: "Light/dark toggle",
    short: "Show the mode switch button in the header.",
    body: "Visitors can switch between light and dark. Preference is saved in `localStorage`.",
  },
  "theme.clockPosition": {
    title: "Clock position",
    short: "Header left or right.",
    body: "The clock respects the 12h/24h format configured below.",
  },
  "theme.clockFormat": {
    title: "Clock format",
    short: "12h with AM/PM or 24h.",
    body: "Affects the clock widget in the portal header and the admin preview.",
  },
  "theme.headerOpacity": {
    title: "Header opacity",
    short: "Top bar transparency (0–1).",
    body: "0 = invisible, 1 = opaque. Useful over backgrounds with a lot of visual detail.",
  },
  "theme.footerOpacity": {
    title: "Footer / status bar opacity",
    short: "Bottom bar transparency (0–1).",
    body: "Applies to the status bar when visible.",
  },
  "theme.presets": {
    title: "Theme presets",
    short: "Full palettes with light and dark variants.",
    body: "Each preset defines background, text, surfaces, borders, accent, and icons for **both** modes.\n\nDark/Light buttons only choose the **initial mode**; the portal toggle still works.",
  },
  "theme.savePreset": {
    title: "Save custom preset",
    short: "Save current configuration as a reusable preset.",
    body: "Maximum 5 custom presets. Does not include advanced tokens or nested preset list.",
  },
  "theme.resetDefaults": {
    title: "Restore defaults",
    short: "Reset theme to Umbral factory values.",
    body: "Does not delete saved custom presets. Requires saving changes to persist.",
  },
  "theme.advanced.intro": {
    title: "Advanced tokens (Pro)",
    short: "CSS variable theme editor per mode.",
    body: "Override any token (`--surface`, `--border`, shadows, etc.) per light/dark mode.\n\nUse **Derive** to generate tokens from accent.",
  },
  "theme.advanced.derive": {
    title: "Derive tokens",
    short: "Generate surface/border tokens from accent color.",
    body: "Recalculates coherent values without editing each field manually. Doesn't overwrite tokens you already customized manually if you choose partial merge.",
  },
  "theme.advanced.shadowIntensity": {
    title: "Shadow intensity",
    short: "Global multiplier for text and icon shadows.",
    body: "Affects `--shadow-text` and `--shadow-icon`. Useful for very flat or very dramatic themes.",
  },
  "theme.advanced.tokens": {
    title: "Token list",
    short: "Each row is a CSS theme variable.",
    body: "Empty tokens use preset/engine default. Base **shared** applies to both modes; **dark/light** only to that mode.",
  },
  "theme.advanced.exportImport": {
    title: "Export / import theme",
    short: "Portable JSON of the full theme.",
    body: "Export for backup or copying between portals. Import replaces `cfg.theme` (schema-validated).",
  },
  "theme.preview.mode": {
    title: "Preview mode",
    short: "Dark / Light / Auto in the panel (doesn't affect visitors).",
    body: "**Auto** follows the same logic as the portal (`colorMode` + strategy). Embedded preview doesn't read the visitor's saved preference.",
  },
  "theme.preview.openTab": {
    title: "Preview in tab",
    short: "Open the portal with theme draft in another tab.",
    body: "Uses `localStorage` (`umbral-theme-preview`). Save changes in admin so the public tab reflects them on reload.",
  },
  "card.autofill": {
    title: "Autofill card",
    short: "Fill title, description, and icon from the URL.",
    body: "Tries to scrape meta tags from the URL. If that fails, searches Wikipedia/Brave/Tavily per external search configuration.",
  },
  "card.aiEnhance": {
    title: "Enhance with AI",
    short: "Rewrites title/description with the configured provider.",
    body: "Requires active AI tab and valid API key. Does not change URL or icon.",
  },
  "card.descriptionFormat": {
    title: "Markdown format",
    short: "Sanitized Markdown description vs plain text.",
    body: "Markdown allows **bold**, lists, and links. Requires active `markdown` feature. HTML is sanitized on the server.",
  },
  "card.iconPicker": {
    title: "Icon picker",
    short: "Pick icons from installed packs or uploaded assets.",
    body: "**Icons** tab: Git packs (Lucide, Simple Icons, etc.). **Assets**: uploaded PNG/SVG.\n\nWith no packs installed, install one from **Git Icons**.",
  },
  "assets.dropzone": {
    title: "Upload assets",
    short: "Drag files or use the file picker.",
    body: "Size limits and MIME types are configured in **Hardening → Uploads**. SVG may require active sanitization.",
  },
  "assets.copyUrl": {
    title: "Copy asset URL",
    short: "Copy the public path to the clipboard.",
    body: "Use `/api/assets/name.ext` as a custom card icon or background image.",
  },
  "assets.delete": {
    title: "Delete asset",
    short: "Remove the file from portal storage.",
    body: "Cards referencing that asset will show no image until you update the icon.",
  },
  "audit.filters": {
    title: "Audit filters",
    short: "Action, detail text, and date range.",
    body: "Events come from `data/audit.log`. Filter by type (`config.save`, `login`, etc.) or free text in the detail JSON.",
  },
  "audit.limit": {
    title: "Entry limit",
    short: "Maximum number of lines returned.",
    body: "Reverse chronological order (most recent first). Raise the limit for manual exports.",
  },
  "audit.download": {
    title: "Download full log",
    short: "Download entire `audit.log` without filters.",
    body: "Useful for archiving or external analysis. The file can grow; rotate manually if needed.",
  },
  "iconPacks.intro": {
    title: "Git icons",
    short: "Install SVG packs from public repositories.",
    body: "Simple Icons (brands), Lucide (UI), Tabler, etc. Icons live in `data/icon-packs/` and are served via `/api/icons/`.",
  },
  "iconPacks.install": {
    title: "Install pack",
    short: "Clone the repo and copy SVGs to the portal.",
    body: "May take a while depending on repo size. Requires outbound network from the server.",
  },
  "iconPacks.uninstall": {
    title: "Uninstall pack",
    short: "Remove pack SVGs from disk.",
    body: "Cards with `pack/name` icons will stop showing images until you change the icon.",
  },
  "iconPacks.refresh": {
    title: "Refresh catalog",
    short: "Re-read installed packs and update the picker.",
    body: "Use after install/uninstall without reloading the page.",
  },
  "iconPacks.customRepo": {
    title: "Custom Git repo",
    short: "URL of a repository containing SVGs.",
    body: "Must be accessible over HTTPS. Umbral clones to temp and copies per subpath/prefix.",
  },
  "iconPacks.branch": {
    title: "Repo branch",
    short: "Branch to clone (e.g. main, develop).",
    body: "Default is usually `main`. Check the repo for the active branch.",
  },
  "iconPacks.subpath": {
    title: "Subpath in repo",
    short: "Folder inside the repo where SVGs live.",
    body: "E.g. `icons` in Lucide, `svg` in dashboard-icons. Only `.svg` from that folder are copied (recursive per implementation).",
  },
  "iconPacks.prefix": {
    title: "Pack prefix",
    short: "ID used in `prefix/icon-name`.",
    body: "E.g. `my-pack` → icons like `my-pack/home.svg`. Must be unique among installed packs.",
  },
  "advanced.oidc": {
    title: "OIDC / SSO",
    short: "Single Sign-On with OpenID Connect providers.",
    body: "Configure client ID/secret, issuer, and scopes for Google, Keycloak, Authentik, etc.\n\nRequires active `oidc` feature and correct callback URLs in the IdP.",
  },
  "advanced.apiTokens": {
    title: "API tokens",
    short: "Long-lived tokens for automation.",
    body: "Allow calling admin endpoints without a session cookie. Rotate compromised tokens and use minimal scopes.\n\nRequires active `apiTokens` feature.",
  },
} satisfies HelpCatalog;

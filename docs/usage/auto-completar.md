# Auto-completar tarjetas

> Cómo funciona el botón "Auto-completar" del form de tarjeta, y cómo agregar capacidades de búsqueda externa cuando el scrape directo del sitio no alcanza.

## El flujo

Cuando estás en el form de una tarjeta (edición o nueva) y presionás **Auto-completar**:

1. **Si hay URL** (y parece `http(s)://...`) → el server hace `GET` a esa URL, parsea el HTML y extrae:
   - `<title>` o `og:title` o `twitter:title`
   - `<meta name="description">` o `og:description` o `twitter:description`
   - `og:image` o `twitter:image` o favicon del sitio
2. **Si el scrape falla** (sitio no responde, devuelve HTML de login sin meta tags, IP interna no accesible desde el server, etc.) **o si no hay URL**, hace fallback a **búsqueda externa**:
   - **Brave Search API** (si hay key configurada)
   - **Tavily** (si hay key configurada)
   - **Wikipedia REST** (sin key, siempre)
   - **DuckDuckGo Instant Answer** (sin key, siempre, como último fallback)
3. El form se rellena con lo que encontró, **sólo en campos vacíos** — nunca pisa lo que vos ya escribiste.
4. Si la búsqueda devolvió una imagen, se sube como asset y se setea como ícono de la tarjeta.
5. El toast te dice de dónde salió la info: `Autocompletado: 3 campo(s) desde Wikipedia` o `No se encontró info útil (Wikipedia)`.

## Configurar búsqueda externa

Andá a **Admin → IA** y desplazate hasta la sección **"Búsqueda externa (auto-completar)"**. Vas a ver dos campos opcionales:

### Brave Search API key

- Tier gratis: **2000 requests / mes** (~66 por día).
- Setup: https://brave.com/search/api/ → crear cuenta → generar API key (empieza con `BSA...`).
- Calidad Google, con snippet limpio y a veces imagen del profile.
- **Cuándo elegirlo**: si tenés muchos servicios no-documentados o querés calidad "real" de búsqueda.

### Tavily API key

- Tier gratis: **1000 requests / mes** (~33 por día).
- Setup: https://tavily.com → sign up → API key (empieza con `tvly-...`).
- Optimizado para AI agents: devuelve contenido limpio, no HTML.
- **Cuándo elegirlo**: si vas a usar también el provider IA para mejorar tarjetas — los resultados son "AI-friendly" por diseño.

### Sin key

Si no cargás ninguna key, el fallback usa **Wikipedia + DuckDuckGo**. Para servicios conocidos (MongoDB, GitLab, Excalidraw, Docker, etc.) Wikipedia tiene página con descripción. Para el resto, va a quedar vacío y el toast te avisa.

## SearXNG self-hosted (avanzado)

Si querés **búsqueda sin límites, sin keys y sin tracking**, deployá [SearXNG](https://docs.searxng.org/admin/installation.html) (es un meta-buscador open-source que consulta Google/Bing/DDG/etc. y te devuelve resultados agregados sin identificarte).

**Setup típico** (Docker, en otro container de tu server):

```bash
docker run -d --name searxng -p 8888:8080 \
  -e SEARXNG_SECRET=poné-algo-random \
  -v $PWD/searxng-data:/searxng-data \
  searxng/searxng
```

Después habilitá el formato JSON en `searxng-data/settings.yml`:

```yaml
search:
  formats:
    - json
```

Y para que Umbral pueda hacer requests desde el server sin que SearXNG lo rechace (cross-origin), configurá `SEARXNG_RECAPTCHA=disabled` o un allowed-domains adecuado.

**Integración con Umbral**: hoy Umbral no tiene un campo dedicado para SearXNG, pero podés usar el truco del **preset IA "Custom / Otro"** apuntando a la instance:

- En **Admin → IA → Preset**: elegí "Custom / Otro"
- En **Base URL**: `http://tu-servidor:8888/search?format=json&q=...` (el endpoint de SearXNG con JSON)
- Esto no va a funcionar 100% porque el formato de Tavily/OpenAI es distinto al de SearXNG, pero es un workaround para setups rápidos.

**Para integración limpia**: abrí un issue y agregamos un campo `searxngUrl` en la sección de Búsqueda externa. Es 5 líneas en el schema + un input más en el form.

## Por qué no scrapeo servicios internos

El scrape directo del sitio sólo funciona bien con HTML público y bien formado (og:title, og:description, og:image). Servicios internos típicos:

| Servicio | Qué pasa con el scrape |
|---|---|
| 1Panel, Portainer, Grafana, etc. en `http://10.x.x.x:puerto` | El server puede llegar a la IP, pero la página es un login sin meta tags |
| 1Panel con dominio público | Si el user tiene HTML público con og:tags, anda |
| Servicios sin DNS / sólo accesibles desde la LAN | Funciona si el server está en la misma LAN |

Por eso el fallback a búsqueda externa: si sabés el nombre del servicio ("Mongo Express", "1Panel", "Grafana"), la IA/búsqueda te trae info de Wikipedia/Brave sin necesidad de scrapear nada.

## Privacidad y rate limits

- **Brave / Tavily**: la única data que se manda es el **nombre del servicio** (no la URL completa, no el HTML scrapeado). Es lo mismo que buscar "Mongo Express" en Google.
- **Wikipedia / DuckDuckGo**: la query es el nombre. Sin tracking de IP en el server (Wikipedia devuelve CORS, DDG no requiere key).
- **Rate limits**: cada card que autocompletás es 1 request a la API que termine usando. Con el tier gratis de Brave (2000/mes) o Tavily (1000/mes), llegás sobrado para uso humano (1-5 auto-completados por día).

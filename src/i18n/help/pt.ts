import type { HelpCatalog } from './es.ts';

export const helpPt = {
  "session.ttlHours": {
    title: "Duração da sessão (horas)",
    short: "Quanto tempo o cookie de sessão permanece válido antes de pedir login novamente.",
    body: "O cookie de sessão é renovado a cada request. Depois desse tempo de inatividade, o admin precisa digitar a senha de novo.\n\n**Default 24h** é o sweet spot entre segurança e usabilidade. Se o seu Umbral estiver exposto à internet, reduza para 1-4h. Se for só para você na LAN, pode subir para 168h (1 semana) sem problemas.",
  },
  "session.cookieSameSite": {
    title: "Cookie SameSite",
    short: "Como o cookie se comporta com links cross-site.",
    body: "**Lax (default)**: o cookie é enviado em navegações top-level (clique em um link), mas NÃO com iframes/img/POST cross-site. Bom equilíbrio.\n\n**Strict**: o cookie NUNCA é enviado em contexto cross-site. Mais seguro, mas quebra links de outras apps (ex.: Mattermost manda você ao portal e a sessão não é reconhecida).\n\n**None**: o cookie é enviado em todos os contextos. REQUER o flag Secure. Só use se souber o que está fazendo.",
  },
  "session.cookieSecure": {
    title: "Cookie Secure flag",
    short: "Se o cookie só trafega sobre HTTPS.",
    body: "**Auto (recomendado)**: o cookie leva o flag Secure só se o request for HTTPS. Se detectar HTTPS, endurece; se não, deixa funcionar em HTTP para não travar no dev.\n\n**Always**: sempre leva Secure. Use se tiver TLS terminado em um proxy e o cliente SEMPRE chegar por HTTPS.\n\n**Never**: nunca leva Secure. O cookie trafega em HTTP em texto claro. NÃO recomendado, salvo em LAN 100% isolada.",
  },
  "session.rotateCsrfOnLogin": {
    title: "Rotacionar CSRF a cada login",
    short: "Se o token CSRF muda cada vez que alguém inicia sessão.",
    body: "Ativado: cada login gera um CSRF token novo. Se alguém tinha uma aba aberta com um CSRF antigo, essa aba fica invalidada.\n\n**Por que importa**: se um atacante roubar o CSRF token (XSS, log compartilhado) e você mudar a senha sem rotacionar CSRF, o atacante ainda consegue fazer requests mutantes até a sessão expirar.\n\n**Default false** porque rotacionar CSRF a cada login obriga o admin a atualizar o browser depois do login. É uma melhoria de segurança menor versus a fricção que adiciona.",
  },
  "auth.minPasswordLength": {
    title: "Tamanho mínimo da senha",
    short: "Caracteres mínimos ao alterar a senha.",
    body: "0 (default) = sem mínimo. Aceita senhas curtas por compatibilidade com configs antigas.\n\nSuba para 8-12 em produção. Mais de 16 não agrega muito (versus passphrase longa).",
  },
  "auth.rateLimitMax": {
    title: "Rate limit (tentativas)",
    short: "Quantidade máxima de tentativas de login na janela de tempo.",
    body: "Se alguém atingir o limite, o endpoint /api/login devolve 429 até passar a janela.\n\n**Default 30 / 60s** = suficiente para você errar várias vezes, mas um brute force é barrado rápido. Se for expor o Umbral à internet, reduza para 5-10.",
  },
  "auth.rateLimitWindowSec": {
    title: "Rate limit (janela em segundos)",
    short: "Em quantos segundos o contador de tentativas é resetado.",
    body: "Funciona junto com rateLimitMax. Default 60s. Se baixar Max para 5, também baixe Window para 60s — senão bloqueia o usuário real.\n\nSe quiser ser bem rigoroso: 3 tentativas / 5min. Se se bloquear, espere 5min ou reinicie o container (não persiste em disco).",
  },
  "auth.csrfPolicy": {
    title: "Política CSRF",
    short: "Quando o token CSRF é exigido.",
    body: "**Mutations (default)**: POST/PUT/DELETE/PATCH exigem CSRF. GET não. É o correto em 99% dos casos.\n\n**All**: os GET também exigem CSRF. Paranoia máxima. Raramente necessário.\n\n**None**: não verifica CSRF. **NÃO recomendado**, salvo em LAN 100% isolada e se souber o que está fazendo. Um atacante que fizer você clicar em um link poderia alterar sua config.",
  },
  "uploads.maxBytesLogo": {
    title: "Tamanho máx. do logo",
    short: "Bytes máximos do logo (header da capa).",
    body: "Default 1 MB. É para o logo do header, não precisa de mais. Se subir um SVG pesa alguns KB e reprocessa com sharp do mesmo jeito (sharp rasteriza).",
  },
  "uploads.maxBytesFavicon": {
    title: "Tamanho máx. do favicon",
    short: "Bytes máximos do favicon (.ico/.png).",
    body: "Default 256 KB. Um favicon 32x32 pesa <5KB; esse limite é generoso para ICOs animados ou multi-resolução.",
  },
  "uploads.maxBytesIcon": {
    title: "Tamanho máx. do ícone do card",
    short: "Bytes máximos da imagem de cada card.",
    body: "Default 512 KB. As imagens dos cards são re-encodadas para WebP/AVIF em tamanhos razoáveis. Se quiser ícones SVG leves, mantenha esse valor.",
  },
  "uploads.maxBytesBackground": {
    title: "Tamanho máx. do fundo",
    short: "Bytes máximos da imagem de fundo.",
    body: "Default 5 MB. É a única imagem grande do sistema. Otimizamos com sharp ao servir, mas a memória do server ainda precisa carregá-la.",
  },
  "uploads.allowedMimeTypes": {
    title: "MIME types permitidos",
    short: "Lista de tipos de arquivo que podem ser enviados.",
    body: "Whitelist separada por vírgulas. Default: png, jpeg, webp, svg, gif.\n\n**Importante**: só são permitidos tipos `image/*`. Não adicione `text/html`, `application/javascript`, etc. — o Umbral não é um hosting de arquivos; adicionar um MIME executável é vetor de XSS se alguém encontrar forma de servi-lo.\n\nSe quiser ser rigoroso, remova `image/svg+xml` (SVGs podem conter JS). O toggle `Permitir SVG` abaixo é a forma fácil de fazer isso.",
  },
  "uploads.allowSvg": {
    title: "Permitir upload de SVGs",
    short: "Se arquivos SVG podem ser enviados.",
    body: "SVGs são vetores, pesam pouco, ideais para logos/ícones. MAS podem conter JavaScript embutido que executa no browser.\n\n**Se ativar isso**, o Umbral sanitiza o SVG com DOMPurify antes de servir (se sanitizeSvg estiver ativo). A sanitização remove scripts, eventos e elementos perigosos.",
  },
  "uploads.sanitizeSvg": {
    title: "Sanitizar SVG com DOMPurify",
    short: "Passa os SVGs enviados pelo DOMPurify antes de servi-los.",
    body: "DOMPurify parseia o SVG como HTML e remove:\n- Tags `<script>`, `<foreignObject>`\n- Atributos `on*`, `href=\"javascript:...\"`, `xlink:href=\"javascript:...\"`\n- `<iframe>`, `<embed>`, `<object>`\n\nDefault ativado. Se desativar e permitir SVG, qualquer SVG malicioso é servido como está. NÃO recomendado.",
  },
  "uploads.processImages": {
    title: "Processar imagens com sharp",
    short: "Re-encoda as imagens enviadas para WebP/AVIF ao servi-las.",
    body: "Ativado: quando um usuário pede a imagem, sharp re-encoda on-the-fly para o formato mais eficiente do browser. 50-80% menos bandwidth.\n\nDesativado: servimos a imagem original. Útil se tiver problemas de CPU ou memória com sharp (raro em hardware moderno).",
  },
  "network.trustForwardedFor": {
    title: "Confiar em X-Forwarded-For",
    short: "Se usa o header X-Forwarded-For para rate limit por IP.",
    body: "**SÓ ative se tiver um reverse proxy (nginx, Caddy, Traefik) na frente que saneia e SOBRESCREVE X-Forwarded-For**.\n\nSe ativar sem proxy, qualquer cliente pode mandar `X-Forwarded-For: 1.2.3.4` e burlar o rate limit.\n\n**Detecção de \"tenho proxy\"**: o Umbral olha o header da request direto. Se vir o IP da sua rede local nos logs, NÃO tem proxy / está mal configurado.",
  },
  "network.trustedProxies": {
    title: "Proxies confiáveis",
    short: "IPs/CIDRs dos seus reverse proxies (informativo).",
    body: "Hoje é informativo, não funcional. Serve de documentação para você ou sua equipe sobre quando o trust foi configurado.\n\nFormato: um IP ou CIDR por linha. Ex.: `10.0.0.1` ou `192.168.1.0/24`.",
  },
  "network.cookieDomain": {
    title: "Cookie domain",
    short: "Para qual domínio o cookie de sessão é emitido.",
    body: "Vazio (default) = o cookie é emitido para o hostname da request. Funciona em 99% dos casos.\n\nCom prefixo ponto (`.example.com`): o cookie vale para `example.com` E todos os subdomínios. Útil se quiser compartilhar sessão entre `portal.example.com` e `docs.example.com`.",
  },
  "network.allowInternalHosts": {
    title: "Permitir hosts internos no health check",
    short: "Se o health check pode acessar IPs privados (10/8, 192.168/16, etc.).",
    body: "O health check faz HEAD requests às URLs dos cards para mostrar dot verde/vermelho. Se seus cards são serviços internos (1Panel em `http://10.155.49.240:39611/`, Excalidraw em outro container, etc.) esse toggle DEVE estar ativado.\n\n**Default true** porque o Umbral é um portal interno — o caso de uso principal é monitorar seus próprios serviços.\n\n**Quando desativar**: se expuser o Umbral à internet. A guard SSRF bloqueia `169.254.169.254` (cloud metadata) SEMPRE, independente desse toggle.",
  },
  "headers.csp": {
    title: "Content-Security-Policy",
    short: "Quais recursos o browser pode carregar.",
    body: "O default inclui:\n- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — Alpine.js 3 precisa de `'unsafe-eval'` para expressões dinâmicas\n- `img-src 'self' data: https:` — permite favicons externos e data: URIs\n- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — fonte Inter do Google\n- `frame-ancestors 'none'` — anti clickjacking\n\n**Vazio = o header CSP não é enviado** (modo permissivo, útil para debug).\n\nPara endurecer: leia https://web.dev/articles/strict-csp. É trabalhoso porque Alpine 3 quebra com `script-src 'self'` puro.",
  },
  "headers.xFrameOptions": {
    title: "X-Frame-Options",
    short: "Se a página pode ser embutida em um iframe.",
    body: "**DENY (default)**: ninguém pode embutir o Umbral em um iframe. Anti clickjacking total.\n\n**SAMEORIGIN**: só é permitido embutir a partir da mesma origem.\n\n**NONE**: permite embutir de qualquer lugar. NÃO recomendado.",
  },
  "headers.referrerPolicy": {
    title: "Referrer-Policy",
    short: "Quanta info vai no header Referer ao navegar para fora.",
    body: "**no-referrer (default)**: não envia nada. Máxima privacidade.\n\n**same-origin**: só envia referrer a links internos.\n\n**strict-origin-when-cross-origin**: envia a origem (não o path) a links cross-origin HTTPS, nada para HTTP.\n\n**no-referrer-when-downgrade**: envia referrer completo para HTTPS, nada ao descer para HTTP. Default histórico dos browsers.",
  },
  "headers.permissionsPolicy": {
    title: "Permissions-Policy",
    short: "Quais features do browser a página pode usar (câmera, mic, geo, etc.).",
    body: "Default desabilita câmera, microfone e geolocalização. Se quiser ser mais rigoroso, adicione `payment=(), usb=(), magnetometer=()`, etc.\n\nFormato: lista de diretivas separadas por vírgula. `feature=()` = bloquear, `feature=(self)` = permitir mesma origem, `feature=(self \"https://outro.com\")` = permitir origem + outro.",
  },
  "headers.hsts": {
    title: "HSTS mode",
    short: "Como o header Strict-Transport-Security é enviado.",
    body: "**Auto (default)**: ativa só se o request for HTTPS. Em LAN HTTP não faz nada; em produção HTTPS endurece out-of-the-box.\n\n**Always**: força sempre. Útil se seu proxy sempre termina TLS.\n\n**Never**: nunca envia. NÃO recomendado se estiver em HTTPS.\n\n**Cuidado com max-age**: quando um browser viu `max-age=31536000`, lembra por um ano. Se depois remover HTTPS, os browsers NÃO vão conseguir acessar seu site por um ano. Teste primeiro com `max-age=300` (5 min).",
  },
  "headers.hstsMaxAge": {
    title: "HSTS Max-Age",
    short: "Quantos segundos o browser lembra \"só HTTPS para este domínio\".",
    body: "Default 31536000 (1 ano) — o sweet spot segundo RFC 6797.\n\n**Antes de subir para produção**: teste com 300 (5 min) um tempo. Se tudo ok, suba para 3600 (1h), depois 86400 (1 dia), e só então 1 ano. Isso dá tempo de rollback se quebrar algo.\n\n0 desativa HSTS mesmo se Modo estiver em 'auto' ou 'always'.",
  },
  "headers.hstsIncludeSubDomains": {
    title: "HSTS includeSubDomains",
    short: "Se a regra HSTS vale para subdomínios também.",
    body: "**Ative SÓ se TODOS os subdomínios forem HTTPS**. Se tiver `foo.example.com` em HTTP, um browser que viu `includeSubDomains` não vai conseguir carregá-lo por um ano.\n\nDefault false por segurança. Se seu domínio inteiro for HTTPS, ative e esqueça.",
  },
  "headers.hstsPreload": {
    title: "HSTS preload",
    short: "Se quer enviar o domínio para a lista hardcoded do Chrome/Firefox/Safari.",
    body: "Se ativar e for a https://hstspreload.org, Chrome/Firefox/Safari hardcodam seu domínio nos binários como \"sempre HTTPS, sempre includeSubDomains\". É **permanente e muito difícil de reverter**.\n\n**Requisito**: includeSubDomains=true, max-age >= 31536000, e TODOS os subdomínios HTTPS. Por default o Umbral não força isso — fica na sua decisão.",
  },
  "theme.groupLayout": {
    title: "Layout de grupos",
    short: "Vertical (empilhado) ou horizontal (colunas lado a lado).",
    body: "**Vertical (default)**: categorias empilhadas uma abaixo da outra. Mais natural para poucas categorias com muitos cards.\n\n**Horizontal**: categorias em colunas lado a lado. Útil com 4+ categorias e poucos cards cada. No mobile continua empilhado.",
  },
  "theme.showClock": {
    title: "Mostrar relógio",
    short: "Relógio HH:MM:SS ao vivo no header.",
    body: "Atualiza a cada segundo, usa a hora do browser do usuário. Não consome nada do server. Útil para portais tipo kiosk ou workstations sempre ligadas.",
  },
  "theme.showRefresh": {
    title: "Mostrar botão de refresh",
    short: "Botão no header que recarrega a config sem recarregar a página.",
    body: "Mais rápido que F5 e mantém scroll/state do browser. Busca a config do server e atualiza os assets. Útil se tiver scripts externos que alteram a config e quer refletir mudanças sem recarregar tudo.",
  },
  "theme.showStatusBar": {
    title: "Mostrar status bar",
    short: "Rodapé com versão do Umbral e última atualização da config.",
    body: "Mostra a versão do package.json e a data de `_meta.updatedAt` da config. Útil para debug (\"o server já tem a config nova?\") e para saber qual versão roda em cada portal da sua frota.",
  },
  "layout.healthCheckInterval": {
    title: "Intervalo de health check (segundos)",
    short: "A cada quantos segundos testar de novo as URLs marcadas.",
    body: "Default 60s. Mínimo 10s (evita martelar o server com muitos cards ativos). Máximo 1h.\n\nSe tiver muitos cards e notar lag, suba para 120-300. Se precisar de detecção rápida de queda, baixe para 30.",
  },
  "ai.systemPrompt": {
    title: "System prompt do assistente IA",
    short: "As instruções de sistema que a IA recebe.",
    body: "Aqui você define a \"personalidade\" do assistente. Se deixar vazio, o Umbral usa um default em português brasileiro otimizado para melhorar títulos/descrições de cards.\n\nModifique se quiser que a IA:\n- Escreva em outro idioma ou tom (mais formal, mais técnico, etc.)\n- Coloque limites diferentes (ex.: \"máximo 80 chars no título\")\n- Devolva a resposta em outro formato (markdown, lista, etc.)\n\n**Não validamos o que colocar aqui** — é texto livre que vai direto ao provider.",
  },
  "ai.apiKey": {
    title: "API Key do provider IA",
    short: "Sua chave de API do provider escolhido.",
    body: "**É salva em `data/config.json` em texto plano.** Não usamos vault, encryption, nem nada. Trade-off documentado: a alternativa é pedir ao usuário que carregue a key a cada request, o que é fricção enorme para algo usado em cada melhoria.\n\n**Mitigações**:\n1. `data/` deveria estar em um volume com permissões restritivas\n2. Se expuser o Umbral à internet, coloque um reverse proxy com auth na frente de /admin\n3. Se comprometerem, rotacione a key no provider (são 30 segundos no painel)\n\nPara Ollama/LM Studio local não precisa — coloque \"ollama\" ou deixe vazio.",
  },
  "ai.preset": {
    title: "Preset de provider IA",
    short: "Escolha um provider popular para autocompletar baseUrl e modelo.",
    body: "Escolher um preset preenche automaticamente Base URL e Modelo com valores oficiais (verificados contra a doc de cada provider na data do commit).\n\nDepois pode editar qualquer um manualmente — se deixar de bater com o preset, o dropdown volta automaticamente para \"Custom / Outro\".\n\n**Custom** é para proxies internos, gateways privados ou providers novos fora da lista. Coloque a URL manualmente e pronto.",
  },
  "ai.model": {
    title: "Modelo do provider",
    short: "Qual modelo específico usar (ex.: gpt-4o-mini, claude-sonnet-4-5).",
    body: "O nome exato que o provider espera no parâmetro `model` da request.\n\nAlguns providers (OpenAI, Google) aceitam aliases que sempre resolvem para a última versão (ex.: `gpt-4o-latest`, `gemini-2.0-flash`). Outros (Anthropic, Mistral) exigem o nome completo.\n\n**Para Ollama / LM Studio local**: o modelo é o que baixou com `ollama pull` ou carregou na GUI. Cole o nome exato.",
  },
  "ai.language": {
    title: "Idioma da IA",
    short: "Em qual idioma a IA escreve ao melhorar um card.",
    body: "Default **Português (brasileiro)** — o tom que os usuários veem na UI do Umbral. Se seus serviços e usuários forem em outro idioma, mude aqui.\n\n**Idiomas suportados**: Castellano, English, Português (brasileiro), Français, Deutsch, Italiano.\n\n**Como é usado**: ao clicar em \"Melhorar com IA\" e `systemPrompt` vazio, o server injeta o template do idioma escolhido como system prompt. A IA recebe instrução de escrever title/description nesse idioma.\n\n**Não afeta** conteúdo que você já escreveu. Se o card já tem texto e a IA só polir, mantém o idioma original — `language` só vale quando a IA gera do zero.\n\n**Override manual**: para tom ou idioma custom, preencha `System prompt` manualmente e o template é ignorado.",
  },
  "branding.companyName": {
    title: "Nome da empresa / equipe",
    short: "Aparece no header, title da página e mensagens.",
    body: "Texto plano, até 80 chars. Usado em:\n- O title da aba do browser (`<title>`)\n- O header da capa (se não houver logo)\n- O subject de emails de auditoria\n- Mensagens do sistema (\"Bem-vindo a {companyName}\")\n\n**Dica**: coloque o nome canônico da equipe ou projeto, não \"Minha Empresa\" — fica feio nos logs.",
  },
  "branding.logo": {
    title: "Logo do header",
    short: "Imagem que aparece no canto superior esquerdo da capa.",
    body: "Envie pelo tab Assets e escolha aqui. Formatos: PNG, JPEG, WebP, SVG, GIF.\n\n**Tamanho recomendado**: 200-400px de largura, 40-80px de altura. O header escala com CSS `max-height`. Logos maiores ficam pixelados em telas retina.\n\nSe não colocar logo, mostra o `companyName` como texto.",
  },
  "branding.favicon": {
    title: "Favicon",
    short: "O ícone pequeno que aparece na aba do browser.",
    body: "32×32 ou 16×16 PNG, idealmente. ICO também funciona. SVG é suportado em browsers modernos.\n\nSe não colocar favicon, browsers mostram um quadrado branco ou ícone genérico — fica pouco profissional.",
  },
  "theme.background.type": {
    title: "Tipo de fundo",
    short: "Se o fundo é cor sólida, gradiente CSS ou imagem.",
    body: "**Gradiente / Cor CSS** (default): valor CSS livre. Exemplos: `#0f172a` (azul escuro), `linear-gradient(135deg, #0f172a, #1e3a8a)`, `radial-gradient(circle, #1e3a8a, #0f172a)`.\n\n**Cor sólida**: hex sem gradiente. Mais simples, render mais rápido.\n\n**Imagem**: imagem enviada. Útil para dashboards com branding forte (foto do escritório, gráfico de fundo). Blur e overlay abaixo suavizam para os cards ficarem legíveis.",
  },
  "theme.background.value": {
    title: "Valor do fundo",
    short: "O CSS (gradiente/cor) ou URL da imagem, conforme o tipo.",
    body: "Se tipo for **gradiente/cor**: qualquer CSS válido. O sistema sanitiza com regex para bloquear injeções.\n\nSe tipo for **imagem**: escolha no dropdown de Assets (só aparecem PNG/JPG/WebP enviados).\n\n**Atalhos úteis**:\n- `#0a0a0a` — preto quase puro (modo escuro)\n- `#f8fafc` — quase branco (modo claro)\n- `linear-gradient(135deg, #1e293b, #0f172a)` — gradiente azul escuro clássico\n- `linear-gradient(135deg, #fef3c7, #fde68a)` — gradiente quente amarelo",
  },
  "theme.background.blur": {
    title: "Blur do fundo",
    short: "Quanto desfocar a imagem/cor de fundo (0-40px).",
    body: "Útil só com imagem de fundo para suavizar e os cards ficarem legíveis. Com gradientes/cor não faz diferença visível.\n\n**Regra**: 0 para imagens nítidas (logos, fotos hero), 10-20 para decorativas, 30+ para imagens que atrapalham muito.",
  },
  "theme.background.overlay": {
    title: "Overlay opacity",
    short: "Camada escura/semi-transparente sobre o fundo (0-1).",
    body: "Adiciona um tinte (cor configurada abaixo) sobre o fundo. Garante contraste com o texto dos cards sem editar a imagem.\n\n**0**: sem overlay (a imagem manda)\n**0.3-0.5**: sutil, deixa ver a imagem\n**0.7+**: quase opaco, prioriza legibilidade\n\nCom gradientes/cor o overlay quase não aparece.",
  },
  "theme.background.overlayColor": {
    title: "Cor do overlay",
    short: "Cor da camada de overlay (default preto).",
    body: "Default preto (#000000) para escurecer. Branco (#ffffff) para clarear imagem escura. Qualquer hex funciona.",
  },
  "theme.accentColor": {
    title: "Cor de destaque",
    short: "Cor de highlight (seleção, links, hover).",
    body: "Usada para:\n- Cor do dot de health check quando o card está OK\n- Border/background dos itens selecionados no admin\n- Hover states em links\n- Borda do input em foco\n\n**Dica**: accent contrastante sem ser estridente. `#60a5fa` (azul céu) é o default porque funciona com fundos claros e escuros.",
  },
  "theme.textColor": {
    title: "Cor do texto",
    short: "Cor principal do texto na capa.",
    body: "Default `#f1f5f9` (quase branco). Mude se o fundo for claro (`#0f172a` para azul escuro, `#1e293b` para cinza escuro).\n\nGaranta contraste suficiente com o fundo (WCAG AA = ratio 4.5:1 para texto normal).",
  },
  "theme.cardStyle": {
    title: "Estilo do card",
    short: "Glass (blur), flat ou outlined.",
    body: "**Glass** (default): cards semi-transparentes com blur do fundo. Fica bonito com gradientes, mas pode consumir CPU em dispositivos antigos.\n\n**Flat**: cards opacas, cor sólida. Mais rápido, mais legível, menos \"luxuoso\".\n\n**Outlined**: cards transparentes com borda. Equilíbrio entre os dois.",
  },
  "theme.fontFamily": {
    title: "Tipografia",
    short: "Qual fonte usar em todo o portal.",
    body: "Lista curada de Google Fonts + `system-ui` (a do SO do usuário). Cada opção carrega seu CSS do Google Fonts automaticamente.\n\n**`system-ui`** não carrega nada do Google — usa a fonte do sistema. Mais rápido e respeita preferências do usuário.\n\nSe precisar de fonte custom (da sua marca), vá em Hardening → Headers de segurança e edite `fontUrl` — mas o schema valida que venha de fonts.googleapis.com.",
  },
  "theme.colorMode": {
    title: "Modo de cor",
    short: "Auto, escuro ou claro.",
    body: "**Auto** (default): o portal escolhe light/dark conforme `theme.autoStrategy`:\n- **system** (default): `prefers-color-scheme` do navegador/OS.\n- **schedule**: claro entre 7 e 19, escuro no resto.\n\n**Escuro** / **Claro**: força o modo. Útil para look consistente.\n\nPode ocultar o toggle da capa com `theme.showModeToggle`. O override do usuário persiste em `localStorage`.",
  },
  "layout.columnsDesktop": {
    title: "Colunas no desktop",
    short: "Quantos cards por linha em telas grandes.",
    body: "Default 4. Faixas:\n- **2-3**: poucos cards, um por serviço importante\n- **4-6**: sweet spot para portais típicos\n- **7-8**: exige cards pequenos, só com muitos\n\nVeja a prévia abaixo do form para ver como fica.",
  },
  "layout.columnsTablet": {
    title: "Colunas no tablet",
    short: "Quantos cards por linha em tablets (entre 768px e 1024px).",
    body: "Default 3. Use 2 se tiver cards com descrições longas.",
  },
  "layout.columnsMobile": {
    title: "Colunas no mobile",
    short: "Quantos cards por linha em celulares.",
    body: "Default 2. Coloque 1 se os cards forem grandes ou com muito texto.",
  },
  "layout.cardSize": {
    title: "Tamanho do card",
    short: "Pequeno, médio ou grande.",
    body: "Define padding e densidade do card.\n\n**Pequeno**: mais cards visíveis, menos detalhe.\n**Médio** (default): equilíbrio.\n**Grande**: cards com mais respiro, melhor para poucos serviços importantes.",
  },
  "layout.showDescriptions": {
    title: "Mostrar descrições",
    short: "Se mostra o texto abaixo do título de cada card.",
    body: "Se desativar, os cards mostram só título + ícone. Útil com muitos cards e pouco espaço, ou quando o usuário já sabe o que é cada serviço.",
  },
  "card.title": {
    title: "Título do card",
    short: "O texto principal visível no card.",
    body: "Máximo 80 chars. Aparece em negrito no card.\n\n**Dica**: se for usar \"Melhorar com IA\" depois, coloque um título rough (\"1Panel\", \"Hermes\") e deixe a IA polir com system prompt custom.",
  },
  "card.kind": {
    title: "Tipo de card",
    short: "Link (clicável) ou Note (informativo, sem link).",
    body: "**Link** (default): o card é clicável e leva à URL. A URL é obrigatória.\n\n**Note**: o card NÃO é clicável. Serve para dicas, avisos, info fixa da equipe (\"Próxima reunião: quinta 14h\"), lembretes. A URL fica opcional e pode ter link de referência.\n\nMudar um card existente para \"Note\" oculta como link e mostra como caixa de texto.",
  },
  "card.url": {
    title: "URL do card",
    short: "Para onde vai ao clicar (só tipo \"link\").",
    body: "Aceita:\n- `https://servidor:porta/path` — serviço interno ou externo\n- `/docs`, `/admin` — rotas internas do Umbral\n- `http://10.x.x.x:port` — IPs privadas (health check funciona com `allowInternalHosts=true`)\n\n**O sistema normaliza automaticamente**:\n- Remove whitespace/newlines do início e fim\n- Se não tiver esquema (`http://`/`https://`) e não for path interno, prepende `http://`\n- Se começar com `//`, prepende `http:`\n\n**Não é permitido**: `javascript:`, `data:`, `vbscript:`, nem nada que não seja http/https/path.",
  },
  "card.description": {
    title: "Descrição do card",
    short: "Texto abaixo do título. Plain: 200 chars. Markdown (opt-in): 1000 chars.",
    body: "Aparece abaixo do título no card. Útil para esclarecer o serviço ou dar contexto (\"Backup semanal segunda 3AM\", \"Peça acesso em #infra no Slack\").\n\n**Plain (default)**: 200 chars. Texto plano, escapado por segurança. Nada é interpretado.\n\n**Markdown (opt-in)**: 1000 chars. Se a feature `features.markdown` estiver ativa, aparece toggle \"Markdown\" no form. O preview renderiza com a mesma lib (`marked` + `DOMPurify`) do server — WYSIWYG.\n\nMarkdown suportado (GitHub-flavored, GFM): listas, links, **negrito**, `código`, ```blocos```, tabelas, blockquotes, line breaks. Tags HTML permitidas: `a, b, i, em, strong, p, br, ul, ol, li, h1-6, blockquote, code, pre, span, div, img, table` (qualquer outra é escapada). Atributos: `href, title, alt, src, class`. `href` com protocolo não-http (ex.: `javascript:`) é bloqueado.\n\n**Se a feature estiver desligada**: o toggle não aparece no form. O server força plain + limite 200 mesmo se alguém mandar `descriptionFormat: \"markdown\"` pela API.\n\nSe deixar vazio, o card fica mais limpo mas perde info útil. Com \"Auto-completar\" ou \"Melhorar com IA\", a IA também polir.",
  },
  "card.pinned": {
    title: "Card fixado (pinned)",
    short: "Aparece no topo da categoria, independente da ordem.",
    body: "Cards **fixados** renderizam primeiro na categoria, independente do campo `order`. Útil para destacar serviços críticos (VPN, status page, monitor) que você quer que o usuário veja primeiro sem reordenar manualmente.\n\n**Como se prioriza**:\n1. Pinned primeiro (entre pinned, mantém ordem por `order`).\n2. Depois, o resto por `order` ASC.\n\n**Quando NÃO fixar**:\n- Se quiser que o card fique primeiro SÓ para você (admin) e não visitantes, ainda não há flag por usuário — fixar afeta todos.\n- Se quiser ordem estável entre muitos cards, melhor usar `order` numérico.\n\n**Se a feature estiver desligada**: o checkbox não aparece no form. O server força `pinned: false` em qualquer card que mande `pinned: true` pela API.",
  },
  "card.tags": {
    title: "Tags do card",
    short: "Etiquetas kebab-case transversais. Máx. 10 por card.",
    body: "Tags são **transversais**: complementam a categoria com dimensões alternativas (ex.: \"urgent\", \"frontend\", \"legacy\", \"migrar-logo\"). Um card pode ter tags de várias dimensões sem mudar de categoria.\n\n**Formato**: kebab-case lowercase (a-z, 0-9, hífens), máx. 30 chars por tag, máx. 10 tags por card. Exemplos válidos: `api`, `backend-go`, `legacy-v1`, `urgent`.\n\n**Como são usadas**:\n- Busca: o input acima da capa casa texto do card E tags. Digite \"urgent\" e aparecem todos os cards com essa tag.\n- Filtragem futura: a UI pode ter pill-row \"filtrar por tag\" (não incluído nesta onda — só busca).\n- Organização visual: na lista de cards do admin, tags aparecem como chips ao lado da URL.\n\n**Quando NÃO usar tags**: se tiver dimensão com 5+ valores para filtrar visualmente, melhor subcategoria (`isSubpage: true`). Tags são info complementar, não agrupamento de navegação.\n\n**Se a feature estiver desligada**: o campo não aparece no form e o server descarta qualquer `tags[]` no JSON ao salvar. Defense-in-depth: mesmo bypassando o cliente pela API, tags não persistem se a feature não estiver ativa.",
  },
  "card.category": {
    title: "Categoria",
    short: "A qual grupo pertence o card (Comunicação, Produtividade, etc.).",
    body: "Categorias são criadas no tab \"Categorias\" do admin. Cada card precisa estar em uma. Se excluir uma categoria, cards que estavam nela vão automaticamente para a primeira restante.",
  },
  "card.color": {
    title: "Cor do card",
    short: "Cor de destaque do ícone e do dot de health check.",
    body: "Não é cor de fundo — é cor do ícone/dot. Default `#60a5fa` (azul céu).\n\n**Dica**: cores consistentes por categoria. Comunicação em verde, Produtividade em azul, Dev em roxo. Dá identidade visual ao portal.",
  },
  "card.icon": {
    title: "Ícone do card",
    short: "O desenho pequeno ao lado do título.",
    body: "Escolha no picker de ícones (os predefinidos cobrem casos comuns). Se precisar de um custom, abra o painel abaixo e digite nome de ícone Lucide ou URL de asset enviado.\n\n**Nomes Lucide populares** fora do set default: `rocket`, `database`, `server`, `terminal`, `github`, `docker`, etc. Qualquer nome de https://lucide.dev funciona.",
  },
  "card.openInNewTab": {
    title: "Abrir em nova aba",
    short: "Se a URL abre em nova aba ou substitui a atual.",
    body: "Default ativado. Útil para serviços internos onde quer o portal aberto em background.\n\nDesative para links de docs ou URLs \"externas\" que o usuário vai querer fechar sem voltar.",
  },
  "card.enabled": {
    title: "Card ativo",
    short: "Se o card aparece na capa.",
    body: "Desativar = o card fica salvo na config mas NÃO aparece. Útil para:\n- Serviços em manutenção temporária\n- Cards de \"Documentação\" que quer tirar do home\n- Cards sazonais (eventos, campanhas)\n\n**Não é o mesmo que excluir** — o card continua lá, só não renderiza.",
  },
  "card.healthCheck": {
    title: "Health check (dot ao vivo)",
    short: "Ping periódico à URL com dot verde/vermelho conforme resposta.",
    body: "Ativado: o server faz HEAD request à URL a cada `healthCheckInterval` segundos (default 60s). Se responder 2xx, dot verde. Se falhar ou timeout, dot vermelho.\n\n**Custo**: 1 request por card a cada N segundos. Com 10 cards a 60s = 600 req/hora. Pouco, mas com 100 cards considere subir o intervalo.\n\n**Privacidade**: o server faz o request, não o browser. Útil quando o usuário não quer que cada browser acesse a URL.\n\nPara hosts internos (10/8, 192.168/16), o toggle `Permitir hosts internos` em Hardening → Rede precisa estar ativo.",
  },
  "category.name": {
    title: "Nome da categoria",
    short: "Texto exibido como header da seção.",
    body: "O que os usuários veem na capa como título da coluna/seção. Seja descritivo mas curto (\"Comunicação\", \"Produtividade\", \"Dev\", \"Operações\", etc.).\n\nCom só uma ou duas categorias e muitos cards cada, use nomes mais específicos (\"Infraestrutura\", \"Cliente A\", \"Cliente B\").",
  },
  "category.icon": {
    title: "Ícone da categoria",
    short: "Ícone Lucide ao lado do nome.",
    body: "Qualquer nome Lucide (https://lucide.dev). Exemplos: `message-circle`, `briefcase`, `code`, `server`, `globe`, etc.\n\nSe o nome não existir, o sistema usa placeholder genérico. Não quebra nada.",
  },
  "category.order": {
    title: "Ordenar categorias",
    short: "Arraste as linhas para definir a ordem na capa.",
    body: "Cada linha tem handle `⋮⋮` à esquerda. Segure e arraste para reordenar. A ordem definida aqui é a ordem das seções/colunas na capa (visível aos usuários).\n\n**Dicas:**\n- O id (kebab-case) NÃO muda ao reordenar — só a posição na lista.\n- Cards dentro de cada categoria mantêm ordem própria (definida no tab Cards).\n- A mudança persiste ao clicar \"Salvar alterações\" no canto superior direito.\n- Se uma categoria ficar vazia (sem cards ativos), não aparece na capa — mas continua contando na ordem quando adicionar cards.",
  },
  "category.lock": {
    title: "Bloqueio com senha da categoria",
    short: "Oculta os cards da categoria até o usuário digitar a senha.",
    body: "Ao ativar bloqueio com senha em uma categoria:\n- Na capa (homepage) ou subpágina aparece o título, mas cards/links ficam ocultos.\n- Mostra caixa pedindo senha para desbloquear.\n- Com senha correta, cards aparecem na hora e o desbloqueio vale na sessão do browser.\n- Cards protegidos não aparecem na busca rápida até desbloquear a categoria.",
  },
  "category.subpage": {
    title: "Subpágina independente",
    short: "Transforma a categoria em página dedicada acessível só pela URL.",
    body: "Ao marcar **Subpágina independente**:\n- **NÃO aparece na capa principal (`/`)**.\n- Usuários acessam só pela URL direta: `/{id_categoria}` (ex.: `/teste`).\n- Com bloqueio por senha, pede a chave na subpágina antes dos links.\n- Ideal para seções privadas, departamentos internos, links secundários ou portais restritos.",
  },
  "assets.upload": {
    title: "Enviar assets",
    short: "Logos, favicons, ícones de card, fundos.",
    body: "**Tipos permitidos** (configurável em Hardening → Uploads): PNG, JPEG, WebP, SVG, GIF.\n\n**Limites por tipo**:\n- Logo: 1 MB\n- Favicon: 256 KB\n- Ícone de card: 512 KB\n- Fundo: 5 MB\n\n**Por que esses limites**: browsers baixam as imagens a cada carga do portal. Logo de 5 MB é desnecessário e mata o LCP.\n\nSVGs são sanitizados com DOMPurify antes de servir (se `Permitir SVG` estiver ativo). Isso previne XSS via SVG malicioso.",
  },
  "status.check": {
    title: "Status dos cards",
    short: "Ping HEAD a cada URL marcada com health check.",
    body: "O server faz HEAD request a cada URL de cards com `healthCheck=true`. Retorna:\n- **Verde** (2xx-3xx): URL responde OK\n- **Vermelho** (4xx-5xx, fetch failed, timeout): algo errado\n- **\"URL inválida\"**: URL do card não parseia como http(s) ou path\n\n**Não é monitor production-grade**: não checa conteúdo, não alerta, não guarda histórico. É \"está vivo ou não\" superficial.\n\nPara hosts internos (10/8, 192.168/16, docker compose local), o toggle `Permitir hosts internos` em Hardening → Rede precisa estar ativo.",
  },
  "advanced.export": {
    title: "Exportar configuração",
    short: "Baixar o config.json atual para sua máquina.",
    body: "Útil para:\n- Backup antes de mudança grande\n- Migrar para outro server (copie data/ + importe a config)\n- Versionar a config no git (NÃO recomendado por causa do apiKey, mas branding/layout sim)\n- Compartilhar config entre portais da mesma org\n\nO arquivo é `data/config.json` exato, com timestamp no nome.",
  },
  "advanced.import": {
    title: "Importar configuração",
    short: "Enviar um config.json e substituir o atual.",
    body: "**SUBSTITUI** a config atual. Não é merge.\n\n**Limite de 1 MB** — config típica pesa 5-50 KB, bem generoso. Se passar, rejeitamos.\n\n**Cuidado**: config importada pode ter apiKey diferente da atual. Se tiver, substitui.\n\nDepois de importar, a página recarrega para aplicar.",
  },
  "advanced.healthcheck": {
    title: "Healthcheck do sistema",
    short: "Verifica se o server está vivo e respondendo.",
    body: "Chama `GET /api/health` (sem auth, público). Retorna:\n- `status: 'ok'` — tudo ok\n- `version` — versão do package.json\n- `uptime` — segundos desde que o server subiu\n\nÚtil para monitor externo (UptimeRobot, Better Uptime, etc.) que quer saber se o portal está vivo sem parsear HTML.\n\nSe o Umbral estiver atrás de reverse proxy, o healthcheck passa pelo proxy. Se vir `status: 'degraded'`, revise os logs.",
  },
  "advanced.reset": {
    title: "Reset para defaults",
    short: "Restaura a configuração aos valores de fábrica.",
    body: "**Coloca TODA a config em defaults**, mas conserva:\n- Sua senha (não desloga)\n- O CSRF token (sessões continuam vivas)\n- Assets enviados (fotos, logos)\n\n**Não conserva**: cards custom, categorias custom, theme custom, apiKey, etc.\n\nPede digitar `RESET` para confirmar — não faz por acidente.",
  },
  "advanced.features": {
    title: "Features (opt-in)",
    short: "Cada feature nova começa desligada. Ative as que precisar.",
    body: "Esta grade lista **todas as features novas** do Umbral. Cada uma é opt-in: default `enabled: false`, então se não ativar, não executa, não carrega dependência, nem aparece na UI.\n\n**Como funciona**:\n- Switch ON → feature habilitada ao salvar (\"Salvar alterações\").\n- Switch OFF → feature desliga. Se tinha dados, ficam em config.json mas inertes; ao voltar ON reaparecem iguais.\n- Cada toggle é logado em audit.log (ex.: `feature_toggle: i18n: false→true`).\n\n**Por que opt-in?** Princípio 7 do roadmap: \"se não usa, não paga\". Features pesadas (qr, oidc, totp2fa) trazem dependências npm só se ativadas.\n\n**O que há hoje?** i18n, markdown, tags, pinned, presets, audit log viewer. O resto (webhooks, métricas, multi-user, multi-portal, etc.) entra nas ondas 2/3/4.\n\nMais detalhe em `/docs` quando cada onda sair.",
  },
  "advanced.metrics": {
    title: "Métricas de latência",
    short: "Sparklines e resumo (avg, p95, max) por card com health-check.",
    body: "**Métricas** registra latência de cada health check em ring buffer em memória (últimas 100 amostras por card, ~1,5h com check a cada 60s). O sparkline SVG renderiza ao lado do dot na capa (só se a feature estiver ativa). O dashboard mostra tabela com avg / p95 / max / último por card.\n\n**Como interpretar**:\n- **Avg**: latência média. Se subir de repente, algo ficou lento.\n- **P95**: percentil 95. Melhor métrica para \"experiência do usuário\" — reflete pior caso realista.\n- **Max**: pico. Se muito alto vs avg, há outliers (cold start, network blip).\n- **Último**: estado do último check (ok/fail + tempo relativo).\n\n**Quando olhar**:\n- Depois de deploy: latência subiu?\n- Serviço lento: p95 ok ou disparou?\n- Antes de reportar \"sistema lento\": dados confirmam ou é percepção?\n\n**Limitações**:\n- Ring buffer em memória: se Umbral reiniciar, perde. Trade-off para evitar I/O a cada check.\n- Sparkline inline (SVG, sem lib). Polilinha simples — gráficos avançados: use `/api/metrics?id=...` em dashboard externo (Grafana com JSON datasource, etc.).\n- Sem persistência em disco nesta versão. Opção `persistToDisk` do schema fica no-op para futuro.\n\n**Se a feature estiver desligada**: seção não aparece no admin, sparklines não renderizam na capa, `/api/metrics` retorna 404. Defense-in-depth: mesmo mandando samples pela API, não registra.",
  },
  "advanced.maintenance": {
    title: "Janelas de manutenção",
    short: "Programa janelas onde cards estão em manutenção. Suprime webhooks health_fail durante a janela.",
    body: "**Janelas de manutenção** são períodos em que espera que um (ou todos) os cards falhem — tipicamente em deploys, migrações de DB, manutenção de infra. Durante a janela, cards afetados:\n\n- Mostram **badge âmbar \"🔧 Manutenção\"** na capa com a razão informada.\n- **NÃO disparam webhooks** de `health_fail` (menos spam no deploy). Health check continua (dots vermelhos na capa), mas o admin já sabe que está falhando.\n- Continuam disparando `health_recover` ao voltar OK. Útil para confirmar que o deploy terminou bem.\n\n**Quando usar**:\n- Deploy de versão nova: janela de 30min sobre todos os serviços.\n- Manutenção de um serviço: janela de 2h sobre 1-2 cards.\n- Migração de DB: janela sobre cards que dependem dessa DB.\n\n**Quando NÃO usar**:\n- Para desabilitar card permanentemente, melhor `enabled: false` no próprio card.\n- Para pausar webhooks sem badge: baixe `cooldownMin` ou desabilite webhook com `enabled: false`.\n\n**Auto-cleanup**: janelas com `endsAt` há mais de 24h no passado ficam \"históricas\" no admin mas NÃO são apagadas automaticamente. Admin decide se apaga (botão ×). Não queremos perder info útil para debug post-mortem.\n\n**Timezone**: timestamps em UTC. UI do admin mostra hora local do browser. Equipe distribuída vê mesma hora UTC no config.json, UI adapta à zona do browser.\n\n**Se a feature estiver desligada**: seção não aparece no admin, render ignora windows (badge não mostra + webhooks não respeitam). Defense-in-depth: mesmo mandando windows no JSON, server descarta o array ao salvar se feature inativa.",
  },
  "advanced.webhooks": {
    title: "Webhooks de notificação",
    short: "Notifica Slack/Discord/ntfy/etc. quando card com health-check muda de estado.",
    body: "Webhooks transformam o Umbral em **centro de notificações ativas**: quando card com `healthCheck: true` muda de healthy para failing (ou vice-versa), Umbral faz POST às URLs configuradas.\n\n**Eventos**:\n- `health_fail`: dispara quando card passa de healthy para failing (após N checks consecutivos falhos, configurável por webhook).\n- `health_recover`: dispara quando card volta a healthy. Confirma que o problema foi resolvido.\n\n**Threshold (minFailures)**: quantos checks consecutivos devem falhar antes de `health_fail`. Default 3. Checks a cada 60s = 3 minutos de falha antes de notificar. Absorve blips transitórios.\n\n**Cooldown**: minutos entre notificações do mesmo webhook. Default 30. Evita spam em altibajos.\n\n**Como montam os payloads**: Umbral manda **sempre JSON cru** com este shape (Slack/Discord podem receber via proxy/adapter, ou endpoint custom que parseie):\n```json\n{\n  \"event\": \"health_fail\",\n  \"card\": { \"id\": \"...\", \"title\": \"...\", \"url\": \"...\" },\n  \"status\": { \"ok\": false, \"code\": 503, \"latencyMs\": 1234 },\n  \"consecutiveFailures\": 3,\n  \"threshold\": 3,\n  \"timestamp\": \"2026-08-19T...\",\n  \"portal\": { \"name\": \"Minha Empresa\" }\n}\n```\nHeaders: `X-Umbral-Event`, `X-Umbral-Card`, `User-Agent: Umbral-Webhook/1.0`.\n\n**Segurança**:\n- SSRF guard ativo: bloqueia loopback (127.0.0.1), private IPs (10/8, 172.16/12, 192.168/16) e cloud metadata. Para serviço interno (Gotify na LAN), ative `security.network.allowInternalHosts` em Hardening.\n- Timeout 8s por webhook (endpoint lento não trava health check).\n- `redirect: 'manual'`: não seguimos redirects — fecha bypass clássico de SSRF por redireção.\n- Header `X-Umbral-Event` permite rotear sem parsear body.\n\n**Estado em memória**: contadores de falha consecutiva e último fire são em memória (não persistem). Após restart, contadores começam em 0. Em deploy longo, após restart espera `minFailures` checks antes do primeiro `health_fail`. Trade-off aceitável para evitar I/O a cada check.\n\n**Testing**: botão \"Testar\" ao lado de cada webhook (ou \"Testar antes de salvar\" no form) manda payload de exemplo. Verifica endpoint antes de esperar falha real.",
  },
  "advanced.audit": {
    title: "Visualizador de audit log",
    short: "Lê data/audit.log no browser com filtros.",
    body: "**Lê as últimas N entradas** de `data/audit.log` e mostra em tabela com scroll virtual. Cada linha é um evento (timestamp + ação + detalhe).\n\n**Filtros disponíveis**:\n- **Ação**: dropdown com ações distintas no log (ex.: `config_update`, `login_ok`, `asset_delete`).\n- **Detalhe contém**: substring case-insensitive no campo `detail` (útil para \"features\", \"i18n\", etc.).\n- **De / Até**: datetime-local em UTC. \"Até\" inclui o minuto selecionado.\n- **Limite**: 50 / 200 / 500 / 1000 entradas.\n\n**Ações**:\n- **Limpar**: reseta filtros.\n- **Baixar log completo**: últimas 1000 entradas como `.log` para análise offline.\n\n**Quando olhar o audit log**:\n- \"Quem desativou a categoria X?\" → filtro action=`config_update` e detail contém \"X\".\n- \"A que hora começaram erros de auth?\" → filtro action=`login_ok` (ou novas actions depois).\n- \"O que mudou na última hora?\" → \"De\" = `Date.now() - 1h`.\n\n**Retenção**: log rotaciona automaticamente a 10MB (mantém 3 backups). Para meses, exporte periodicamente ou sidecar que copie o arquivo.\n\nSe a feature estiver desligada, seção não aparece e `/api/audit` retorna 404.",
  },
  "advanced.multiPortal": {
    title: "Multi-Portal",
    short: "Serve múltiplos portais/dashboards de uma instância conforme domínio ou prefixo de rota.",
    body: "**Multi-Portal** isola configs, cards, categorias, assets e logs para equipes ou ambientes diferentes (ex.: \"TI\", \"Marketing\", \"Dev\", \"Clientes\") numa única instalação Umbral.\n\n**Como funciona o roteamento**:\n1. **Por Host (Domínio / Subdomínio)**: associe portal a host específico (ex.: `dev.portal.local` ou `marketing.empresa.com`). Aceita wildcards como `*.empresa.com`.\n2. **Por Path Prefix**: roteie por prefixo (ex.: `/dev`, `/marketing`).\n3. **Portal Default (Fallback)**: requests que não batem com portais registrados vão ao portal default (`default`).\n\n**Estrutura de dados em disco**:\nAo ativar a feature, dados migram automaticamente:\n- `data/portals/default/config.json`: config do portal default.\n- `data/portals/<portal-id>/config.json`: config independente de cada portal.\n- `data/portals/<portal-id>/uploads/`: assets e logos do portal.\n- `data/portals/<portal-id>/audit.log`: audit log isolado por portal.\n\n**Gestão de portais**:\nAdicione portais com ID kebab-case único, nome representativo e opcionalmente host ou pathPrefix.",
  },
  "security.multiUser": {
    title: "Usuários (multi-user)",
    short: "Cria usuários com roles (admin/editor/viewer) e login com username.",
    body: "**Multi-user** permite vários admins/editores/viewers em vez de compartilhar uma senha. Cada user tem username, senha (hash bcrypt cost 12) e role. A **senha única** (super-admin) continua válida como rescue path por default — admin pode desabilitar em \"Modo de acesso\".\n\n**Modos de acesso** (3 estados):\n- `password-only` (default): só senha única. Deploy legacy sem complicar.\n- `both`: senha única + login com username. Senha única serve para emergências (perder acesso a user, MFA quebrado, etc.).\n- `users-only`: só users da lista. Senha única para de funcionar. **Cuidado**: sem users válidos e single password off, NÃO entra. Server rejeita save se users vazio. Confirmação dura no form \"Só usuários\" exige pelo menos um user.\n\n**Roles**:\n- `admin`: acesso total (inclui users e config).\n- `editor`: edita cards/categorias/tema/branding, não mexe em segurança nem users.\n- `viewer`: só leitura. Auditoria, suporte, integrações.\n\n**Sessões per-user**: cada user tem `userEpoch` independente. Mudar senha de Alice (ou reset daqui) incrementa epoch e invalida sessões de Alice sem afetar Bob. Fecha gap de \"comprometeram Alice, mudei senha, sessões antigas ainda vivas\" do sistema de senha única.\n\n**Login com TOTP** (features.totp2fa, Ola 3.2): se ativa, cada user pode ter 2FA próprio. Senha única super-admin **NÃO** pode ter TOTP — intencional. Se perder seeds TOTP, senha única é rescue path.\n\n**Se a feature estiver desligada**: seção não aparece no tab Senha, server descarta `users[]` ao salvar (defense in depth), login com username retorna 401.",
  },
  "security.accessMode": {
    title: "Modo de acesso",
    short: "Três modos de login: só senha, senha+usuários ou só usuários.",
    body: "Define como entrar no portal:\n\n**`password-only`** (default histórico): só senha única. Simples, um secret para rotacionar se vazar.\n\n**`both`**: senha única + login com username. Dois mundos. Senha única como rescue se perder acesso a user (sessão expirada, MFA quebrado, etc.). Trade-off: duas superfícies de ataque.\n\n**`users-only`**: só users. Senha única deixa de existir. **Não recomendado** salvo compliance rigoroso ou ponto único de entrada. Risco: sem users válidos (ex.: apagou último admin), não entra — server rejeita save se users[] vazio, mas se habilitar e depois apagar último user, precisa editar JSON manualmente.\n\n**Decisão recomendada**: `both` (default se multi-user ativo). Audit log por user + rede de segurança da senha única.\n\n**Caveat legal**: compliance PCI-DSS ou similar que exija \"single point of authentication\", `users-only` se aproxima. Senha única costuma ser aceitável como service account de emergência documentado.",
  },
  "security.password": {
    title: "Alterar senha",
    short: "Rotaciona a senha do admin. Invalida todas as outras sessões.",
    body: "Três campos: atual, nova, confirmar. Se não baterem, rejeitamos.\n\nAo salvar:\n- Nova senha hasheada com bcrypt (cost 12)\n- CSRF token rotacionado\n- `authEpoch` incrementado → **todas as sessões existentes morrem no próximo request** (exceto a sua)\n\n**Por que invalidar outras sessões**: se alguém roubou sua sessão e você muda senha sem invalidar, atacante continua dentro até cookie expirar. Com epoch, cookie morre na hora.",
  },
  "security.csrf": {
    title: "CSRF token",
    short: "Token de uso único que valida requests de mutação.",
    body: "Rotaciona automaticamente ao mudar senha. Todos POST/PUT/DELETE/PATCH devem mandar este token no header `x-csrf-token`.\n\nSe ativar `Rotacionar CSRF a cada login` (Hardening), também rotaciona a cada login.\n\n**Não copie para outros browsers/dispositivos** — está atado à sua sessão. Se perder, faça logout/login.",
  },
  "externalSearch.intro": {
    title: "Busca externa para auto-completar",
    short: "Fallback quando scrape do site falha. Default: Wikipedia + DuckDuckGo (sem key).",
    body: "Botão \"Auto-completar\" do form de card tenta primeiro **scrapear o site** (GET na URL + parse de meta tags). Quando falha — serviço interno sem HTML público, URL IP:porta sem DNS, site com login vazio, etc. — faz **fallback para busca externa** pelo nome do serviço.\n\n**Ordem de busca**:\n1. **Brave Search** (se tiver key) — melhor qualidade, 2000 req/mês grátis\n2. **Tavily** (se tiver key) — otimizado para AI, 1000 req/mês\n3. **Wikipedia REST** — sem key, cobre maioria dos produtos conhecidos\n4. **DuckDuckGo Instant Answer** — sem key, resultados inconsistentes\n\nSe nenhuma achar algo, toast avisa e form fica como está.",
  },
  "externalSearch.brave": {
    title: "Brave Search API key",
    short: "Tier grátis: 2000 req/mês. Melhor qualidade que Wikipedia/DDG.",
    body: "**Setup**:\n1. Vá a https://brave.com/search/api/\n2. Crie conta, gere API key (começa com `BSA...`)\n3. Cole aqui\n\n**Tier grátis**:\n- 2000 requests / mês\n- 1 req/segundo de rate limit (suficiente para auto-completar humano)\n- Resultados qualidade Google, com snippet e às vezes imagem do profile\n\n**Privacidade**: query enviada ao Brave é o nome do serviço. Não inclui a URL.",
  },
  "externalSearch.tavily": {
    title: "Tavily API key",
    short: "Tier grátis: 1000 req/mês. Otimizado para AI agents.",
    body: "**Setup**:\n1. Vá a https://tavily.com\n2. Sign up, gere API key (começa com `tvly-...`)\n3. Cole aqui\n\n**Tier grátis**:\n- 1000 requests / mês\n- Rate limit generoso\n- Resultados limpos, otimizados para LLM consumir\n\n**Quando preferir Tavily sobre Brave**: se também usar provider IA para melhorar cards, Tavily devolve conteúdo mais \"AI-friendly\" (menos HTML, mais texto limpo). Brave é melhor para resultados estilo web.\n\n**Privacidade**: query é o nome do serviço.",
  },
  "theme.bgEditMode": {
    title: "Fundo por modo claro/escuro",
    short: "Edite o fundo do portal em modo escuro e claro separadamente.",
    body: "Cada modo tem seu próprio fundo (gradiente, cor ou imagem). Use **Copiar do outro modo** para partir da paleta existente e ajustar.\n\nO toggle claro/escuro do portal usa o fundo do modo ativo.",
  },
  "theme.advancedCss": {
    title: "CSS avançado do fundo",
    short: "Edite o valor do fundo como texto CSS livre.",
    body: "Desativa o construtor visual e permite colar qualquer valor CSS válido: `linear-gradient(...)`, `radial-gradient(...)`, cor hex, etc.\n\nÚtil para fundos complexos que o builder não cobre.",
  },
  "theme.gradientBuilder": {
    title: "Construtor de gradiente",
    short: "Monte gradientes com ângulo e stops de cor.",
    body: "Ajuste o **ângulo** (0–360°) e cada **stop** (cor + posição %). A prévia atualiza na hora.\n\nPode remover stops extras se houver mais de dois.",
  },
  "theme.iconTint": {
    title: "Tinte de ícones SVG",
    short: "Como os ícones dos cards são coloridos.",
    body: "**Original (default)**: respeita cores do SVG (logos de marca).\n\n**Accent / Texto / Próprio**: aplica cor uniforme via máscara CSS.\n\nUse Original para GitHub, Docker, etc.; Accent ou Texto para ícones monocromáticos de packs UI.",
  },
  "theme.iconColor": {
    title: "Cor de ícone personalizada",
    short: "Cor usada quando o tinte é \"Próprio\".",
    body: "Só aplica se **Tinte de ícones** estiver em **Próprio**. Definida por modo claro/escuro na rampa avançada.",
  },
  "theme.autoStrategy": {
    title: "Estratégia modo automático",
    short: "Como o portal escolhe claro ou escuro quando o modo é Auto.",
    body: "**Sistema**: segue preferência do SO/navegador (`prefers-color-scheme`).\n\n**Horário**: claro das 7:00 às 19:00, escuro no resto (hora do servidor).",
  },
  "theme.textRamp": {
    title: "Rampa de texto",
    short: "Cores de texto principal, muted, subtle e faint por modo.",
    body: "A rampa define hierarquia tipográfica. Badge **AA ✓** indica contraste WCAG ≥ 4.5:1 contra a superfície.\n\nSe contraste cair, ajuste `--text` ou superfície em tokens avançados.",
  },
  "theme.derivedPalette": {
    title: "Paleta derivada",
    short: "Visão das cores calculadas a partir do accent e tokens.",
    body: "Mostra como o motor de tema combina accent, superfícies e bordas. Só leitura; edite em **Cores** ou **Avançado**.",
  },
  "theme.fontWeight": {
    title: "Peso da tipografia",
    short: "Espessura da fonte do portal (400–700).",
    body: "Afeta títulos, cards e widgets. 400 = regular, 600–700 = mais marcado em dashboards corporativos.",
  },
  "theme.useGoogleFonts": {
    title: "Google Fonts",
    short: "Carregar a fonte de fonts.googleapis.com.",
    body: "Se ativo, o navegador pede a fonte ao Google (implicação de privacidade: Google vê IPs dos visitantes).\n\nDesative e use `fontUrl` próprio ou fontes do sistema para evitar requests externos.",
  },
  "theme.cardBlur": {
    title: "Blur de cards glass",
    short: "Intensidade do desfoque no estilo glass.",
    body: "Só aplica a `cardStyle: glass`. Valores altos = mais frosted glass; 0 = sem blur.",
  },
  "theme.cardBorderWidth": {
    title: "Largura da borda (outlined)",
    short: "Espessura da borda em cards outlined.",
    body: "Só aplica a `cardStyle: outlined`. Expresso em pixels.",
  },
  "theme.showModeToggle": {
    title: "Toggle claro/escuro",
    short: "Mostra botão para mudar modo no header.",
    body: "Visitantes alternam claro e escuro. Preferência salva em `localStorage`.",
  },
  "theme.clockPosition": {
    title: "Posição do relógio",
    short: "Header esquerda ou direita.",
    body: "O relógio respeita formato 12h/24h configurado abaixo.",
  },
  "theme.clockFormat": {
    title: "Formato do relógio",
    short: "12h com AM/PM ou 24h.",
    body: "Afeta widget de relógio no header do portal e prévia do admin.",
  },
  "theme.headerOpacity": {
    title: "Opacidade do header",
    short: "Transparência da barra superior (0–1).",
    body: "0 = invisível, 1 = opaco. Útil sobre fundos com muito detalhe visual.",
  },
  "theme.footerOpacity": {
    title: "Opacidade do footer / status bar",
    short: "Transparência da barra inferior (0–1).",
    body: "Aplica ao status bar quando visível.",
  },
  "theme.presets": {
    title: "Presets de tema",
    short: "Paletas completas com variantes claro e escuro.",
    body: "Cada preset define fundo, texto, superfícies, bordas, accent e ícones para **ambos** os modos.\n\nBotões Escuro/Claro só escolhem **modo inicial**; toggle do portal continua funcionando.",
  },
  "theme.savePreset": {
    title: "Salvar preset custom",
    short: "Salva configuração atual como preset reutilizável.",
    body: "Máximo 5 presets custom. Não inclui tokens avançados nem lista de presets aninhada.",
  },
  "theme.resetDefaults": {
    title: "Restaurar defaults",
    short: "Volta o tema aos valores de fábrica do Umbral.",
    body: "Não apaga presets custom salvos. Requer salvar alterações para persistir.",
  },
  "theme.advanced.intro": {
    title: "Tokens avançados (Pro)",
    short: "Editor de variáveis CSS do tema por modo.",
    body: "Permite sobrescrever qualquer token (`--surface`, `--border`, sombras, etc.) por modo claro/escuro.\n\nUse **Derivar** para gerar tokens a partir do accent.",
  },
  "theme.advanced.derive": {
    title: "Derivar tokens",
    short: "Gera tokens de superfície/borda a partir da cor de destaque.",
    body: "Recalcula valores coerentes sem editar cada campo manualmente. Não sobrescreve tokens já personalizados se escolher merge parcial.",
  },
  "theme.advanced.shadowIntensity": {
    title: "Intensidade de sombras",
    short: "Multiplicador global de sombras de texto e ícones.",
    body: "Afeta `--shadow-text` e `--shadow-icon`. Útil em temas muito planos ou dramáticos.",
  },
  "theme.advanced.tokens": {
    title: "Lista de tokens",
    short: "Cada linha é uma variável CSS do tema.",
    body: "Tokens vazios usam default do preset/motor. Base **shared** aplica a ambos modos; **dark/light** só àquele modo.",
  },
  "theme.advanced.exportImport": {
    title: "Exportar / importar tema",
    short: "JSON portátil do tema completo.",
    body: "Exporte para backup ou copiar entre portais. Import substitui `cfg.theme` (validado pelo schema).",
  },
  "theme.preview.mode": {
    title: "Modo da prévia",
    short: "Dark / Light / Auto no painel (não afeta visitantes).",
    body: "**Auto** segue mesma lógica do portal (`colorMode` + estratégia). Prévia embutida não lê preferência salva do visitante.",
  },
  "theme.preview.openTab": {
    title: "Prévia em aba",
    short: "Abre o portal com rascunho de tema em outra aba.",
    body: "Usa `localStorage` (`umbral-theme-preview`). Salve alterações no admin para a aba pública refletir ao recarregar.",
  },
  "card.autofill": {
    title: "Auto-completar card",
    short: "Preenche título, descrição e ícone a partir da URL.",
    body: "Tenta scrapear meta tags da URL. Se falhar, busca em Wikipedia/Brave/Tavily conforme config de busca externa.",
  },
  "card.aiEnhance": {
    title: "Melhorar com IA",
    short: "Reescreve título/descrição com o provider configurado.",
    body: "Requer tab IA ativo e API key válida. Não altera URL nem ícone.",
  },
  "card.descriptionFormat": {
    title: "Formato Markdown",
    short: "Descrição em Markdown sanitizado vs texto plano.",
    body: "Markdown permite **negrito**, listas e links. Requer feature `markdown` ativa. HTML sanitizado no servidor.",
  },
  "card.iconPicker": {
    title: "Seletor de ícones",
    short: "Escolha ícones de packs instalados ou assets enviados.",
    body: "Aba **Ícones**: packs Git (Lucide, Simple Icons, etc.). **Assets**: PNG/SVG enviados.\n\nSem packs instalados, instale um em **Ícones Git**.",
  },
  "assets.dropzone": {
    title: "Enviar assets",
    short: "Arraste arquivos ou use o seletor.",
    body: "Limites de tamanho e MIME types em **Hardening → Uploads**. SVG pode exigir sanitização ativa.",
  },
  "assets.copyUrl": {
    title: "Copiar URL do asset",
    short: "Copia a rota pública para a área de transferência.",
    body: "Use `/api/assets/nome.ext` como ícone custom em cards ou imagem de fundo.",
  },
  "assets.delete": {
    title: "Excluir asset",
    short: "Remove o arquivo do armazenamento do portal.",
    body: "Cards que referenciem esse asset ficam sem imagem até atualizar o ícone.",
  },
  "audit.filters": {
    title: "Filtros de auditoria",
    short: "Ação, texto no detalhe e intervalo de datas.",
    body: "Eventos vêm de `data/audit.log`. Filtre por tipo (`config.save`, `login`, etc.) ou texto livre no JSON de detalhe.",
  },
  "audit.limit": {
    title: "Limite de entradas",
    short: "Quantidade máxima de linhas retornadas.",
    body: "Ordem cronológica inversa (mais recentes primeiro). Aumente o limite para exportações manuais.",
  },
  "audit.download": {
    title: "Baixar log completo",
    short: "Baixa todo `audit.log` sem filtros.",
    body: "Útil para arquivo ou análise externa. Arquivo pode crescer; rotação manual se necessário.",
  },
  "iconPacks.intro": {
    title: "Ícones Git",
    short: "Instale packs SVG de repositórios públicos.",
    body: "Simple Icons (marcas), Lucide (UI), Tabler, etc. Ícones ficam em `data/icon-packs/` e são servidos por `/api/icons/`.",
  },
  "iconPacks.install": {
    title: "Instalar pack",
    short: "Clona o repo e copia SVGs para o portal.",
    body: "Pode demorar conforme tamanho do repo. Requer rede de saída do servidor.",
  },
  "iconPacks.uninstall": {
    title: "Desinstalar pack",
    short: "Remove SVGs do pack do disco.",
    body: "Cards com ícones `pack/nome` deixam de mostrar imagem até trocar o ícone.",
  },
  "iconPacks.refresh": {
    title: "Atualizar catálogo",
    short: "Relê packs instalados e atualiza o picker.",
    body: "Use após instalar/desinstalar sem recarregar a página.",
  },
  "iconPacks.customRepo": {
    title: "Repo Git personalizado",
    short: "URL de repositório com SVGs.",
    body: "Deve ser acessível por HTTPS. Umbral clona em temp e copia conforme subpath/prefixo.",
  },
  "iconPacks.branch": {
    title: "Branch do repo",
    short: "Branch a clonar (ex.: main, develop).",
    body: "Default costuma ser `main`. Verifique no repo qual é a branch ativa.",
  },
  "iconPacks.subpath": {
    title: "Subpath no repo",
    short: "Pasta dentro do repo onde estão os SVGs.",
    body: "Ex.: `icons` no Lucide, `svg` no dashboard-icons. Só copia `.svg` dessa pasta (recursivo conforme implementação).",
  },
  "iconPacks.prefix": {
    title: "Prefixo do pack",
    short: "ID usado em `prefixo/nome-icone`.",
    body: "Ex.: `meu-pack` → ícones como `meu-pack/home.svg`. Deve ser único entre packs instalados.",
  },
  "advanced.oidc": {
    title: "OIDC / SSO",
    short: "Single Sign-On com provedores OpenID Connect.",
    body: "Configure client ID/secret, issuer e scopes para Google, Keycloak, Authentik, etc.\n\nRequer feature `oidc` ativa e URLs de callback corretas no IdP.",
  },
  "advanced.apiTokens": {
    title: "Tokens API",
    short: "Tokens de longa duração para automação.",
    body: "Permitem chamar endpoints admin sem cookie de sessão. Rotacione tokens comprometidos e use scopes mínimos.\n\nRequer feature `apiTokens` ativa.",
  },
} as const satisfies HelpCatalog;

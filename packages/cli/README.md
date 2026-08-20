# Umbral CLI

CLI para Umbral — gestiona config, cards, users y tokens vía el API REST v1.

## Instalación

### Opción A: `npx` (recomendada para scripts / CI)

```bash
npx tsx https://raw.githubusercontent.com/FittyAr/Umbral/main/packages/cli/src/cli.ts \
  --url https://umbral.internal \
  --token umb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  config get
```

### Opción B: Clone + dev local

```bash
git clone https://github.com/FittyAr/Umbral.git
cd Umbral/packages/cli
npm install
npm run dev -- --url https://umbral.internal --token umb_xxx config get
```

### Opción C: Proyecto separado (Rust, recomendado para producción)

Para un binario único sin `node_modules`:

```bash
# Repo separado: github.com/FittyAr/umbral-cli
umbral config get --url https://umbral.internal --token umb_xxx
```

Ver `docs/port-to-rust.md` en el repo principal.

## Auth

Crear un API token en `/admin → Avanzado → API tokens` con scope `read` o `write`. Pasar vía `--token` o `UMBRAL_TOKEN`.

## Comandos

| Comando | Descripción |
|---|---|
| `config get [--json]` | Muestra el config completo |
| `config backup` | Dump JSON a stdout (redirigir a archivo) |
| `cards list [--category=X] [--json]` | Lista cards |
| `cards add --title=X --url=Y --category=Z` | Agrega una card |
| `users list [--json]` | Lista users (multi-user) |
| `tokens list [--json]` | Lista API tokens |
| `health` | Ping al server |

## Variables de entorno

- `UMBRAL_URL` — default `--url`
- `UMBRAL_TOKEN` — default `--token`

## ¿Por qué un CLI Node y no Rust?

Esta es la primera versión. Es Node + `tsx` (sin deps extra), simple y se
ejecuta con `npx`. Para una versión de producción con un binario
compilado, hay un plan para portar a Rust en `docs/port-to-rust.md` en
el repo principal. El CLI Node es la **spec funcional** que se va a
portar.

## Estado actual

- ✅ Auth via API token
- ✅ Read endpoints (config, cards, users, tokens)
- ✅ Write endpoints (cards.add)
- ⏳ Write endpoints (users, tokens, webhooks, maintenance) — pending
- ⏳ Webhook fire (POST a /api/webhooks/test) — pending
- ⏳ Status checks batch (/api/status) — pending

PRs bienvenidos.

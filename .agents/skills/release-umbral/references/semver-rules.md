# Semver Bump Rules

> Heurística para inferir el bump level (patch / minor / major) desde los
> commits entre el último tag y HEAD. Aplicar antes de bumpear la versión.

## Fuente de datos

```powershell
# Listar commits desde el último tag (Windows PowerShell, sin dependencia de jq)
$lastTag = (git tag --sort=-creatordate | Select-Object -First 1)
git log "${lastTag}..HEAD" --pretty=format:"%s%n%b---END---"
```

(Si no hay tags previos, tomá todos los commits desde el primer commit.)

## Reglas (en orden de prioridad)

| Señal | Bump | Ejemplo |
|---|---|---|
| `BREAKING CHANGE:` en el footer del commit | **major** | `feat(api)!: drop /api/v1` |
| `<type>!:` con bang (cualquier conventional commit) | **major** | `fix!: remove legacy config keys` |
| `feat:` (sin bang) | **minor** | `feat(upload): support WebP conversion` |
| `feat(<scope>):` con scope entre paréntesis sigue contando como minor | minor | `feat(api): add rate limit headers` |
| Cualquier otro cambio (`fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `perf:`, `style:`) | **patch** | `fix(login): trim whitespace on submit` |
| Merge commits o commits sin conventional prefix | revisar el cuerpo, sino default | default a `patch` |

## Casos ambiguos

Si el mix de commits entre el último tag y HEAD incluye **al menos un**
`feat:` y **al menos un** breaking → gana el **major** (es lo más seguro).

Si el mix incluye `feat:` y sólo `fix:`/`chore:` → **minor** (los fix van
adentro del minor; no se necesita release patch por separado en la
mayoría de los casos).

Si **todos** los commits son `chore:`/`docs:`/`ci:` sin features → **patch**.

## Edge case: commit único

Si hay un solo commit entre el último tag y HEAD, su tipo gana:

| Si el commit es | Bump |
|---|---|
| `feat!:` o `BREAKING` | major |
| `feat:` | minor |
| `fix:` / `chore:` / `docs:` / `ci:` | patch |

## Override del usuario

Si el usuario dijo explícitamente "patch" / "minor" / "major", usar eso
sin importar la heurística. La heurística es solo para cuando el usuario
dice "hacé el release" sin especificar nivel.

## Contexto del proyecto

Umbral es una app self-hosted para una intranet. El usuario es técnico
(FittyAr). En la práctica:
- **patch** es lo más común (fixes, dep bumps, hardening).
- **minor** cuando hay una nueva feature visible (ej: nueva tab, nuevo endpoint).
- **major** casi nunca — sólo si hay breaking change real en el schema
  de `data/config.json` o en la API.

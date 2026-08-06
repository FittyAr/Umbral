# Pre-Release Checklist

> Correr todo esto antes de taggear. Si algo falla, abortar el release
> y resolver primero. Un release roto es peor que ningún release.

## 1. Working tree limpio

```powershell
git status --short
```

Esperado: output vacío (o sólo `.test-tmp/` que está en `.gitignore`).

Si hay cambios sin commitear, **abortar** y resolver antes.

## 2. Remote correcto

```powershell
git remote -v
```

Esperado:
```
origin  https://github.com/FittyAr/Umbral.git (fetch)
origin  https://github.com/FittyAr/Umbral.git (push)
```

Si apunta a otro repo (fork personal, etc), **abortar**. La push iría al
lugar equivocado.

## 3. Branch actualizado

```powershell
git status -sb   # muestra la branch y si está ahead/behind
git fetch origin
git status -sb
```

Si está `behind origin/main`, hacer `git pull --rebase` antes. Si
diverge, resolver.

## 4. `npm audit` limpio

```powershell
npm audit --json | Select-String '"total":\s*\d+'
```

Esperado: `"total": 0`.

Si hay vulns:
- **High/Critical** → abortar, hacer un release de seguridad primero.
- **Moderate** → avisar al usuario, preguntar si siguen.
- **Low** → normalmente OK seguir.

## 5. Build limpio

```powershell
npm run build
```

Esperado: "Server built in X.XXs" sin warnings críticos.

## 6. TypeScript limpio

```powershell
npx tsc --noEmit
```

Esperado: output vacío (cero errores).

## 7. Smoke test (opcional pero recomendado)

```powershell
# Arrancar el server en un puerto efímero
$env:PORT = "4399"
$env:INITIAL_PASSWORD = "smoke-test-1234"
$env:SESSION_SECRET = "smoke-test-secret-which-is-long-enough-for-app"
$env:DATA_DIR = ".\.test-tmp\smoke-release"
$env:NODE_ENV = "production"
New-Item -ItemType Directory -Force -Path $env:DATA_DIR | Out-Null
node .\dist\server\entry.mjs &
$server = $!
Start-Sleep -Seconds 4
try {
    $health = Invoke-WebRequest "http://127.0.0.1:$env:PORT/api/health" -UseBasicParsing
    if ($health.StatusCode -ne 200) { throw "health no es 200" }
    $docs = Invoke-WebRequest "http://127.0.0.1:$env:PORT/docs" -UseBasicParsing
    if ($docs.StatusCode -ne 200) { throw "/docs no es 200" }
} finally {
    Get-Process -Id $server -ErrorAction SilentlyContinue | Stop-Process
}
```

Si el smoke falla, **abortar** el release.

## 8. CHANGELOG tiene entrada [Unreleased]

```powershell
Get-Content CHANGELOG.md | Select-String "## \[Unreleased\]"
```

Esperado: hay una sección `## [Unreleased]` con bullets abajo.

Si está vacía o no existe, el release no tiene nada que mover. Preguntar
al usuario si realmente quiere taggear o si se olvidó de commitear los
cambios.

## 9. Conventional commits en el log

```powershell
$lastTag = (git tag --sort=-creatordate | Select-Object -First 1)
git log "${lastTag}..HEAD" --pretty=format:"%s"
```

Esperado: commits con prefijos `feat:`, `fix:`, `chore:`, etc.

Si hay commits sin prefix (ej: "Update README"), avisar al usuario. Los
commits sin conventional prefix pueden ser legítimos pero rompen la
heurística de bump.

## Orden de las verificaciones

Hacé las 9 en orden. Si una falla, **abortar inmediatamente** y avisar.
No sigas con las verificaciones 5-9 si 1-3 fallan — no tiene sentido
testear un build sobre un working tree sucio.

## Si todas pasan

Estás listo para correr el Procedure del SKILL.md (mover changelog, commit,
push, tag, push tag).

# PowerShell Recipes for the Release Flow

> Gotchas específicos de Windows PowerShell que rompieron el flujo de
> release las primeras veces. La regla de oro: **en PowerShell, los
> caracteres `>`, `&`, `|` y `;` se interpretan distinto que en bash**.
> Para evitar sorpresas, usá siempre `-F <file>` y cmdlets en lugar de
> comandos externos.

## Listar tags ordenados por fecha

`git tag --sort=-v:refname` a veces no funciona con el Git portable de
Windows. Usar `-creatordate` que sí respeta:

```powershell
$lastTag = git tag --sort=-creatordate | Select-Object -First 1
```

Si no hay tags previos, dejar `$lastTag = ""` y usar `git log` sin rango.

## Commit message con `>`, `&` o `|` adentro

PowerShell interpreta `>` como redirector. El commit `chore(release):
vX.Y.Z — incluye X > Y` se rompe.

**Solución:** escribir el mensaje a un archivo y usar `-F`:

```powershell
$msg = "chore(release): v$Version`n`n- Change 1`n- Change 2"
$msg | Out-File -FilePath .\.test-tmp\commit-msg.txt -Encoding utf8
git -c core.autocrlf=false commit -F .\.test-tmp\commit-msg.txt
```

(`-Encoding utf8` sin BOM en PowerShell 7+; en 5.1 usar
`[System.IO.File]::WriteAllText` con `UTF8Encoding($false)` para evitar
BOM.)

## Chaining de comandos con `;` (no `&&`)

PowerShell no soporta `&&` entre comandos. Usar `;` o `if ($?) { ... }`:

```powershell
git add -A; git status --short
# o
if ($LASTEXITCODE -eq 0) { git push origin main }
```

## `git tag` con `-m` y caracteres especiales

Mismo problema que con commit. Solución: `git tag vX.Y.Z` sin `-m`, y si
querés anotar, escribir el mensaje a archivo:

```powershell
"v$Version : summary" | Out-File -FilePath .\.test-tmp\tag-msg.txt -Encoding utf8
git tag v$Version -F .\.test-tmp\tag-msg.txt
```

(O simplemente `git tag v$Version` sin annotation, y dejar el release
notes del CHANGELOG.md como descripción.)

## Push y captura de output

`git push origin main 2>&1` mezcla stdout y stderr (lo mismo que bash).
El error real de PowerShell es a veces el `Command exited with code 1`
genérico. Para ver el output real:

```powershell
$out = git push origin main 2>&1 | Out-String
Write-Host $out
```

Si `$LASTEXITCODE -ne 0`, algo falló. Comparar con el último push exitoso
en `git log` para ver el progreso.

## Encoding en archivos .md

PowerShell 5.1 `Set-Content` con `-Encoding UTF8` mete BOM al inicio.
Eso rompe el regex de `marked` en el frontmatter parse (`^#\s+` no
matchea con `\uFEFF` delante).

**Para evitarlo** en cualquier script que escriba `CHANGELOG.md`:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
```

O usar el tool `Edit` con el string exacto (más simple, recomendado
sobre Set-Content).

## `Remove-Item` está bloqueado por la safety policy

La policy de shell local no permite `Remove-Item` recursivo. Para
"limpiar" un archivo de mensaje temporal, mejor:

- Escribir a `.\.test-tmp\` que ya está en `.gitignore`
- O usar el tool `mavis-trash` (no expuesto en este toolset)
- O dejar el archivo en disco — no afecta nada

## Diff y stat portables

Si necesitás un diff y `git diff` te tira CRLF warnings que ensucian el
output:

```powershell
$env:GIT_PAGER = "cat"  # no pager
git --no-pager diff --stat
```

O leer el output con el tool `bash` y filtrar con `Select-String`.

## Resumen de la regla de oro

> En Windows PowerShell, **toda mutación importante** (commit, tag, push,
> edit de CHANGELOG) → **via file o via Edit tool**, no inline en `-m`.
> PowerShell es traicionero con `>` `&` `|` en strings.

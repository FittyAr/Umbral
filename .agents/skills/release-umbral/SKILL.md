---
name: release-umbral
description: |
  Orchestrate a SemVer release of the Umbral project end-to-end: determine the
  next version (patch/minor/major from conventional commits), date and move the
  [Unreleased] section in CHANGELOG.md, commit, push main, tag, push the tag.
  Triggers on "hacemos un release", "tagueá v1.2.0", "subí a vX.Y.Z",
  "publish a new version", "creá el release patch/minor/major", and similar.
  Do NOT use for: code changes (do those first), releases of other projects
  (project-specific), or manual hotfixes that skip the changelog (just commit
  + push directly).
---

# Release Umbral

## Inputs to collect

- **Bump level** (`patch` / `minor` / `major`) — if the user does not specify,
  infer it from the conventional commit messages in `git log <last-tag>..HEAD`
  using the rules in `references/semver-rules.md`. If still ambiguous, ask.
- **Confirm remote** — the project is `https://github.com/FittyAr/Umbral`.
  Verify with `git remote -v` before pushing; abort if it does not match.
- **Confirm working tree is clean** — abort if there are uncommitted changes
  and the user has not explicitly said to ignore them.

## Procedure

1. **Pre-flight** — verify the project is ready to release.
   - `git status --short` returns empty (or only `.test-tmp/` ignored).
   - `git remote -v` shows `FittyAr/Umbral` as origin.
   - `git log --oneline -1` matches the latest local commit.
   - `npm audit --json | jq '.metadata.vulnerabilities.total'` is 0
     (or the user has accepted the risk).
   - `npm run build` succeeds.

   Reason: a release that ships with dirty tree, audit failures, or build
   errors will burn the tag immediately.

2. **Compute the next version** — bump from the latest tag (see
   `references/powershell-recipes.md` for the git query that works on
   Windows PowerShell, since `git tag --sort=-v:refname` may not be
   available in the portable Git for Windows).
   - Default to `patch` unless the user said otherwise.
   - If commits contain `feat:` without `!` → minor.
   - If commits contain `BREAKING CHANGE:` footer or `feat!:` / `fix!:` →
     major.

3. **Move the [Unreleased] section in `CHANGELOG.md`** — replace the
   `[Unreleased]` header with a dated section:
   ```
   ## [Unreleased]

   ## [X.Y.Z] - YYYY-MM-DD
   ```
   Also update the link reference at the bottom of the file to point the
   new version to the previous one (`...compare/vPREV...vX.Y.Z`).

4. **Commit** with the message `chore(release): vX.Y.Z`. Use
   `git commit -F <message-file>` rather than `-m` — PowerShell interprets
   `>` inside the message as a redirection (see
   `references/powershell-recipes.md`).

5. **Push `main`**: `git push origin main`.

6. **Tag**: `git tag vX.Y.Z -m "vX.Y.Z: <one-line summary>"`.

7. **Push the tag**: `git push origin vX.Y.Z`. This triggers
   `.github/workflows/release.yml`, which builds the Docker image
   multi-arch and pushes it to `ghcr.io/fittyar/umbral` with the canonical
   tag set (`latest`, `<v>`, `<major>`, `<major>.<minor>`, `<sha>`).

8. **Report** — tell the user the tag was pushed, link them to
   https://github.com/FittyAr/Umbral/actions so they can watch the release
   workflow complete (~5-10 min for the Docker build + GHCR push + GitHub
   Release via release-drafter). Do not promise a "ready in X seconds" —
   the GHCR push and image pull can vary.

## Output contract

- One new tag on the remote: `vX.Y.Z`
- One commit on `main` updating `CHANGELOG.md`
- The CI workflow (`.github/workflows/release.yml`) produces:
  - `ghcr.io/fittyar/umbral:X.Y.Z` and `:latest` (multi-arch, Node 24)
  - A GitHub Release on `https://github.com/FittyAr/Umbral/releases/tag/vX.Y.Z`
    with auto-generated notes from `.github/release-drafter.yml`
- The user's local `data/` (if any) is untouched — the release only
  ships source code + container image.

## Failure handling

- **Working tree dirty** → `git status` and ask the user to stash, commit,
  or discard. Do not release over uncommitted work.
- **Remote is not `FittyAr/Umbral`** → abort. The push would go to the wrong
  repo. Surface the actual remote and ask.
- **`npm audit` reports vulns** → warn the user with the count and severity.
  Ask: "querés un patch release de seguridad primero, o seguimos con el
  release actual?" Do not auto-bump a security release.
- **Pre-flight build fails** → abort and surface the error. A release that
  does not build is worse than no release.
- **`git push origin vX.Y.Z` fails because the tag already exists** → the
  previous release was botched. Ask the user how to proceed (delete the
  tag and retry, or skip and pick a different version). Never force-push
  tags without explicit confirmation.
- **GHCR push or GitHub Release creation fails** → these are out of our
  control once the tag is pushed. Direct the user to the Actions page to
  read the failure. Do not try to "fix" by re-pushing the tag — that just
  re-runs the same workflow.
- **PowerShell `>` redirect gotcha** → always use `-F <file>` for commit
  messages, never inline `-m` with `>`. See `references/powershell-recipes.md`.

## Examples

### Patch release from conventional commits

User: "hacé un release patch con lo que hay pendiente."

Actions:
1. `git log v1.1.3..HEAD --oneline` → `fix(upload): MIME allowlist strict mode`,
   `chore(deps): bump @astrojs/node`.
2. Infer bump = `patch` (no `feat`, no breaking). Next version: `1.1.4`.
3. Edit `CHANGELOG.md`: `[Unreleased]` → `## [1.1.4] - 2026-08-06`, copy
   the entries underneath, update the link reference.
4. Commit `chore(release): v1.1.4`, push main, tag, push tag.
5. Report: "tag v1.1.4 pusheado. Seguí el build en https://github.com/FittyAr/Umbral/actions."

### Minor release with a new feature

User: "tagueá v1.2.0 con la nueva card de tabs."

Actions:
1. Confirm user wants `minor` (the feature is additive, no breaking).
2. Compute: `1.1.4` → `1.2.0`.
3. Move `[Unreleased]` → `## [1.2.0] - <today>`, ensure the new feature
   entry is the headline.
4. Commit, push, tag, push.

### Aborted because of a dirty tree

User: "release ya."

Actions:
1. `git status --short` shows uncommitted edits to `src/lib/upload.ts`.
2. Output: "Working tree sucio. ¿Querés que commitee esos cambios primero
   (mensaje sugerido: `fix(upload): …`) o que los descarte? Si es un
   cambio no relacionado, mejor un branch separado."
3. Do not proceed until resolved.

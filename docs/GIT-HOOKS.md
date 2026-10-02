# Git Hooks — why they weren't being used, and how they now execute automatically

> The incident: rounds 3–11 were committed locally but **never pushed** —
> 13 commits sat stranded on `main` while GitHub sat at round 2. This
> document is the post-mortem, the fix, and the verification recipe.

---

## Part 1 — Why the git hooks were NOT being used

Four independent causes, all confirmed by inspection on 2026-10-02:

### 1. The hooks were never installed — only authored

The hook scripts existed in the repo as a **portable kit** (committed at
round 2 inside `portable-workflows/zai-redeploy-kit/assets/git-hooks/`, plus
loose copies at the repo root `git-hooks/`), but **no installer ever ran in
this container lineage**:

```
$ git config --get core.hooksPath     → (empty)
$ ls .git/hooks/                       → *.sample only   ← hooks NEVER armed
$ ls scripts/                          → (did not exist)
```

Git does **not** look at repo folders for hooks. It looks at
`.git/hooks/` (or `core.hooksPath`) — and a `.git/hooks/` directory with
only `*.sample` files is git's factory default for "no hooks". Authoring
hook scripts and committing them does precisely **nothing** until one of
those two wiring steps runs.

### 2. The instantiation step was skipped when the kit landed

The kit's own README prescribes a one-command instantiation
(`instantiate.sh --repo … --pat …`) that creates `scripts/` (dev server
launcher, redeploy spine, hook installer) and bakes the repo/PAT config.
That step never ran here — the kit's **assets** were committed, but the
`scripts/` directory they instantiate into never existed in this container.
The round-3+ sessions inherited: a dev server, a git repo, worklogs — and
zero hook wiring.

### 3. The loose root `git-hooks/` copies were broken even if installed

The root-level copies (`git-hooks/commit-msg`,
`git-hooks/pre-commit-methodology`, …) were straight ports from the source
repo (**Free-Trader-Remake**) and depended on files that were never copied:

```
commit-msg:            exec bash "$ROOT/scripts/enforce-methodology.sh" …   ← absent
pre-commit-methodology: bash "$SCRIPT_DIR/../enforce-methodology.sh"        ← absent
pre-commit (wrapper):  globs "$ROOT/scripts/git-hooks/pre-commit-*"         ← absent
post-commit:           pushes to remotes "codeberg" + "github"              ← neither configured
```

Wiring them in would not have restored the intended behavior — the
`commit-msg` hook would have **errored on every commit** (exec of a missing
script), and the auto-push had no remotes to push to anyway.

### 4. No remotes were configured — so nothing could ever push

`git remote -v` was empty. Even a working post-commit auto-push had
nowhere to go. The remotes were lost when this container was rebuilt (the
`.git` directory was re-initialized from local state; the remote config in
`.git/config` did not survive), and no later session re-added them because
nothing flagged their absence — the hooks that would have pushed were the
very things that weren't running.

### The structural lesson (why this class of failure is silent)

- **Git hooks are local-only.** GitHub never executes your hooks on push —
  server-side enforcement requires GitHub Actions. Before round 12 this
  repo had no `.github/workflows/` either, so *no* gate existed anywhere:
  not locally (hooks unarmed), not remotely (no CI).
- **Container rollbacks silently revert `.git/`** — hook symlinks,
  `core.hooksPath`, remotes, credentials: all live in `.git/` or
  `.git/config`, none of which is tracked by the repo. This is the exact
  failure class the kit documents ("`.git/hooks/` symlinks are the first
  thing a container rollback silently reverts").
- **Nothing observable breaks.** Commits succeed. `git status` is clean.
  The only symptom is the one that manifested: the remote quietly falls
  months behind (round 2 vs round 11).

---

## Part 2 — The fix (what runs now)

### The hook stack — armed by `git config core.hooksPath scripts/git-hooks`

| Hook | Fires | What it does |
|---|---|---|
| `pre-commit` (wrapper) | before every commit | Runs every `scripts/git-hooks/pre-commit-*` sub-hook in order |
| `pre-commit-gitleaks` | ↳ sub-hook | Secret scan of **staged** changes — `gitleaks detect --staged --redact` when installed (respects `.gitleaks.toml`), grep fallback otherwise. Blocks the commit on a hit |
| `pre-commit-lint` | ↳ sub-hook | ESLint pass over **staged** `.ts/.tsx/.js/.jsx` only (`--cache`, near-instant on repeat). Blocks on errors |
| `commit-msg` | message stage | Hygiene gate: real subject required (≥ 12 chars, ≤ 100, no generic one-worders). Merge/daemon/checkpoint subjects exempt |
| `post-commit` | after every commit on `main` | **Auto-push to every configured remote** (remotes pointing at the same URL are deduped — see the race note below), with the PAT drop-file self-heal applied first, and non-fast-forward recovery (force-push **with lease** only after verifying the remote tip is an ancestor of local HEAD) |

Plus the standing support tooling:

| Tool | What it does |
|---|---|
| `scripts/setup-git-hooks.sh` | The idempotent installer (sets `core.hooksPath`, chmods, verifies) |
| `scripts/github-pat-refresh.sh` | Self-healing PAT: validates a token dropped at `upload/GITHUB-PAT.txt` (gitignored), re-points remotes, consumes the drop-file. `--status` reports auth health |
| `scripts/github-catchup.sh` | One-step stale-remote realignment (verify → force-push main → purge stale branches → verify) |
| `scripts/auto-commit-daemon.py` | WIP checkpoint daemon (quiet-window + 10-min max-age force-save) — commits through the same gates, never `--no-verify`, never pushes (post-commit does that) |
| `scripts/redeploy.sh` / `scripts/dev.sh` | The deploy spine / the only correct dev-server launch (setsid, 2 GB heap) |

### The verification receipt (2026-10-02, first armed commit `5839c32`)

```
⚠ gitleaks not installed — grep-based fallback scan (less accurate).
✓ grep fallback: no obvious secrets detected in staged changes

[.git/auto-push.log]
pat-refresh: drop-file detected — applying before push
pat-refresh: drop-file token VALIDATED + APPLIED (sha=d485d1d7a5d5) — push unblocked
post-commit: HEAD=5839c329… branch=main
  ✓ github (push ok, 1s)
  ⚠ origin (non-fast-forward — attempting recovery)
  ↻ origin (remote tip is ancestor of local HEAD — force-pushing)
  ✓ origin (push ok, 3s)
```

Every layer observed firing: secret scan → message gate → PAT self-heal →
dual-remote push → race recovery. Remote tip == local HEAD after.

### The alias-race fix (2026-10-02, round 14 — `9d00112`→next)

The receipt above shows a cosmetic-but-real defect: `origin` hit the
non-fast-forward recovery path on **every** commit. Root cause: `github` and
`origin` are aliases of the *same* repository URL, and the hook pushed both in
parallel — the two pushes race each other on GitHub's server-side ref lock,
and the loser is rejected as non-fast-forward, burning a fetch +
force-with-lease round-trip each time. It always recovered, so pushes never
failed, but the log noise masked real non-fast-forward events (the signal the
recovery path exists to surface).

**Fix**: `post-commit` now normalizes each remote URL (credential-stripped)
and dedupes before pushing — first remote name per unique URL wins, skipped
aliases are logged as `≡ alias (deduped)`. The same fix is mirrored into the
portable kit (`portable-workflows/zai-redeploy-kit/assets/git-hooks/post-commit`).
A genuine non-fast-forward now means what it says: the remote genuinely moved.

---

## Part 3 — How the hooks now execute AUTOMATICALLY (the arming ladder)

The fix is not "run the installer once" — it's four redundant arming
layers, so the next sandbox/rollback/fresh clone re-arms itself:

| # | Layer | When it arms the hooks |
|---|---|---|
| 1 | **`package.json` → `"prepare": "bash scripts/setup-git-hooks.sh"`** | **Every `bun install`** — bun runs the root project's `prepare` lifecycle script, which sets `core.hooksPath`. This is the automatic path: any session that installs dependencies gets armed hooks as a side effect |
| 2 | **`core.hooksPath` → `scripts/git-hooks/` (tracked in git)** | The hooks live **inside the repo**. A work-tree restore, `git reset --hard`, or re-clone brings the hook *scripts* along; only the one-line `.git/config` pointer can be lost — and layers 1/3/4 restore it |
| 3 | **`scripts/redeploy.sh`** | Every redeploy (pull mode or `--fresh`) runs `setup-git-hooks.sh` explicitly after install |
| 4 | **The rollback playbook** (`docs/REDEPLOY.md`) | Step 4 of the documented recovery is always "re-run the hook setup" |

### The one command to verify hooks are armed (run this after ANY restore)

```bash
git config --get core.hooksPath     # MUST print: scripts/git-hooks
```

If it prints nothing, run `bash scripts/setup-git-hooks.sh` (or just
`bun install` — the prepare script does it).

### Emergency bypass (leaves a reflog record — use sparingly)

```bash
git commit --no-verify          # skips pre-commit + commit-msg
NO_GITLEAKS_HOOK=1 git commit … # skips just the secret-scan sub-hook
NO_LINT_HOOK=1     git commit … # skips just the eslint sub-hook
```

---

## Part 4 — Server-side enforcement (the half git hooks can't do)

Client hooks protect the *author's* machine; only GitHub protects the
*repo*. `.github/workflows/` now carries:

- **`ci.yml`** — every push/PR: ESLint + `tsc --noEmit` + gitleaks
  full-history secret scan (respects `.gitleaks.toml`)
- **`ui-audit.yml`** (manual dispatch) — boots the app on the runner,
  runs an agent-browser a11y (axe-core) audit + screenshots, stages the
  two design-skill repos as the reviewer rubric, uploads artifacts
- **`security-audit.yml`** (manual dispatch + weekly) — gitleaks,
  dependency audit (`bun audit`), semgrep, stages
  cloudflare/security-audit-skill as the methodology rubric

See `docs/prompts/AUDIT-REDEPLOY-PROMPT.md` for the AI-session prompt that
pairs with these workflows.

---

## Part 5 — The PAT storage model (read before making this repo public)

This is a **private** repo using the R94 owner-directed pattern: the PAT is
deliberately embedded in exactly **two committed files** so any fresh
sandbox can redeploy from GitHub alone:

- `scripts/redeploy.sh` → `DEFAULT_PAT`
- `docs/REDEPLOY-PROMPT.md` → base64 primary + raw fallback (survives
  display-redaction copy paths)

…and allowlisted in `.gitleaks.toml` for exactly those two paths.

**Rules:**

1. **Never make this repo public** without first removing the PAT from
   both files AND rotating the token on GitHub.
2. **Rotation protocol**: mint a fresh fine-grained token
   (KeyWolfpack/fsbo → Contents: Read+write) → paste into
   `upload/GITHUB-PAT.txt` (gitignored) → the next commit's post-commit
   hook validates + applies it automatically → then re-bake the new token
   into the two files (update the base64 with
   `printf '%s' '<raw>' | base64 -w0`).
3. **Health check any time**: `bash scripts/github-pat-refresh.sh --status`

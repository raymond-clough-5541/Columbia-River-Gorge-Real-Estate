# Redeploy — the operational playbook for KeyWolfpack/fsbo

> **Purpose:** the environment contract for this repo (instantiated from
> `portable-workflows/zai-redeploy-kit`, round 12). ANY environment trouble
> — fresh sandbox, container rollback, missing hooks, dead PAT, services
> down — reads this file + `docs/REDEPLOY-PROMPT.md` FIRST and follows the
> playbook. **Never ad-hoc recovery.**

---

## Quick start

```bash
bash scripts/redeploy.sh                    # pull latest + restart (the common case)
PAT=<token> bash scripts/redeploy.sh --fresh  # full bootstrap (brand-new sandbox)
bash scripts/redeploy.sh --seed              # additionally re-seed the corridor ledger
```

The PAT lives embedded in `scripts/redeploy.sh` (`DEFAULT_PAT`) and
`docs/REDEPLOY-PROMPT.md` Step 1 (redaction-proof base64 + raw fallback) —
the R94 owner-directed pattern for a **private** repo (see
`docs/GIT-HOOKS.md` Part 5 for the rotation/public-repo rules). If both go
stale: mint a fresh fine-grained token (KeyWolfpack/fsbo, Contents:
Read+write) → paste into `upload/GITHUB-PAT.txt` → the hooks/daemon apply
it automatically, or run `bash scripts/github-catchup.sh`.

---

## The enforcement stack (how this repo protects itself)

Armed by `bash scripts/setup-git-hooks.sh` — and **automatically** by every
`bun install` (the `prepare` script) and every `scripts/redeploy.sh` run.

| Hook | Fires | What it does |
|---|---|---|
| `pre-commit` (wrapper) | before every commit | Runs every `scripts/git-hooks/pre-commit-*` sub-hook |
| `pre-commit-gitleaks` | ↳ | Secret scan of staged changes (gitleaks w/ `.gitleaks.toml` allowlist, grep fallback). **Blocks** on a hit |
| `pre-commit-lint` | ↳ | ESLint over staged `.ts/.tsx/.js/.jsx` (`--cache`). **Blocks** on errors |
| `commit-msg` | message stage | Subject hygiene: specific one-liner required (≥ 12, ≤ 100 chars; generic one-worders blocked; merge/checkpoint subjects exempt) |
| `post-commit` | after every commit on `main` | **Auto-push to `github` + `origin`** + PAT drop-file self-heal + non-fast-forward recovery (force-with-lease only after ancestry check) |
| checkpoint daemon | continuous | `scripts/auto-commit-daemon.py` (start: `bash scripts/start-auto-commit.sh`) — WIP auto-save (60s quiet window, 10-min max-age force). Commits through the same gates; never pushes (the hook does); never `--no-verify` |

**Verify after any restore:**

```bash
git config --get core.hooksPath     # MUST print: scripts/git-hooks
bash scripts/setup-git-hooks.sh     # re-arm if empty (idempotent)
tail .git/auto-push.log             # push health; DIVERGED = see below
```

Full explanation of why the hooks were dead before round 12 and how the
arming ladder works: **`docs/GIT-HOOKS.md`**.

---

## Container rollback / divergence recovery (the playbook)

Symptoms: local `main` sits on an old chain; `git pull --ff-only` fails;
`.git/auto-push.log` shows rejected non-fast-forward pushes; round
artifacts vanish from disk; `core.hooksPath` unset.

```bash
# 1. Network truth first — NEVER trust local tracking refs:
git ls-remote github main && git ls-remote origin main

# 2. Preserve the local line (cheap insurance — it may hold unpushed work):
git branch backup-pre-reconcile-$(date +%s)

# 3. Hard-reset to the verified remote tip (the hash from ls-remote):
git reset --hard <verified-remote-tip>

# 4. RE-ARM the enforcement (rollbacks disarm it silently):
bash scripts/setup-git-hooks.sh

# 5. Restore environment + restart (also re-arms via prepare):
bash scripts/redeploy.sh
```

**What a rollback destroys:** local-only artifacts (uncommitted work older
than the daemon's quiet window, /tmp state).
**What survives:** every commit (auto-pushed at commit time) + the
checkpoint daemon's continuous saves + the committed SQLite database
(`db/custom.db` ships with the repo).

---

## The self-healing PAT (the drop-file protocol)

1. Mint a fresh fine-grained token: github.com → Settings → Developer
   settings → Fine-grained tokens → **KeyWolfpack/fsbo** → **Contents:
   Read+write**
2. Paste it into `upload/GITHUB-PAT.txt` (gitignored — never committed)
3. Done. The post-commit hook (every commit) and the daemon (every poll)
   validate it, re-point the remotes, and consume the drop-file
   (`.applied-<ts>` / `.rejected-<ts>` suffixes — a bad drop never loops).

- Health check: `bash scripts/github-pat-refresh.sh --status`
- Stale remote (e.g. after a history rewrite): `bash scripts/github-catchup.sh`
- Then re-bake the token into the two deliberate carriers
  (`scripts/redeploy.sh` DEFAULT_PAT + `docs/REDEPLOY-PROMPT.md` base64) —
  `printf '%s' '<raw>' | base64 -w0` for the prompt's Step 1 string.

---

## The dev server contract

- `bash scripts/dev.sh` is the ONLY correct launch: `setsid --fork`
  (survives session reaping) + `--max-old-space-size=2048` (the 1024MB
  default crashes Next.js 16 Turbopack) + port 3000 (the only user-visible
  port; the preview panel proxies it).
- It also mints `.env` (`DATABASE_URL=file:../db/custom.db`) when the
  sandbox trimmed it — `.env` is untracked since round 12.
- Never run two instances (`ss -tlnp | grep 3000` before starting).
- `dev.log` is the log source — read the recent tail after every change.

---

## The app-specific facts (what you're deploying)

- Single-route SPA on `/` with hash fragments (`#/matrix`,
  `#/projections`, `#/listings`, `#/submarket/<slug>`) — the user sees only
  `/`; do not add page routes.
- Data: Prisma + SQLite (`db/custom.db`, tracked — data ships with the
  repo). `bun run db:push` syncs schema; `bun prisma/seed.ts` reseeds
  (11 submarkets + 16 listings). Production path: `supabase/migration.sql`
  (PostgreSQL DDL + RLS + identical seed).
- API routes: `/api/stats`, `/api/submarkets`, `/api/submarkets/[slug]`,
  `/api/listings`.
- CI + audits: `.github/workflows/ci.yml` (every push), `ui-audit.yml` +
  `security-audit.yml` (manual/weekly) — paired with
  `docs/prompts/AUDIT-REDEPLOY-PROMPT.md`.
- Methodology: `portable-skills/` (27 skills; `zai-fullstack-session`
  first) + `portable-workflows/` (executable packages).
- Roadmap: `docs/EXPANSION-PLAN.md`.

---

## Files this procedure depends on (all committed to this repo)

- `scripts/redeploy.sh` — the deploy spine (pull/fresh/seed)
- `scripts/dev.sh` — the only correct dev-server launch
- `scripts/setup-git-hooks.sh` + `scripts/git-hooks/*` — the enforcement stack
- `scripts/github-pat-refresh.sh` + `scripts/github-catchup.sh` — the PAT chain
- `scripts/auto-commit-daemon.py` + `start/stop-auto-commit.sh` — checkpointing
- `docs/REDEPLOY-PROMPT.md` — the copy-paste AI bootstrap (PAT in base64)
- `docs/GIT-HOOKS.md` — the hook post-mortem + arming ladder + PAT rules

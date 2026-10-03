# zai-redeploy-kit — the reproducible environment contract for any full-stack Z.ai project

> **Module 21** (DR-14 portable workflow) · Generated R225 from the
> Free-Trader-Remake tooling proven across 5 container rollbacks, a
> dead-PAT incident (R222), a GitHub history rewrite + catch-up
> (R221/R224), and daily dual-remote auto-pushes.

## What it gives any repo

One command turns ANY GitHub repo (any full-stack Z.ai project — Next.js
16 + bun sandbox pattern) into a self-recovering environment:

| Capability | The file that provides it |
|---|---|
| Pull-latest + restart, or full fresh-sandbox bootstrap | `scripts/redeploy.sh` |
| The dev server that never dies (setsid daemon, 2GB heap) | `scripts/dev.sh` |
| Secret-scanning pre-commit + auto-push-every-remote post-commit | `scripts/git-hooks/*` + `setup-git-hooks.sh` |
| The self-healing PAT (drop-file protocol, ~4ms fast path) | `scripts/github-pat-refresh.sh` |
| The one-step stale-remote realignment (force-push + stale-ref purge) | `scripts/github-catchup.sh` |
| Continuous WIP checkpointing (a rollback loses minutes, not work) | `scripts/auto-commit-daemon.py` + start/stop |
| The AI-agent bootstrap prompt (PAT in redaction-proof base64) | `docs/REDEPLOY-PROMPT.md` |
| The operational playbook (rollback recovery, enforcement stack) | `docs/REDEPLOY.md` |

## The one-command wiring (into any repo)

```bash
bash portable-workflows/zai-redeploy-kit/instantiate.sh \
     --repo YOUR_OWNER/YOUR_REPO \
     --dir /path/to/the/project \
     --pat <fine-grained PAT>        # or $PAT env, or <dir>/upload/GITHUB-PAT.txt
```

The instantiator **validates the token live before writing anything**,
bakes all 13 files (owner/repo/token/base64 substituted), gitignores
`upload/`, syntax-checks every generated script, and arms the hooks.
Re-runs are refused without `--force` (an existing contract is never
silently clobbered).

The token is stored in exactly two places, both by design (the R94
pattern, owner-directed): `scripts/redeploy.sh` `DEFAULT_PAT` and
`docs/REDEPLOY-PROMPT.md` (base64 primary + raw fallback — survives
every copy path through redacting displays). Nowhere else, never printed.

## After instantiating

1. **Commit the generated files** — every future sandbox then recovers
   from the repo alone (`bash scripts/redeploy.sh`).
2. **Start the daemon**: `bash scripts/start-auto-commit.sh`.
3. **Paste `docs/REDEPLOY-PROMPT.md`** into any new AI session — it is
   the complete bootstrap (PAT reconstruction, deploy, the standing
   rules, the rollback playbook).

## Design rules carried over from the source repo

- **Network truth first**: `git ls-remote` beats every local tracking
  ref (a tracking ref can sit stale for weeks — proven twice).
- **Hooks re-arm after ANY restore**: `.git/hooks/` symlinks are the
  first thing a container rollback silently reverts.
- **The remotes are the source of truth**: local chains go stale; every
  real commit is pushed at commit time.
- **Never `bun run dev`**: the 1024MB default crashes Next.js 16
  Turbopack and a foreground process dies with the shell — `scripts/dev.sh`
  (setsid --fork + 2048MB) is the only correct launch.
- **Mini-services get their own `bun install`** — the root install does
  not cover `mini-services/*/`.
- **The PAT is a drop-file citizen**: dead tokens self-heal via
  `upload/GITHUB-PAT.txt`; no owner action beyond the paste.

## Provenance

- Source repo: `QuarrelSweet/Free-Trader-Remake` (codeberg) /
  `KeyWolfpack/Free-Trader-Remake` (github) — the docs/REDEPLOY.md +
  REDEPLOY-PROMPT.md + scripts/spine that survived R39→R225.
- The PAT mechanism is module 20 (`portable-workflows/github-pat-selfheal/`)
  — this kit embeds its auto-detecting portable edition.
- The kit itself is instantiated per-repo; this folder stays canonical
  and re-instantiable forever.

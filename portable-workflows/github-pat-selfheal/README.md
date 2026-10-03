# github-pat-selfheal — the self-healing GitHub push chain (portable package)

The failure class it prevents: **a deploy token expires silently and every
automatic push fails quietly** — to the owner it looks like "nothing was
pushed", and the sync drifts for days (the R222 incident: the token died
2026-09-29/30, GitHub served a stale pre-purge history until the owner
noticed and asked for the fix).

## What's in the package

| File | What it does |
|---|---|
| `github-pat-refresh.sh` | The DROP-FILE protocol: validates a fresh token pasted into `upload/GITHUB-PAT.txt`, re-points the `github`/`origin` remotes, renames the drop `.applied-<ts>` (or `.rejected-<ts>` for a bad token — never retried forever). `--status` reports current auth health. ~4ms fast path when no drop-file exists. |
| `github-catchup.sh` | The one-step realignment for when a remote fell behind (e.g. after a history rewrite): auth check → force-push main → delete every stale non-main ref → verify tips equal. |

Both are zero-config by default: the repo URL auto-detects from the
`github`/`origin` remotes (credentials stripped), the token rides the
standard `x-access-token` username. Env overrides: `GH_REMOTE_URL`,
`DROP_DIR`, `REMOTES`, `MAIN_BRANCH`, `PUSH_REMOTE`.

## The wiring (copy into any project)

1. Copy this folder to `<project>/scripts/github-pat-selfheal/` (or keep
   it standalone — both scripts resolve their own location).
2. Ensure `upload/` (or your `DROP_DIR`) is **gitignored** — the dropped
   token must never be committable.
3. Wire the refresh into BOTH:
   - the **post-commit** hook (before the push loop):
     `bash "$REPO/scripts/github-pat-selfheal/github-pat-refresh.sh" || true`
   - any **file-watcher daemon's** poll loop (failure-isolated, ~15s cadence)
   so pushes heal even when no commit is firing.
4. On a push failure with `Authentication failed` / `Invalid username or
   token`, log the fix hint: *mint a fresh fine-grained token (Contents:
   Read and write) → paste into upload/GITHUB-PAT.txt → next cycle
   self-heals; run github-catchup.sh once if the remote fell behind.*

## The owner's recovery path (one action, no commands)

1. github.com → Settings → Developer settings → Fine-grained tokens →
   the repo → Contents: **Read and write** → generate.
2. Paste the token into `upload/GITHUB-PAT.txt` in the project.
3. (Only if the remote fell behind) ask the agent to run
   `github-catchup.sh`, or run it: `bash scripts/github-pat-selfheal/github-catchup.sh`

Within seconds of the drop-file landing, the remotes re-point and the
next push succeeds. A rejected token renames itself `.rejected-<ts>` and
the log (`.git/auto-push.log`) records the reason.

## Security properties

- The token is **never printed** (SHA-256 prefixes only, in logs).
- The token is **never committed** (the drop folder must be gitignored —
  verified in the source project; the scripts refuse nothing else because
  gitignore enforcement is the project's job).
- The token only ever lands in the git remote URLs (`.git/config`,
  machine-local) — the same place it already lived.
- The `.applied-<ts>` / `.rejected-<ts>` renames are the audit trail.

## Self-test (run in the target project after wiring)

```bash
bash scripts/github-pat-selfheal/github-pat-refresh.sh --status   # current health
echo "github_pat_BOGUS_selftest" > upload/GITHUB-PAT.txt
bash scripts/github-pat-selfheal/github-pat-refresh.sh            # → FAIL rc=1, .rejected rename, remotes unchanged
rm -f upload/GITHUB-PAT.txt.rejected-*                           # clean the self-test artifact
bash scripts/github-pat-selfheal/github-pat-refresh.sh; echo "rc=$?"  # no drop → rc=0 in ~4ms
```

Deployed instance (the source project): `scripts/github-pat-refresh.sh`
+ `scripts/github-catchup.sh` (R222) — same protocol, repo-pinned config.

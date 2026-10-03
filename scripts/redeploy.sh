#!/usr/bin/env bash
# ============================================================
# redeploy.sh — the one-command deploy spine for KeyWolfpack/fsbo
# (instantiated from portable-workflows/zai-redeploy-kit — R225 pattern).
#
# Modes:
#   bash scripts/redeploy.sh            # PULL mode: sync + install + verify
#                                        (the common case: rolled-back container)
#   bash scripts/redeploy.sh --fresh    # FRESH mode: bootstrap .git from the
#                                        remote first (brand-new sandbox), then
#                                        the same install + verify
#   bash scripts/redeploy.sh --seed     # additionally re-seed the database
#
# PAT resolution order: $1 / $PAT env / DEFAULT_PAT below / drop-file
# upload/GITHUB-PAT.txt. The embedded DEFAULT_PAT is the R94 owner-directed
# pattern (PRIVATE repo only — see docs/REDEPLOY.md before making this
# repo public; rotate the token if it ever leaks).
# ============================================================
set -uo pipefail

GH_OWNER="KeyWolfpack"
GH_REPO="fsbo"
MAIN_BRANCH="main"
DEFAULT_PAT="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"

cd "$(dirname "$0")/.."
ROOT="$PWD"
FRESH=0
SEED=0
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=1 ;;
    --seed)  SEED=1 ;;
  esac
done

say()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 0. Resolve + live-verify the PAT ────────────────────────────────────────
PAT="${1:-${PAT:-$DEFAULT_PAT}}"
if [ -z "$PAT" ] || [ "$PAT" = "$DEFAULT_PAT" ]; then
  # The embedded token may be stale — a drop-file token always wins.
  for df in upload/GITHUB-PAT.txt upload/github-pat.txt; do
    [ -f "$df" ] || continue
    say "PAT drop-file detected ($df) — applying..."
    bash scripts/github-pat-refresh.sh || true
    PAT=""
    break
  done
fi
if [ -n "$PAT" ]; then
  say "Verifying GitHub authentication (live ls-remote)..."
  GIT_TERMINAL_PROMPT=0 git ls-remote "https://x-access-token:${PAT}@github.com/${GH_OWNER}/${GH_REPO}.git" HEAD >/dev/null 2>&1 \
    || die "PAT rejected. Mint a fresh fine-grained token (${GH_OWNER}/${GH_REPO}, Contents: Read+write), paste it into upload/GITHUB-PAT.txt, and re-run."
  ok "GitHub auth working"
fi

REPO_URL="https://x-access-token:${PAT}@github.com/${GH_OWNER}/${GH_REPO}.git"

# ── 1. Ensure remotes ───────────────────────────────────────────────────────
for r in github origin; do
  if git remote get-url "$r" >/dev/null 2>&1; then
    git remote set-url "$r" "$REPO_URL"
  else
    git remote add "$r" "$REPO_URL"
  fi
done
ok "remotes github + origin → ${GH_OWNER}/${GH_REPO}"

# ── 2. Fresh bootstrap (brand-new sandbox: template .git replacement) ───────
if [ "$FRESH" = "1" ] && [ ! -d .git ]; then
  say "FRESH mode: initializing .git from ${GH_OWNER}/${GH_REPO}..."
  git init -b "$MAIN_BRANCH"
  git fetch github "$MAIN_BRANCH"
  git reset --hard FETCH_HEAD
  git branch --set-upstream-to="github/$MAIN_BRANCH" "$MAIN_BRANCH"
  ok "repo bootstrapped in place (node_modules preserved)"
fi

# ── 3. Pull mode: network truth first, fast-forward to it ───────────────────
say "Syncing with the remote (network truth)..."
REMOTE_TIP=$(GIT_TERMINAL_PROMPT=0 git ls-remote github "$MAIN_BRANCH" 2>/dev/null | awk '{print $1}')
if [ -n "$REMOTE_TIP" ]; then
  LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")
  if [ "$REMOTE_TIP" != "$LOCAL_HEAD" ]; then
    git fetch --quiet github "$MAIN_BRANCH" || true
    if git merge-base --is-ancestor "$LOCAL_HEAD" "github/$MAIN_BRANCH" 2>/dev/null; then
      say "Local is behind — fast-forwarding to remote tip ${REMOTE_TIP:0:7}"
      git reset --hard "github/$MAIN_BRANCH"
    elif git merge-base --is-ancestor "github/$MAIN_BRANCH" HEAD 2>/dev/null; then
      say "Local is AHEAD of remote (unpushed work) — keeping local; the next commit auto-pushes"
    else
      say "DIVERGED from remote — preserving local on a backup branch, then resetting to network truth"
      git branch "backup-pre-reconcile-$(date +%s)" 2>/dev/null || true
      git reset --hard "$REMOTE_TIP"
    fi
  else
    ok "Already at remote tip ${REMOTE_TIP:0:7}"
  fi
else
  say "Could not reach remote — continuing with local state"
fi

# ── 4. Dependencies (also ARMS THE HOOKS via the prepare script) ────────────
say "bun install (runs package.json prepare → arms git hooks)..."
if [ -d node_modules/next ]; then
  bun install || die "bun install failed"
else
  bun install || die "bun install failed"
fi
ok "dependencies installed"

# ── 5. Database ─────────────────────────────────────────────────────────────
say "Prisma: generate client + sync schema..."
[ -f .env ] || printf 'DATABASE_URL="file:../db/custom.db"\n' > .env
bunx prisma generate >/dev/null 2>&1 || die "prisma generate failed"
bunx prisma db push --accept-data-loss >/dev/null 2>&1 || die "prisma db push failed"
ok "schema synced (SQLite: db/custom.db — tracked in git, data ships with the repo)"
if [ "$SEED" = "1" ]; then
  say "Re-seeding the corridor ledger..."
  bun prisma/seed.ts || die "seed failed"
  ok "seed complete"
fi

# ── 6. Hooks (belt + suspenders: prepare already armed them) ────────────────
bash scripts/setup-git-hooks.sh || die "hook arming failed"

# ── 7. Dev server (only if not already serving) ────────────────────────────
if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
  ok "port 3000 already serving — dev server left as-is"
else
  bash scripts/dev.sh || die "dev server failed to start"
fi

# ── 8. Verify the stack ─────────────────────────────────────────────────────
say "Verifying the app answers..."
sleep 3
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/stats || echo "000")
if [ "$HTTP" = "200" ]; then
  ok "GET /api/stats → 200 — platform live on :3000"
else
  say "GET /api/stats → $HTTP (may still be compiling — check dev.log tail in ~30s)"
fi

echo ""
ok "Redeploy complete. Remotes: github + origin. Hooks: armed. Log: dev.log"
echo "  Next: read the LAST entry of worklog.md (source of truth), then continue."

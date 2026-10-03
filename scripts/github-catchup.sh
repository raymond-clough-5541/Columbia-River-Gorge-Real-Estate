#!/usr/bin/env bash
# ============================================================
# github-catchup.sh — the one-step GitHub realignment
# (PORTABLE edition — portable-workflows/github-pat-selfheal/)
#
# For when GitHub fell behind: a history rewrite happened elsewhere
# (e.g. a secrets/typos purge via git filter-repo) and the clean chain
# was force-pushed to the other remotes but GitHub's token had died.
# This script (run once, when a fresh PAT exists):
#   0. applies a waiting drop-file token (github-pat-refresh.sh)
#   1. verifies GitHub auth (fails fast with mint-a-token instructions)
#   2. force-pushes MAIN_BRANCH to the github remote
#   3. deletes EVERY non-main branch on github (stale refs that carry
#      the pre-rewrite history)
#   4. verifies github == local
#
# Portable configuration (zero-config defaults):
#   MAIN_BRANCH  default: main
#   REMOTES      default: "github origin" (auth check + push target =
#                the first; re-pointed by the refresh script)
#
# SAFETY: force-push only after you have verified local main is the
# canonical chain (it should equal your other remote's tip). This
# script checks that github's refs are being replaced, not merged.
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
PUSH_REMOTE="${PUSH_REMOTE:-github}"

LOG="$(git rev-parse --git-dir 2>/dev/null || echo .)/auto-push.log"
ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
logln() { echo "[$(ts)] catchup: $*" >> "$LOG" 2>/dev/null || true; }

say()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- 0. Apply a waiting drop-file PAT ---
if [[ -n "${1:-}" || -n "${PAT:-}" || -f upload/GITHUB-PAT.txt || -f upload/github-pat.txt ]]; then
  say "Applying PAT (arg/env/drop-file)..."
  bash "$SCRIPT_DIR/github-pat-refresh.sh" "${1:-}" \
    || die "PAT rejected. Mint a fresh fine-grained token (your repo, Contents: Read and write), then re-run with it as the argument or paste it into upload/GITHUB-PAT.txt"
fi

# --- 1. Auth check ---
say "Verifying GitHub authentication..."
git ls-remote "$PUSH_REMOTE" HEAD >/dev/null 2>&1 \
  || die "GitHub auth failing. Mint a fresh token and run: bash github-catchup.sh <token>  (or paste it into upload/GITHUB-PAT.txt)"
ok "GitHub auth working"

# --- 2. Force-push main ---
LOCAL_MAIN="$(git rev-parse "$MAIN_BRANCH")"
say "Force-pushing $MAIN_BRANCH ($LOCAL_MAIN) → $PUSH_REMOTE..."
logln "catchup start: force-push $MAIN_BRANCH=$LOCAL_MAIN"
OUT="$(git push --force --no-verify "$PUSH_REMOTE" "$MAIN_BRANCH" 2>&1)" \
  || { logln "force-push FAILED: $OUT"; die "force-push failed: $OUT"; }
ok "$PUSH_REMOTE $MAIN_BRANCH = local (clean history)"
logln "force-push ok: $MAIN_BRANCH=$LOCAL_MAIN"

# --- 3. Delete every non-main branch ---
say "Enumerating remote branches (non-main refs are stale)..."
BRANCHES="$(git ls-remote --heads "$PUSH_REMOTE" | awk -F'refs/heads/' '{print $2}')"
if [[ -z "$BRANCHES" ]]; then
  ok "No other branches (nothing to delete)"
else
  DELETED=0; FAILED=0
  while IFS= read -r b; do
    [[ -z "$b" ]] && continue
    if git push "$PUSH_REMOTE" --delete "$b" >/dev/null 2>&1; then
      DELETED=$((DELETED+1)); logln "deleted branch: $b"
    else
      FAILED=$((FAILED+1)); logln "FAILED to delete branch: $b"
    fi
  done <<< "$BRANCHES"
  [[ $FAILED -eq 0 ]] && ok "Deleted $DELETED stale branch(es)" \
    || warn "Deleted $DELETED, FAILED $FAILED (see auto-push.log — likely branch protection; delete in the web UI)"
fi

# --- 4. Verify ---
GH_MAIN="$(git ls-remote "$PUSH_REMOTE" "$MAIN_BRANCH" | awk '{print $1}')"
[[ "$GH_MAIN" == "$LOCAL_MAIN" ]] \
  && ok "$PUSH_REMOTE $MAIN_BRANCH == local $MAIN_BRANCH — IN SYNC" \
  || die "$PUSH_REMOTE ($GH_MAIN) != local ($LOCAL_MAIN) — see auto-push.log"
logln "catchup complete: $MAIN_BRANCH=$LOCAL_MAIN"
echo ""
ok "Catch-up complete."

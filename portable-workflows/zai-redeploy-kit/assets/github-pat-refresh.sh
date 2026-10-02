#!/usr/bin/env bash
# ============================================================
# github-pat-refresh.sh — the self-healing GitHub PAT mechanism
# (PORTABLE edition — portable-workflows/github-pat-selfheal/)
#
# The failure class it prevents: a deploy token expires silently and
# every automatic push fails quietly — to the owner it looks like
# "nothing was pushed". The fix is a DROP-FILE protocol: paste the
# fresh token into <project>/upload/GITHUB-PAT.txt (any gitignored
# folder — set DROP_DIR below), and this script validates it, re-points
# the remotes, and renames the drop so it is never re-applied.
#
# Portable configuration (zero-config defaults):
#   GH_REMOTE_URL  base repo URL (no credentials). Default: auto-detected
#                  from the `github` remote, falling back to `origin`
#                  (embedded credentials stripped).
#   DROP_DIR       the drop-file folder (default: ./upload — MUST be
#                  gitignored in the target project!)
#   REMOTES        remotes to re-point (default: "github origin" —
#                  missing ones are skipped)
#
# The drop-file accepts a bare token or PAT=.../token=... lines; only
# github_pat_* and ghp_* token shapes are honoured. Tokens are never
# printed (hashes only), never written anywhere except the remote URLs.
# On success the drop renames to <name>.applied-<ts>; a rejected token
# renames to <name>.rejected-<ts> (a bad drop never loops forever).
#
# Wire it in (any project):
#   - post-commit hook:  bash "$REPO/scripts/github-pat-refresh.sh" || true
#     (fast path when no drop-file: one stat call, exit 0 in ~4ms)
#   - a file-watcher daemon's poll loop: same call, failure-isolated
#   - manual:            bash github-pat-refresh.sh --status
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")"

LOG="${GIT_LOG:-$(git rev-parse --git-dir 2>/dev/null || echo .)/auto-push.log}"
DROP_DIR="${DROP_DIR:-upload}"
REMOTES="${REMOTES:-github origin}"
DROP_FILES=("GITHUB-PAT.txt" "github-pat.txt")

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
logln() { echo "[$(ts)] pat-refresh: $*" >> "$LOG" 2>/dev/null || true; }

# --- Resolve the base repo URL (no credentials) ---
base_url() {
  local u="${GH_REMOTE_URL:-}"
  if [[ -z "$u" ]]; then
    local r
    for r in $REMOTES; do
      u="$(git remote get-url "$r" 2>/dev/null || true)"
      [[ -n "$u" ]] && break
    done
    u="${u#http://}"; u="${u#https://}"   # strip scheme
    u="${u#*@}"                          # strip user:token@ (token shapes contain no @)
    u="https://${u}"
  fi
  # Defense in depth: NEVER return a URL carrying credentials.
  printf '%s' "https://$(printf '%s' "${u#http://}" | sed -e 's|^https://||' -e 's|^[^@]*@||')"
}

find_dropfile() {
  local cand
  for cand in "${DROP_FILES[@]}"; do
    if [[ -f "$DROP_DIR/$cand" ]]; then
      echo "$DROP_DIR/$cand"
      return 0
    fi
  done
  return 1
}

read_token_from_file() {
  local f="$1"
  grep -vE '^\s*#' "$f" 2>/dev/null \
    | grep -oE '(github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+)' \
    | head -1
}

auth_url() { printf 'https://x-access-token:%s@%s' "$1" "$(base_url | sed 's|^https://||')"; }

token_valid() { git ls-remote "$(auth_url "$1")" HEAD >/dev/null 2>&1; }

apply_token() {
  local r
  for r in $REMOTES; do
    git remote set-url "$r" "$(auth_url "$1")" 2>/dev/null || true
  done
}

current_token_sha() {
  local u t=""
  u="$(git remote get-url "$(echo $REMOTES | awk '{print $1}')" 2>/dev/null || echo "")"
  if [[ "$u" =~ ^https://[^:]+:([^@]+)@ ]]; then t="${BASH_REMATCH[1]}"; fi
  if [[ -n "$t" ]]; then printf '%s' "$t" | sha256sum | cut -c1-12; else echo "none"; fi
}

if [[ "${1:-}" == "--status" ]]; then
  echo "repo: $(base_url)"
  echo "first remote token: sha=$(current_token_sha)"
  echo "auth test: $(git ls-remote "$(echo $REMOTES | awk '{print $1}')" HEAD >/dev/null 2>&1 && echo 'WORKING' || echo 'REJECTED (dead/expired PAT)')"
  echo "drop-file: $(find_dropfile || echo none)"
  exit 0
fi

EXPLICIT_PAT="${1:-${PAT:-}}"
if [[ -n "$EXPLICIT_PAT" ]]; then
  if token_valid "$EXPLICIT_PAT"; then
    apply_token "$EXPLICIT_PAT"
    logln "explicit PAT applied (sha=$(printf '%s' "$EXPLICIT_PAT" | sha256sum | cut -c1-12))"
    echo "OK: fresh PAT validated + applied"
    exit 0
  else
    logln "explicit PAT REJECTED (sha=$(printf '%s' "$EXPLICIT_PAT" | sha256sum | cut -c1-12))"
    echo "FAIL: github rejected the supplied token" >&2
    exit 1
  fi
fi

DF="$(find_dropfile || true)"
if [[ -z "$DF" ]]; then exit 0; fi   # fast path: nothing to do

TOK="$(read_token_from_file "$DF")"
if [[ -z "$TOK" ]]; then
  mv "$DF" "${DF}.rejected-$(date +%Y%m%dT%H%M%SZ)"
  logln "drop-file contained NO recognisable token — renamed .rejected"
  exit 1
fi
TOK_SHA="$(printf '%s' "$TOK" | sha256sum | cut -c1-12)"
if token_valid "$TOK"; then
  apply_token "$TOK"
  mv "$DF" "${DF}.applied-$(date +%Y%m%dT%H%M%SZ)"
  logln "drop-file token VALIDATED + APPLIED (sha=$TOK_SHA) — push unblocked"
  echo "OK: fresh PAT validated + applied — pushes unblocked"
  exit 0
else
  mv "$DF" "${DF}.rejected-$(date +%Y%m%dT%H%M%SZ)"
  logln "drop-file token REJECTED (sha=$TOK_SHA) — renamed .rejected"
  echo "FAIL: github rejected the dropped token — drop a fresh one." >&2
  exit 1
fi

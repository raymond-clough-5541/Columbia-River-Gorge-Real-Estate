#!/bin/bash
# ============================================================
# dev.sh — the ONLY correct dev-server launch for this repo.
#
# Two hard rules from the environment contract:
#  1. setsid --fork: plain background jobs (&, nohup &) are REAPED at the
#     Bash-call boundary — the process manager tears down the session's
#     process group. setsid creates a new session that survives.
#  2. 2048MB heap: the ~1024MB default CRASHES Next.js 16 Turbopack
#     mid-compilation. Verified stable.
#
# Also mints .env when the sandbox trimmed it (DATABASE_URL) — .env is
# gitignored (untracked since round 12) so it must be re-creatable.
#
# Usage: bash scripts/dev.sh          (kills any existing server first)
# ============================================================
set -e
cd "$(dirname "$0")/.."

# Mint-on-boot: the sandbox trims .env silently — fail-closed beats fail-open.
ensure_env_key() {
  local key="$1" val="$2"
  if [[ -f .env && "$(grep -c "^${key}=" .env 2>/dev/null)" -gt 0 ]]; then
    return 0
  fi
  if [[ -f .env ]]; then
    printf '\n%s=%s\n' "$key" "$val" >> .env
  else
    printf '%s=%s\n' "$key" "$val" > .env
  fi
  echo "  minted ${key} into .env (gitignored)"
}

# SQLite path relative to prisma/schema.prisma → ../db/custom.db
ensure_env_key DATABASE_URL "file:../db/custom.db"

# Kill any existing dev server (port 3000 is single-occupancy).
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

# Clean stale cache + log.
rm -rf .next dev.log 2>/dev/null || true

echo "Starting dev server (setsid --fork, 2GB heap, port 3000)..."
setsid --fork bash -c '
  cd "'"$PWD"'"
  NODE_OPTIONS="--max-old-space-size=2048" \
  NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/.bin/next dev -p 3000 >> dev.log 2>&1
'

sleep 15

if ss -tlnp 2>/dev/null | grep -q 3000; then
  echo "✅ Dev server running on port 3000"
  echo "   Log: dev.log (read the RECENT tail — it grows across sessions)"
else
  echo "❌ Server failed to start — check dev.log tail:"
  tail -10 dev.log 2>/dev/null
  exit 1
fi

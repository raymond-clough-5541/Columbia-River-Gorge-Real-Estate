#!/bin/bash
# ============================================================
# Dev server launcher — uses setsid --fork for true daemon mode.
#
# The dev server MUST be started with setsid --fork, otherwise the
# tini process manager (PID 1) kills it when the shell session ends.
# This is NOT an OOM issue, NOT a code issue — it's a process group
# session issue. setsid --fork creates a new session that survives.
#
# Memory: --max-old-space-size=2048 (NOT 1024 — 1024 crashes with
# Next.js 16 Turbopack compilation. 2048 is stable. Verified 2026-08-21.)
#
# Usage: bash scripts/dev.sh
# ============================================================
set -e
cd "$(dirname "$0")/.."

# R115-D (Stage D/D2 — the H2 fix): ensure the .env secrets exist BEFORE
# booting the dev server. IP_HASH_SALT has no code fallback (a missing
# salt hard-fails the invite/audit hash paths); CHAT_JWT_SECRET feeds the
# chat-token route + the chat-service. Generate fresh randoms when missing
# (never committed values — .env is gitignored).
ensure_env_secret() {
  local key="$1"
  [[ -f .env && "$(grep -c "^${key}=" .env 2>/dev/null)" -gt 0 ]] && return 0
  local val
  val="$(openssl rand -hex 32 2>/dev/null)" || { echo "FATAL: openssl unavailable — cannot generate $key"; exit 1; }
  if [[ -f .env ]]; then
    printf '\n%s=%s\n' "$key" "$val" >> .env
  else
    printf '%s=%s\n' "$key" "$val" > .env
  fi
  echo "  generated a fresh ${key} into .env (gitignored)"
}
ensure_env_secret CHAT_JWT_SECRET
ensure_env_secret IP_HASH_SALT
# R201 (the walk catch): NEXTAUTH_SECRET too — the sandbox reset
# trimmed .env past DATABASE_URL and the no-secret dev fallback is
# an EPHEMERAL RANDOM PER ROUTE BUNDLE (Turbopack compiles
# authOptions into each route's chunk): the auth bundle mints the
# session cookie with one random, every other route's bundle fails
# the JWT decryption (401 on every door). A stable secret in .env
# is the only dev-boot truth.
ensure_env_secret NEXTAUTH_SECRET

# Kill any existing dev server
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clean cache
rm -rf .next dev.log 2>/dev/null

# Start with setsid --fork (true daemon — survives shell exit)
echo "Starting dev server (setsid --fork, 2GB memory)..."
setsid --fork bash -c '
  cd "$(dirname "$0")/.."
  NODE_OPTIONS="--max-old-space-size=2048" \
  NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/.bin/next dev -p 3000 >> dev.log 2>&1
'

# Wait for server
sleep 15

# Check if alive
if ss -tlnp 2>/dev/null | grep -q 3000; then
  echo "✅ Dev server running on port 3000"
  echo "   PID: $(pgrep -f 'next-server' | head -1)"
  echo "   Log: dev.log"
else
  echo "❌ Server failed to start — check dev.log"
  tail -10 dev.log
  exit 1
fi

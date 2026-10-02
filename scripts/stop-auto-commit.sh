#!/usr/bin/env bash
# stop-auto-commit.sh — graceful shutdown of the WIP checkpoint daemon.
set -e
cd "$(git rev-parse --show-toplevel)"

if [ ! -f .auto-commit.pid ]; then
  echo "no PID file — daemon not running"
  exit 0
fi

PID="$(cat .auto-commit.pid)"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"   # SIGTERM — the daemon removes its own PID file + logs the exit
  echo "✓ auto-commit daemon stopped (PID $PID)"
else
  echo "stale PID file (PID $PID not alive) — cleaning up"
  rm -f .auto-commit.pid
fi

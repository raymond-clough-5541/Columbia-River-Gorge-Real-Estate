#!/usr/bin/env bash
# start-auto-commit.sh — launch the WIP checkpoint daemon (double-fork,
# re-parented to PID 1, survives Bash-tool process reaping).
#
# The daemon commits work-in-progress continuously (quiet-window + max-age
# force-save) so a sandbox rollback loses minutes, not work. It NEVER pushes
# (the post-commit hook does that — entirely separate tool) and NEVER uses
# --no-verify (the secret-scan + lint gates still fire).
set -e
cd "$(git rev-parse --show-toplevel)"
mkdir -p logs

if [ -f .auto-commit.pid ] && kill -0 "$(cat .auto-commit.pid)" 2>/dev/null; then
  echo "auto-commit daemon already running (PID $(cat .auto-commit.pid))"
  exit 0
fi

python3 scripts/auto-commit-daemon.py --daemon
sleep 1

if [ -f .auto-commit.pid ]; then
  echo "✓ auto-commit daemon started (PID $(cat .auto-commit.pid))"
  echo "  log: logs/auto-commit.log   stop: bash scripts/stop-auto-commit.sh"
else
  echo "✗ daemon failed to start — run 'python3 scripts/auto-commit-daemon.py' in foreground to debug" >&2
  exit 1
fi

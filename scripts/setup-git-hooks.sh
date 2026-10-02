#!/usr/bin/env bash
# ============================================================
# setup-git-hooks.sh — arm the enforcement stack. Idempotent.
#
# WHY core.hooksPath (not .git/hooks symlinks): a container rollback
# silently reverts .git/hooks/ — the documented incident class this repo's
# kit was built around. Pointing core.hooksPath at scripts/git-hooks/ means
# the hooks themselves are TRACKED IN GIT: a work-tree restore keeps them
# alive; only the one-line .git/config pointer can be lost — and it is
# re-armed by EVERY `bun install` (package.json "prepare" script) and every
# `bash scripts/redeploy.sh`.
#
# Run after ANY rollback, restore, or fresh clone:
#   bash scripts/setup-git-hooks.sh
# ============================================================
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

HOOKS_DIR="scripts/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "✗ $HOOKS_DIR/ not found — are you at the repo root?" >&2
  exit 1
fi

# 1. Point git at the tracked hooks directory.
git config core.hooksPath "$HOOKS_DIR"

# 2. Ensure every hook is executable.
chmod +x "$HOOKS_DIR"/* 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# 3. Verify + report.
echo "✓ git hooks ARMED"
echo "  core.hooksPath → $(git config --get core.hooksPath)"
echo "  hooks present:  $(ls "$HOOKS_DIR" | tr '\n' ' ')"
echo ""
echo "Fires on every commit:"
echo "  pre-commit   → secret scan (gitleaks/grep) + staged-file eslint gate"
echo "  commit-msg   → message hygiene (specific subject required)"
echo "  post-commit  → auto-push main to github + origin (PAT self-heal)"
echo ""
echo "Verify any time:  git config --get core.hooksPath   # → scripts/git-hooks"
echo "Bypass (emergency): git commit --no-verify          # leaves a reflog record"

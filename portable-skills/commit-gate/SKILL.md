---
name: commit-gate
description: Turn advisory process rules into mechanical pre-commit/commit-msg hooks that block commits missing the process artifacts — approval tokens, design-pass docs, scope declarations, battery logs, worklog entries, explained decisions, portability tokens — each failing LOUDLY with fix instructions. Use this skill when sessions skip the methodology the moment nobody is watching, when unapproved or out-of-scope code lands, or when reports ship bare decision lists.
license: MIT
---

# The Commit Gate (checks pattern)

The failure class this skill prevents: **advisory rules that a
session can skip**. Any rule enforced only by the agent remembering
it will be skipped exactly when it matters (end-of-session rush,
context pressure, a subagent with a different preamble). The gate
makes the rules mechanical: the commit itself fails.

## The pattern

Git hooks (pre-commit + commit-msg stages) that block commits
violating the methodology. Each check fails LOUDLY with fix
instructions. Bypass = `--no-verify`, which leaves a forensic reflog
record — the bypass is possible but never silent.

Two stages matter because pre-commit cannot reliably see `-m`
messages (the message file is written after pre-commit in some git
versions): staged-file checks run at pre-commit, message-token checks
at commit-msg.

## The check set (in adoption order)

1. **Approval token** — the commit message carries `[approved: <ID>]`
   matching an approved entry in the approval ledger (pairs with
   `planning-mode`).
2. **Design doc exists** — UI-touching commits reference a design
   doc (stem-matched or staged with the commit); the doc's mtime is
   older than the earliest staged change (design BEFORE code).
3. **Scope** — staged files are within the approved entry's declared
   file list (docs/worklog/logs always allowed).
4. **Battery** — code commits reference a passing test-battery log
   (types + quality + security + tests; pairs with `battery-runner`).
5. **Worklog entry** — the commit message carries `[worklog: <ID>]`
   matching a Task ID in the work log (pairs with
   `agent-context-state`).
6. **Four-axis triage** — UI commits' design docs contain the triage
   section naming all four axes (pairs with `four-axis-filter`).
7. **Explained decisions** — staged reports containing decision
   lists also contain rationale; bare lists block (pairs with
   `always-explain-format`).
8. **No screenshots staged** — PNGs under the audits tree are
   local-only; only the .md text analyses are committed.
9. **Portability token** — workflow-code commits (scripts/**,
   services/**) carry `[portable: <path>]` pointing at an existing
   portable module: a workflow is not done without its any-project
   copy.
10. **No review artifacts in the app** — staging a review/audit
    artifact into the product tree (public/, app routes) blocks the
    commit. Deletions and renames-out are allowed (removal IS the
    remediation).

## The implementation shape

- One enforcement script, two invocation modes (`pre-commit` with no
  args; `commit-msg <message-file>`), installed via symlinks from
  `.git/hooks/`.
- A docs-only bypass lane: commits touching only `docs/*`, `*.md`,
  `.gitignore`, `LICENSE`, `worklog.md` skip the code checks (docs
  never need a battery).
- A checkpoint lane for work-in-progress auto-saves: an env var +
  a literal `[checkpoint]` token in the message (self-labeling,
  logged) — an in-progress save cannot attest, so it skips the
  round-end checks but stays identifiable in history.

## Known porting note

Pre-commit hooks cannot see `-m` messages — write the message to a
file first and commit with `git commit -m "$(cat <file>)"`, or wire
the message checks at the commit-msg stage (the two-stage pattern
above).

## The wiring

1. Adopt checks incrementally — the order above is the order that
   pays for itself first.
2. Every check's failure message names the fix, not just the rule.
3. Escape hatch documented (`--no-verify` leaves the reflog record;
  checkpoints are logged) — the gate makes skipping expensive and
   visible, not impossible.

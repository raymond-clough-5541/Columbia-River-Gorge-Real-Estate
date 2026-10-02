---
name: verified-build-round
description: Build in evidence-carrying rounds instead of open-ended slogs. A round writes its plan doc FIRST, builds through layered seams (pure logic, server door, client adapter, state store, UI surface) each with its own tests, passes a one-command verification battery (full suite + lint + typecheck + smoke), walks the feature LIVE in a real browser with fresh contexts and zero-console-error checks, and ends with receipts-or-retract — every completion claim backed by a test number, a log line, or a screenshot, else retracted. Use this skill for any feature build, fix, or refactor where "it compiles" must not count as done.
license: MIT
---

# Verified Build Round

The failure class this skill prevents: **the unverified claim**. "Done"
that means "the code is written". The build that passed the happy
path once, in the agent's head. The feature that works in the test
mock and not in the browser. The fix that fixed the symptom and
silently broke the neighbor. All of these ship because nothing
forces the claim "it works" to carry evidence.

The round is that force. One unit of work, plan-first, verified at
every layer, ended with receipts or retractions — never with vibes.

## When to Use

- Any feature, fix, or refactor of non-trivial size.
- Any work where the user cannot verify the result themselves and
  must trust the agent's report.
- Teams/projects where "works on my machine" has burned them.
- Agent-driven development, where the reporter and the builder are
  the same entity — the discipline exists precisely because there is
  no independent witness.

## The Round, phase by phase

### Phase 0 — PLAN FIRST (the plan doc is written before anything)

A short plan file, committed before the build: what the round
delivers, what it deliberately does NOT do (non-goals are load-
bearing), the verification plan (what will be checked and how), the
honest boundaries. If the plan cannot be written, the task is not
understood. If the plan exceeds one round, it is two rounds — split
it now, not mid-build.

### Phase 1 — Build through the seams

Each layer ("seam") is built and tested BEFORE the next sits on it:

1. **Pure logic** — derivations, validations, state math. No I/O.
   Fully unit-testable. The seam where correctness is cheapest.
2. **Server door** — the API route/handler. Guards (auth, input
   validation), the honest error messages, the audit trail if the
   domain needs one. Tested with its own route tests.
3. **Client adapter** — the function the UI calls to reach the door.
   Fail-closed: it throws with the server's own error message; it
   NEVER optimistically writes local state before the server
   confirmed.
4. **State store** — where the client keeps the truth. Overrides,
   caches, live updates. Tested for the re-derivation paths (every
   place the session-user/state is rebuilt must apply the change —
   missed rebuild sites are the classic seam-4 bug family).
5. **UI surface** — the components. Pinned by tests only where the
   surface asserts a fact (a label's wording, a chip's presence, a
   disclosure line) — not pixel snapshots.

Why layered: when the live walk (Phase 3) breaks, the failure
localizes by seam. When a test fails, it names its layer. Flat
builds produce failures that could be anywhere.

### Phase 2 — The gates

A one-command battery runs everything, appends a timestamped log,
and reports a pass count. The battery includes:

- **The full test suite** (not just the new tests — the whole run,
  every time; regressions are the point).
- **Lint at the standing baseline** (warnings tracked, new warnings
  accounted: a warning COUNT that moves is a finding, not noise).
- **Typecheck** over the whole source tree.
- **A smoke check** that the app actually serves (dev server up, the
  main route 200s).
- **Any project-specific honesty gate** (e.g., a scan for banned
  patterns — filler text, mock data masquerading as real, disclosed
  secrets).

Gate discipline: a failed gate is fixed and RE-RUN (the log records
the fix, the re-run, and both numbers — in-round fixes are part of
the record). "I'll fix it in the next round" is how baselines rot.
The battery log path goes in the commit message — the log is
committable evidence, not console spam.

### Phase 3 — THE LIVE WALK

The phase that separates this skill from "tested": a real browser,
real user flows, fresh contexts.

- **Fresh browser context** per persona/role (long-lived contexts
  accumulate dead state — see the traps list in the checklist).
- **Real form sign-ins** — exercise the actual door, not the dev
  shortcut around it.
- **The golden path end-to-end**: click the actual buttons, submit
  the actual forms, watch the actual result render.
- **Accessibility spot-check on the touched surfaces** (first-class,
  a11y): the walk includes an accessibility pass on the surfaces this
  round changed — labels/aria on the new elements, the keyboard path
  through the new controls, contrast of the new text against its
  actual background (the machine checker where one exists), focus
  states on anything new that is interactive. The receipt lands in
  the round's ledger (what was checked, what passed, what was
  found); evidence accumulates per surface as rounds advance, and
  the whole-app accessibility receipt assembles from the per-round
  ledgers. Non-interactive text additions still get the pass
  (contrast + structure); nothing ships unexamined.
- **Zero console errors** as a gate, checked in the dev log after
  the walk — not "I didn't see any", grep-level checked.
- **Screenshots as receipts** — the states that prove the flow, kept
  with the round's records.
- **State restored** afterward: whatever the walk changed, put back
  (or documented as intentionally left).

A round that skips the live walk is a draft, not a delivery. The
walk routinely catches what tests cannot: the hydration crash, the
dead tab with zero errors, the flow that works in the mock and 404s
in the browser.

### Phase 4 — Receipts or retract

Every completion claim in the round's report carries its receipt:

| Claim shape | Receipt shape |
|---|---|
| "the tests pass" | the count, from this round's run (e.g., 37/37 new, 1177/1177 total) |
| "lint is clean" | the warning count vs. the baseline, both numbers |
| "it works live" | the screenshot paths + the dev-log lines + the zero-error check |
| "the door rejects X" | the actual 4xx + its message, from the log |
| "state restores" | what was mutated, what was restored, how verified |

No receipt → the claim is REWRITTEN as what is true ("the tests
were not run this round" / "the walk covered sign-in only") or
retracted. Softening a claim to keep a round green is the exact
failure this phase exists to catch. The honest phrase "verified to
X, not beyond" is always acceptable; the unverified "done" never is.

### Phase 5 — The ledgers and the commit

- **The worklog entry** (append-only; the round's steps, in-round
  fixes, gate numbers, receipts, what is next — and the round's
  dead ends: approaches tried and refuted, so future rounds do not
  re-walk them).
- **The state file** refresh (current task, queue advance, watch
  items).
- **The commit** carries the receipts in its message: the battery
  log path, the scope (files touched), the round ID. The commit
  message is itself a receipt — a future reader should be able to
  audit the round from it without running anything.

## Round sizing

A round is sized to CLOSE: plan → build → gates → walk → receipts in
one unit. If mid-round the scope doubles, the honest move is: finish
the shippable half as its own round, split the rest into the next
plan (recorded in the ledger). Rounds that stay open for weeks stop
being verifiable — the evidence goes stale and the receipts stop
mapping to the tree.

## Anti-Patterns

- **Build-first planning**: code written, plan reverse-engineered to
  match. The plan exists to be WRONG cheaply, before code exists.
- **The happy-path walk**: sign in, look at the screen, declare
  victory. The walk must include the failure paths (the bad input,
  the denied role, the network hiccup) that the round claims to
  handle.
- **The stale-context walk**: one browser context reused across
  every persona, then shipped. Dead-state bugs hide exactly there.
- **The bar-lowering gate**: the test that got flaky "so we
  skipped it this round". Every skip is recorded with a reason and
  a reopen date, or it is not a skip — it is rot.
- **The receipt-less report**: "all green!" with no numbers. Treat
  as unverified and re-run before believing.
- **The silent supersede**: changing a previous round's decision
  without recording that it changed and why. Ledgers are append-
  only for exactly this reason.

## Quick Reference

| Topic | File |
|---|---|
| Round checklist (all phases, one page) | `round-checklist.md` |
| Battery script shape + gate log template | `round-checklist.md` |
| Worklog entry shape (with the dead-ends field) | `round-checklist.md` |

## Scope

This skill covers the build/verify cycle. The context files it
updates are `agent-context-state`; escalations mid-round go through
`owner-decision-format`; the feature candidates a queue holds come
from `feature-gap-analysis`.

## Canonical home

This copy lives in the durable canonical collection
(`portable-skills/verified-build-round/`). A platform auto-commit once
stripped this skill's accessibility passages from a live `skills/`
copy; the restored content here (the a11y spot-check passages in this
SKILL.md and in `round-checklist.md`) is the version of record. If a
live copy drifts, re-sync it from here.

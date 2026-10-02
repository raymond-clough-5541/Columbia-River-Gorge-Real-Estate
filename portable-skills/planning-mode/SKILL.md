---
name: planning-mode
description: Run analysis and implementation as separate gated phases — the analysis workflow produces REPORTS of recommended changes (with rationale) for user review, and nothing builds without an explicit approval recorded in an approval ledger. Use this skill when an agent starts implementing mid-analysis, when reactive per-surface fix loops multiply round counts, or when a project needs the consolidated cadence (one report, one approval, one implementation round, one verification audit).
license: MIT
---

# Planning Mode (the recommendation pipeline)

The failure class this skill prevents: **building without approval**
and the **reactive fix loop**. An agent reads an audit, starts
"fixing" things mid-analysis, and the project burns rounds on
per-surface reactions while the user never actually approved any of
it.

## The rule

The analysis workflow produces REPORTS of recommended changes (with
rationale) for USER REVIEW. Nothing builds without an explicit
approval recorded in an approval ledger. Mid-brainstorm suggestions
are design input, NOT implementation orders.

## The pipeline

```
evidence (screenshots/traversal)
  -> cold audit (pairs with cold-audit-discipline)
  -> four-axis triage (pairs with four-axis-filter)
  -> THE REPORT (recommendations with rationale,
     in the always-explain format)
  -> user review
  -> approved items become implementation rounds
     (pairs with verified-build-round)
```

## The consolidated cadence (round economics)

ONE report covering all surfaces -> ONE user approval -> ONE
implementation round -> ONE verification audit. Never per-surface
reactive loops — the round-count killer. Per-surface loops cost a
round each; the consolidated cadence costs one round per phase.

## The approval ledger

Every round records:

```markdown
| ID | User's verbatim words | Scope description | Files | Type | Status |
```

- The user's approval is captured VERBATIM (typos included — a
  paraphrase of an approval is not an approval).
- Execution mode applies ONLY after approval; before that the agent
  is in analysis mode.
- Change status to done only after the round's receipts land (pairs
  with `receipts-or-retract`).

## The ledger-to-plan pairing

Every session that produces a round ledger/report ALSO produces the
next-phase action plan in the SAME session — the pair is one
deliverable:

- The plan addresses every item the ledger discovered with an
  EXPLICIT disposition: done/verified, carried to the next phase,
  closed-with-evidence, or needs-user-decision — **no silent drops**.
- Open decisions ship as concrete verdict questions WITH the
  recommended option + why (pairs with `owner-decision-format`).
- The state file's next-step pointer references the plan so the next
  session starts executing, not re-deriving (pairs with
  `agent-context-state`).

A ledger without its plan is an INCOMPLETE round — the user never has
to ask "what's next."

## The wiring

- An agent-preamble rule stating the mode contract.
- The ledger file (`docs/APPROVALS.md`-shaped).
- A gate check tying commits to approval tokens (pairs with
  `commit-gate`): the commit message carries `[approved: <ID>]`
  matching an approved ledger row.

## Worked example (labeled: one project's cadence)

An audit round produced 12 findings across 4 surfaces -> ONE report
with the four-axis triage + recommendations -> the user approved 7 ->
ONE implementation round built all 7 -> ONE verification audit
closed the loop. The per-surface alternative (4 rounds of reactive
fixes, each needing its own approval) was the pattern this replaced.

---
name: always-explain-format
description: Every recommendation carries its reasoning at the moment it is given — what, why (tied to the methodology and requirement IDs), four-axis status, effort + dependencies, and what decision the user owes — never a bare list. Use this skill when reports or chat replies present options without a recommendation, recommendations without record-argued reasoning, or decision lists the user cannot evaluate without asking follow-up questions.
license: MIT
---

# The Always-Explain Decision Format

The failure class this skill prevents: **bare decision lists the user
cannot evaluate** — a menu of options with no recommendation, or a
recommendation with no reasoning. The user either rubber-stamps
(silently accepting the agent's hidden tradeoffs) or stalls (the
decision goes nowhere). Both cost the project.

## The rule

Every recommendation, every time, carries — at the moment it is
given:

| Field | Content |
|---|---|
| **What** | The concrete recommended change |
| **Why** | The rationale: tied to the methodology, the specific rubric axiom/tell, and the requirement-register IDs |
| **Four-axis** | Functional / Scalable / Secure / Aesthetic status (pairs with `four-axis-filter`) |
| **Effort + deps** | Size + credential/backend/user-taste dependencies |
| **Awaiting** | What decision the user owes (approve / modify / reject / taste) |

**Never a bare list** — in chat AND in committed reports.

## The escalation variant (decision memos)

When a question is big enough to stop work, it ships as a decision
memo (pairs with `owner-decision-format` for the full template):

- 2-4 options, each with pros AND cons (an option with only pros is
  a sales pitch).
- Exactly ONE recommendation.
- The reasoning argued from the project's own record (receipts, past
  rounds, standing rules) — not from general best practices.
- The what-changes-if-overridden line.

## The boundary (which decisions are whose)

- **Product-shaping questions** go to the user in the full format.
- **Structural, reversible, zero-product-behavior choices**
  (storage format, docs organization, tooling) are the agent's to
  decide and record — with options + reasoning + the override line —
  so the user can reverse them by their own word without having been
  asked (pairs with `adr-decision-register` for the record).

## The wiring

- A template file (the table above) in the project's templates
  directory.
- A gate check: reports with decision lists must contain rationale
  columns/sections (pairs with `commit-gate` CHECK 7).
- Pairs with `planning-mode` (reports are the pipeline's output) and
  `requirements-register` (the "Why" field cites register IDs).

## Worked example (labeled: one project's memo)

> **Question:** adopt an ADR directory for decision storage?
> **Option A (both ADR + root pointer)** — pros: rule lookup becomes
> a filename search, any convention-aware agent lands in the context
> tiering for free; cons: one round of migration writing.
> **Option B (pointer only)** — 20 lines, zero risk, leaves the
> lookup pain standing.
> **Option C (neither)** — the two cheapest real improvements stay on
> the table.
> **Recommendation: A** — the project's own consolidation module
> exists because rule lookup across N docs was a named failure
> class; the ADR directory is the storage-side fix for exactly that
> pain. **If overridden:** B or C change only one follow-up round's
> scope.

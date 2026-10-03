---
name: feature-analysis-framework
description: Decide what to build BEFORE building it. Derives the feature set as executable feature cards from five inputs (requirements register, identity doc, actor/role model, data model, honest inventory) through six steps (goal matrix, five lenses, composition rules, trust/abuse lens, convergence stop rule, card output contract), so pointless features are rejected at derivation time and gap analyses become targeted and rare. Use this skill BEFORE any feature build, when planning the next build phase ahead of code, when the owner asks "what should we build next and why", or when a feature brainstorm needs a filter that refuses noise.
license: MIT
---

# Feature Analysis Framework (build-ahead derivation)

The failure class this skill prevents: **the reactive feature loop** —
features get built from brainstorm lists or whatever the last chat message
suggested, then gap analyses (this skill's sibling,
`feature-gap-analysis`) keep finding the missing halves after the fact.
The R174 record proved WHY that loop never ends: each analysis walks with
a different lens, closing gaps moves the baseline, the honesty bar rises,
and the register only converges when the process works. The fix is to run
the SAME machinery at **derivation time** — before code exists — so the
gap family is caught as a card requirement, never as a post-build finding.

This skill is the portable packaging of the full instrument:
`docs/FEATURE-ANALYSIS-FRAMEWORK.md` in the source project (the five
inputs, the six steps, two worked examples, the analysis ledger). The
skill carries the executable core; the full doc carries the citations.

## When to Use

- BEFORE planning any feature build phase (the derivation IS the phase's
  candidate list — nothing enters a plan without a card).
- When the owner asks for "more features" and the answer must be a
  RESEARCHED, ordered pipeline, not a brainstorm.
- When a feature list needs a filter that refuses pointless items by
  named criteria (the owner's anti-noise demand).
- When starting a new project: run it once on the skeleton, then re-run
  after every shipped batch (built features unlock adjacencies).

## The five inputs (the intake contract — run BEFORE any derivation)

1. **The requirements register** — every requirement verbatim + decoded +
   source, in ONE read-first file. STOP if requirements live only in chat
   history or memory.
2. **The identity doc** — one paragraph stating what the product IS,
   decidable (any candidate clearly passes/fails against it). STOP if the
   identity is a vibe.
3. **The actor/role model** — the user types, the privilege ladder, the
   trust boundaries, every actor named in enforced source (path:line).
   STOP if roles exist in UI copy but not in a server-side check.
4. **The data model** — the entities + relationships. Every derived
   feature's data needs map onto existing entities or name what it mints.
   STOP if the "database" is a mock registry with no schema.
5. **The honest inventory** — what exists, in which mode, every entry
   cited; regenerated when the tree moved; **committed, not session
   scratch** (a scratch inventory dies with the session and forces full
   regeneration next time). STOP if the inventory predates the last
   build round.

An incomplete input is a STOP with the named gap — never a guess. A
guessed ✅ launders an assumption into a finding.

## The six steps

### Step 1 — The matrix
Rows = every actor. Columns = verb-phrase goals. Fill every cell with
✅/⚠️/🔶/❌ + EVIDENCE quoted from the real surface. Run the REVERSE PASS
both directions: for every ✅, which user types DON'T get it (the
sibling-miss family); an empty cell is a finding; a feature serving NO
cell is a finding.

### Step 2 — The five lenses (ALL, on every candidate, at derivation time)
- **L1 Action completeness** — every goal terminates in a door-backed
  action; local-only mutations are defects by definition. A candidate
  that cannot name its door is not a card yet.
- **L2 Honesty boundaries** — copy matches the real mechanism in every
  mode (the refusal string, the empty state, the disclosure line).
- **L3 Role permissions** — allowed/refused/hidden per action × role,
  refusal server-side, both directions (powers granted to the wrong role;
  remedies missing from the right one).
- **L4 Cross-user consistency** — same data to different viewers obeys
  one rule set; the gate named server-side.
- **L5 The four-axis filter** — functional / scalable / secure /
  aesthetic, BEFORE the plan; rejection names the failing axis.

### Step 3 — The composition rules
Every card declares **BUILDS-ON** (cites the inventory) and **ENABLES**
(pre-names the adjacency). Isolated features are rejected or re-derived.
The graph is acyclic and every thread traces to the identity doc —
failed trace = out of scope for THIS product.

### Step 4 — The trust/abuse lens (trust-sensitive features)
Identity, location, money, moderation: write the spoof model, require
server-side validation of every spoofable input, cross-check where two
independent signals exist, and require the audit trail. A power without
an enforced single-store receipt is theater.

### Step 5 — The convergence stop rule
CONVERGED when the matrix is complete both directions, every lens ran,
the graph is declared and rooted, and **two consecutive re-passes at the
same or raised bar produce zero NEW derivation-complete cards**. Bar: a
card is derivation-complete when it names actor, goal, door, seam, and
fix shape. Write the receipt explicitly (passes run, lenses run, bar
definition, the zero-new line). If pass 2 found new cards, run pass 3
and say so — NOT-CLAIMED is an honest outcome.

### Step 6 — The card output contract
Every converged card carries: ID + thread · actor + goal (the matrix
cell) · BUILDS-ON/ENABLES · the four-axis pass note · doors required
(route + method + session gate + validation schema + audit tokens +
honest refusal per mode) · seams required (module + functions +
entities) · test pins · walk script (personas + golden + failure paths +
zero-console gate) · receipt requirements · disposition (build-now /
gated-on-owner / gated-on-swap, citing the register row). A card missing
a field goes back to Step 2 — the missing field names the lens that has
not run.

**Freshness rule:** every pre-derived card is re-verified against the
CURRENT tree before entering a plan — shipped cards get their round
stamped; pending cards get re-derived. Never inherit a queue entry on
faith.

**Queue ledger:** derived cards + dispositions need one append-only home
(a dedicated pipeline file once the live set exceeds ~10 cards;
session-state queue lines are the lightweight approximation).

## The rejections table (the pointless-feature filter — not optional)

Every REJECTED candidate is recorded WITH its failing criterion: serves
no matrix cell · not identity-rooted (the trace failed) · no BUILDS-ON
(isolated) · a failing four-axis. Deliberately plant 2-3 plausible
brainstorm-style candidates and refuse them with named reasons — the
negative test proves the filter works, and it is the owner's usual
demand ("so pointless features are not built or researched").

## What this skill does NOT claim

Gap analyses do not become zero — they become TARGETED and RARER: the
requirements-consistency lens pre-design, plus a post-ship verification
of each card's ENABLES promises. The moving baseline (every build makes
adjacent gaps visible) still applies post-build; the composition rules
pre-name most of those adjacencies, which is why the post-build pass
finds fewer surprises each cycle.

## Relationship to the sibling skills

- `feature-gap-analysis` — the reactive post-build audit; same lenses,
  re-timed. Run it AFTER batches ship; run THIS skill before builds.
- `verified-build-round` — the round contract; every card maps 1:1 onto
  its phases so the building agent executes without re-deriving.
- The four-axis filter (the per-feature quality bar) — inherited as L5.

## Canonical home

This copy lives in the durable canonical collection
(`portable-skills/feature-analysis-framework/`). A platform auto-commit
once deleted the live `skills/` copy entirely (146 lines, round R213's
deliverable); this restore is the version of record. If a live copy
disappears again, re-sync it from here.

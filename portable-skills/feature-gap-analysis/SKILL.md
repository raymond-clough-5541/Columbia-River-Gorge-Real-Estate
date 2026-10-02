---
name: feature-gap-analysis
description: Find missing features systematically instead of by luck. Walks a user-type-by-goal matrix with multiple lenses (action completeness, honesty boundaries, role permissions, cross-user consistency), applies a convergence stop rule so the audit ends at evidence rather than fatigue, and runs a discovery-improvement loop that makes each successive pass stronger. Use this skill when auditing a product for feature completeness, planning what to build next, deciding whether a "done" feature set has gaps, or explaining why every gap analysis seems to find more gaps than the last one.
license: MIT
---

# Feature Gap Analysis

The failure class this skill prevents: **the confident inventory**. A
team lists the features they built, compares it to a requirements doc,
declares completeness — and users keep finding the missing half. Two
blind spots cause it: features are counted from the BUILDER's side
(what was implemented) instead of the USER's side (what a person is
trying to get done), and one pass with one lens finds only one
family of gaps.

The fix is structural: a **matrix** (every user type × every goal),
**multiple lenses** (each lens exposes a different gap family), a
**convergence rule** (stop at evidence, not at fatigue), and an
**improvement loop** (each pass's method gets stronger than the
last).

## When to Use

- Before declaring a feature set complete or "ready for users".
- Before planning the next build phase (the gap analysis IS the
  candidate list).
- After a batch of features shipped (new features create new gaps).
- When the owner asks "what's missing?" and the answer must be more
  than a shrug or a memory dump.

## Step 1 — The Matrix

Rows: **user types** (visitor, each member role, each staff role,
each leader role — as many as the product really has). Columns:
**goals** — what that user type is trying to accomplish, phrased as
a verb-phrase ("find a trustworthy seller", "recover a lost
password", "remove a troublemaker from my group").

Every cell gets one of four states, with EVIDENCE:

| State | Meaning | Evidence required |
|---|---|---|
| ✅ exists | the goal is achievable end-to-end | the on-screen words that prove it (quote from the real UI, never from memory) |
| ⚠️ partial | achievable with a caveat | the caveat as the user meets it (the label, the disclosure line, the limit) |
| 🔶 gated | deliberately deferred (an honest "coming later") | where the promise is recorded, in user words |
| ❌ missing | the goal cannot be completed | the dead end named concretely ("the button does not exist", "the flow stops after step 2") |

The matrix is built from the REAL product — every quoted label
verified in source before it enters a cell. A gap analysis that
invents or softens evidence is worse than none: it launders
assumptions into findings.

**The reverse pass:** walk the matrix BACKWARD — for every ✅ cell,
ask "which user types DON'T get this?" Feature families ship to one
role and quietly miss their siblings (the buyer got the feature, the
seller didn't; the member got it, the staff version is missing).

## Step 2 — The Lenses (run them ALL, one at a time)

Each lens finds a different gap family. Running one lens twice finds
less than running two lenses once.

1. **Action completeness**: for every cell, can the user FINISH? Not
   "is there a screen" — is the loop closed (find → act → confirm →
   undo/recover where needed)? Unclosed loops are the top gap family.
2. **Honesty boundaries**: where does the product show sample/mock
   data as if real, or hide a boundary? Every mock surface must be
   labeled; every label must be checked against the real thing. Gaps
   here are trust bugs, not just missing buttons.
3. **Role permissions**: for every action, who CAN and who CANNOT,
   and is that the intended line? Both directions matter: powers
   granted to the wrong role, and remedies missing from the right
   one (the admin who can see a problem but has no lever).
4. **Cross-user consistency**: the same goal in different doors
   (web/mobile, feed/search/detail, member/staff view). Gaps here
   hide because each door individually "works".
5. **Recovery paths**: for every destructive or stateful action, is
   there an undo, an appeal, a re-do? Products ship happy paths and
   forget the recovery goal entirely.
6. **Requirements consistency (pre-design pass)**: re-read the
   ORIGINAL requirements list against the matrix — the drift class
   where an early requirement quietly fell out of scope and nobody
   re-checked. Run this lens BEFORE designing anything new.

## Step 3 — Why each pass finds more (the moving baseline)

This is the part that surprises people: pass 2 finds gaps that pass
1 missed, and pass 3 finds more. It is not incompetence — it is
structure:

- **The baseline moved.** Pass 1's additions became pass 2's
  environment. The new feature is now the thing whose edges are
  unlabeled, whose role line is unset, whose recovery path is
  missing. New work manufactures new gaps at a predictable rate;
  the matrix's job is to find them faster than they accumulate.
- **The lens widened.** The first pass ran one lens (usually action
  completeness). The second pass's NEW findings are mostly from the
  lenses that didn't run yet — not a contradiction of pass 1, a
  different family.
- **The matrix filled.** Empty cells are only visible once their
  neighbors have states. A sparse matrix reads "fine"; a dense one
  exposes its own holes. Early passes literally cannot see certain
  gaps because there is nothing to contrast them against.
- **The promise ledger grew.** Every "coming next" promised to users
  is now a cell to verify (did it arrive? is it still honest?).
  Promises are gap debt — they compound.

Record this theory in the report. Stakeholders who understand WHY
pass 3 exists stop treating convergence failure as a scandal and
start treating it as the method working.

## Step 4 — The convergence receipt

The stop rule: **two consecutive passes, at the same or raised bar,
with zero NEW buildable findings = converged.** Write the receipt
explicitly — which passes ran, which lenses each ran, what bar
("buildable": a finding specific enough to be a ticket), and the
zero-new line. Without the receipt, the analysis ends when the
analyst gets tired, and fatigue masquerades as convergence.

Bar discipline: a finding is buildable when it names the user type,
the goal, the dead end, and the fix shape. "Search could be better"
is not a finding; "sellers cannot re-list a sold item — the action
exists for admins only" is.

## Step 5 — The improvement loop (make the NEXT pass stronger)

After every gap analysis, three questions, answered in writing:

1. **Which lens found the most this pass?** Rotate it EARLIER next
   time; promote its family of checks into the standing matrix
   walkthrough.
2. **Which finding was found LATE (a pass-3 catch that pass 1
   should have seen)?** The reason it hid is a NEW lens candidate —
   name it, trial it next pass.
3. **Is the finding inventory frozen?** One file, append-only, every
   finding ever found with its state (missing → built / deliberately
   gated / wontfix-with-reason). Without it, each pass re-litigates
   old findings and the convergence receipt has no baseline to
   compare against.

Plus the standing upgrades: every new feature's gap-adjacent edges
(its labels, its role line, its recovery path) enter the matrix at
build time, not at next-audit time.

## Step 6 — The output (findings become decisions)

The report ends in the decision format, not a wish list:

- Every buildable finding → a queue candidate with size estimate
  and the affected user type.
- Every gated finding → the honest deferral, checked against the
  promise ledger (still promised? still honest?).
- Every wontfix → the reason, on the record, revisitable.
- The recommendation: the build ORDER (dependencies, risk, quick
  wins — the ordering principle named), in the owner-decision
  format. A gap analysis that ends without a recommended order just
  moves the chaos into a spreadsheet.

## Anti-Patterns

- **The requirements-diff audit**: diffing the spec against the
  build finds exactly the gaps the spec author imagined, and none
  of the ones the product's own structure created.
- **The single-lens sweep**: one lens, declared complete. The other
  families are invisible to it by construction.
- **Memory-based matrices**: "I'm pretty sure the settings page has
  2FA" — the analysis launders a guess into a ✅. Quote source or
  mark it unknown.
- **The softened caveat**: a ❌ that got tired of being ❌ and became
  ⚠️ in the final table. State softening is how gap reports lie.
- **The infinite audit**: no convergence rule, passes until
  fatigue, then "good enough". The receipt is what makes the stop
  an evidence claim instead of a mood.

## Quick Reference

| Topic | File |
|---|---|
| Matrix grid, cell evidence, finding record | `matrix-template.md` |
| Pass report + convergence receipt shapes | `matrix-template.md` |

## Scope

This skill covers completeness auditing. Deciding what to DO about a
gap is `owner-decision-format`; building it is `verified-build-round`;
the context that survives between passes is `agent-context-state`.

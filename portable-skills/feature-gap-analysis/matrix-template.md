# Templates — feature-gap-analysis

## The matrix grid

```markdown
# Feature matrix — <project>, pass <n> (<date>)

> Cell states: ✅ exists · ⚠️ partial (caveat named) · 🔶 gated
> (deferral recorded) · ❌ missing (dead end named). Every non-empty
> cell carries its evidence: the on-screen words, quoted from the
> real product, verified in source before quoting.

## <User type 1> (e.g., Visitor — not signed in)

| Goal (verb-phrase) | State | Evidence / the dead end |
|---|---|---|
| create an account | ✅ | "<the on-screen words that prove it>" |
| recover a lost password | ✅ | "<the flow's own words>" |
| understand what this product is before joining | ⚠️ | <the caveat as the user meets it> |

## <User type 2> (e.g., Member — buying)
...

## <User type N> (e.g., Site admin)

| Goal | State | Evidence / the dead end |
|---|---|---|
| <...> | ❌ | <the concrete dead end, e.g. "can see the flag but no lever exists"> |

## The reverse pass

For every ✅ family above: which user types DON'T get it?
- <feature family> — shipped to <role>; missing for <roles> (<the
  evidence each way>)
```

Rules encoded in the shape:

- Goals are verb-phrases the USER would use, not feature names the
  builder would use ("find a trustworthy seller", not "trust-score
  widget").
- The state column never contains prose — prose goes in the evidence
  column, where it has to be checkable.
- The reverse pass is a separate section on purpose: skipping it is
  the most common silent truncation.

## The finding record (append-only inventory)

```markdown
| ID | User type | Goal | The gap (buildable phrasing) | First found | State |
|---|---|---|---|---|---|
| G-12 | member-selling | re-list a sold item | the action exists for admins only; sellers hit a dead end | pass 2, lens 1 | ❌ open |
| G-13 | everyone | undo a wrong action | no undo on <action>; recovery goal unmet | pass 2, lens 5 | built <round> |
| G-14 | staff | <goal> | <gap> | pass 3 | wontfix — <reason, on the record> |
```

Inventory rules:

- IDs never reused; state changes are edits to the State cell only
  (with the round where it changed); the gap phrasing itself never
  softens after the fact.
- "wontfix" requires a reason that a future pass could reopen with
  new evidence — "we didn't feel like it" is not a reason.

## The pass report + convergence receipt

```markdown
# Gap analysis v<n> — <date>

## What ran

- Pass A: lenses <1, 5> (action completeness, recovery paths),
  matrix sections <which user types>.
- Pass B: lenses <2, 3, 4> at bar "buildable", full matrix + the
  reverse pass.
- New this pass: lens 6 (requirements consistency) — trialed
  because <the pass-3 catch that should have been a pass-1 catch>.

## Findings

<N buildable findings (the inventory rows above, G-<x>..G-<y>)>.
<The lens split: which family produced how many — the lens-rotation
input for next pass.>

## The promise ledger check

| Promised (in user words) | Where promised | Still honest? |
|---|---|---|
| <"X coming soon"> | <the screen that says it> | yes / arrived <round> / STALE — fix the promise |

## Convergence receipt

- Pass B at bar "buildable": <n> new findings.
- Pass C at the same bar + lens <the rotation>: <m> new findings.
- <If m = 0>: CONVERGED — two consecutive passes at bar, zero new
  buildable findings. The analysis stops here as an evidence claim.
- <If m > 0>: not converged; pass D recommended with <the next lens
  rotation>.

## The recommendation (owner-decision format)

Build order if approved as written: <items in order, the ordering
principle named — dependency-first / risk-reduction-first /
quick-wins-first>.
```

## The improvement-loop answers (end of every pass, in writing)

```markdown
## Making the next pass stronger

1. Top-producing lens this pass: <lens>. Next pass: run it FIRST /
   promote its checks into the standing walkthrough.
2. The late catch: <finding G-x, caught pass <n>, should have been
   visible pass <n-1>>. Why it hid: <the structural reason>. New
   lens candidate: <name it>.
3. Inventory frozen: <path> — <count> findings, states current at
   <date>.
```

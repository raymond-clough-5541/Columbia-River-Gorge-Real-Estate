---
name: receipts-or-retract
description: Make evidence an artifact, not an intention — every "I analyzed/read/compared all X" claim must ship a committed per-item ledger (item -> what was checked -> the evidence), every scripted edit must assert its anchor before replacing and verify the content after writing, and any claim that cannot carry a receipt gets retracted. Use this skill when an agent overclaims partial work as complete, when scripts report success while silently doing nothing, or when "it works" needs to mean more than confidence.
license: MIT
---

# Receipts or Retract (+ verify-after-write)

The failure class this skill prevents: **overclaimed analysis** and
**silent no-op edits** — two faces of the same failure: confidence
standing in for evidence.

## Rule 1 — analysis claims

Any claim of the form "I analyzed/read/compared all X" MUST ship a
committed per-item ledger produced FROM the work:

```markdown
| item | what was checked | the evidence |
|------|------------------|--------------|
| src/lib/api/foo.ts | the auth gate on every route | foo.ts:42 requireUser |
| src/lib/bar.ts | the schema validation | bar.test.ts 12/12 pass |
```

No ledger = the claim is a defect: **retract it or do the reading.**
There is no third option. "I looked at them" is not a receipt.

## Rule 2 — scripted edits (verify-after-write)

Every scripted file edit must:

1. **ASSERT its anchor exists BEFORE replacing** — the script greps
   for the exact text/pattern it is about to change and fails loudly
   if absent (never a blind replace that matches nothing).
2. **VERIFY the inserted content AFTER writing** — grep the written
   file for the expected new content; fail loudly if absent.

A print-without-verify success message is a claim, not a
verification — the silent no-op class: the script says "patched 3
files" while doing nothing. Both checks are two greps; there is no
excuse to skip them.

## The receipt taxonomy (what counts)

- A test number ("foo.test.ts 12/12 pass")
- A log path ("logs/battery/<ts>.log — 4/4 ALL PASS")
- A file:line cite ("foo.ts:42")
- A screenshot/artifact path
- A command + its observed output

What does NOT count: "verified", "should work", "I checked", "done".

## The retraction protocol

When a claim cannot carry its receipt at delivery time:

1. State the claim is retracted (or narrow it to what IS receip ted).
2. Name what is missing (which ledger, which verification).
3. The retraction is honest, not shameful — a landed honest "14/18
   done, 4 remaining" beats a claimed 18/18 with thin files.

## The wiring

- Agent-preamble rule: receipts with every completion claim.
- The ledger template in every analysis doc.
- The assert/verify convention in every edit script (pairs with
  `commit-gate` — gate checks can require the receipt tokens).
- Pairs with `task-fidelity` (the fidelity ledger's evidence column
  IS this rule applied) and `verified-build-round` (rounds end with
  receipts-or-retract as the closing discipline).

## Worked example (labeled: one project's incident)

A migration script reported "31 backfill files written" — the
verify-after-write grep found 29: two rows had been silently skipped
because their source rows failed the parser's expectation. The
assert-before-replace check had not run on the second pass. The fix:
both checks mandatory, and the script's success message now prints
the per-file verification count, which the round doc cites as the
receipt.

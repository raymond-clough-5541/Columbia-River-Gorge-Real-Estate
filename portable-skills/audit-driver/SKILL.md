---
name: audit-driver
description: Make ONE parameterized script the only entry point for vision/LLM quality audits — rounds define batch CONFIGS (JSON), never copy-edited scripts — so the evidence-integrity guarantees (max 4 images per call, state-labeled shots, register-ID contexts, derived output paths) are mechanical, not remembered. Use this skill when audit runs keep overwriting reports or mislabeling shots, when hand-copied template scripts drift, or when more than one script can touch the audit outputs.
license: MIT
---

# The Parameterized Audit Driver

The failure class this skill prevents: **evidence-integrity incidents
from hand-copied scripts** — four documented incidents from one
project, all the same shape: someone copies the audit script, edits a
path, and overwrites last round's report or mislabels the shots an
analysis later trusts.

## The pattern

ONE script is the only audit entry point. Rounds define batch
CONFIGS (JSON files); the driver enforces the guarantees
mechanically:

- **At most 4 images per vision call** (hard fail above — the
  multi-image attribution blind spot; pairs with
  `cold-audit-discipline`).
- **Required requirement-register IDs in every context** (ingestion:
  the judge's context names the rubric rows it scores against).
- **Shot files must exist; every shot carries a state label** (+ an
  input-state when relevant: enabled/disabled capture separation).
- **Output paths derive from the round ID ONLY** — no hand-typed
  paths, so two rounds can never write to the same report.
- **The evidence rule embedded in every context** (findings must cite
  screenshot + region).

## The config schema

```json
{
  "roundId": "rNN-<name>",
  "batches": [
    {
      "id": "batch-A",
      "appType": "<rubric-set>",
      "leadPrompt": "ai-tells",
      "registerIds": ["AR-1", "AR-3"],
      "shots": [
        {"file": "feed-01.png", "state": "signed-in, 12 items",
         "inputState": "enabled"}
      ],
      "context": "A community marketplace feed page."
    }
  ]
}
```

The project-specific parts are exactly two path conventions (the
prompts directory, the screenshots directory) plus the
product-context line in the context template — swap those when
porting; everything else is the discipline.

## The capture-recipe discipline (feeding the driver)

Three hard rules learned from bad captures:

1. **Body-only identity assertions.** Never assert page identity on
   text that appears in the app chrome (page header/nav) — it
   satisfies while the body is still un-hydrated and the shot fires
   blank. Assert on text that only renders inside the page body once
   client data lands.
2. **Wait out entrance animations.** A staggered motion entrance
   reads as a "ghost element at 15% opacity" defect in a screenshot.
   After any animated surface, wait for the LAST animated element's
   text before the shot.
3. **Minimal section recipes.** Full scenario recipes re-run their
   whole prologue; on slow-hydration pages they time out. Write a
   minimal recipe per section: sign-in prologue + only the shots
   needed.

## The output contract

- One report file per batch, path-derived from the round ID.
- Raw judge outputs appended verbatim (the raw evidence trail).
- The triage section separates verified findings from verified
  misreads (pairs with `cold-audit-discipline`), then hands the
  verified findings to the four-axis triage (pairs with
  `four-axis-filter`).

## The wiring

1. Stand up the driver script once (a thin loop over the config:
   read batch -> chunk shots into <=4-image calls -> send with the
   cold context -> append output to the batch report).
2. Commit it; make it the ONLY thing that writes to the audits
   directory.
3. New audit = new config JSON in version control, reviewed like
   code.
4. Pairs with `battery-runner` when the audit is a gate (its log
   becomes a gate receipt).

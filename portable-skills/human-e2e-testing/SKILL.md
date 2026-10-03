---
name: human-e2e-testing
description: Run end-to-end tests that interact with the app like a real human — real clicks by accessible role, real typing by label, identity-verified screenshots with a duplicate-hash guard, and a hydration-safe settle that catches the silently-swallowed-click race. The executable engine is a copy-to-any-project package (portable-workflows/human-e2e/) driven by scenario JSONs; this skill carries the usage knowledge: the scenario grammar, the run command, the guard model, and the self-tests. Use this skill for interactive verification of any web flow where a DOM assertion alone is the weaker half of the evidence.
license: MIT
---

# Human-Style E2E Testing (the portable harness)

The failure class this skill prevents: **test harnesses that die
with their project** (scripts hard-welded to one app's URLs, strings,
and personas) and the two evidence-poisoning incidents: **mislabeled
screenshots** feeding wrong images to analyses (a nav that lagged got
captured under the intended page's name) and the **hydration race**
(an SSR page paints all its text BEFORE the framework attaches
handlers; a click in that window is silently swallowed — no error,
clean console, looks exactly like an app bug).

## The pattern (engine + scenarios)

The workflow splits into **engine** (project-agnostic, never edited)
and **scenarios** (JSON files that ARE the project):

- The engine knows only browser primitives, accessible roles, and
  labels. Zero project strings, zero CSS selectors, zero
  dependencies beyond node builtins.
- A scenario JSON describes the human flow: navigate -> click by
  role -> type by label -> wait for text -> assert -> screenshot.
- The runner executes any scenario against any base URL and emits a
  committable markdown results log (the receipt).

**The executable package lives at `portable-workflows/human-e2e/`**
(engine `lib.mjs` + runner `run.mjs` + example scenarios + the full
schema README). Copy that folder into the target project; this skill
is the usage knowledge that travels with it.

## The rules baked into the engine

1. **Human-style only** — real clicks, real typing, real waits;
   `eval` is read-only assertions, never state mutation.
2. **Hard navigation** for initial loads (a cache-buster defeats the
   back-forward cache); in-app clicks after.
3. **Hydration-safe settle** — after every nav the engine waits for
   `document.readyState === 'complete'` then settles `settleMs`
   (default 900ms, per-scenario/per-step overridable).
   Click-timeout diagnostics name the race so a future failure
   self-identifies. Text-waits prove nothing about interactivity.
4. **The capture protocol** — every screenshot asserts page identity
   FIRST (expected text/URL present); no assertion = no screenshot;
   byte-identical duplicate shots hard-FAIL the run.
5. **Screenshots are local-only** — the results.md is the committed
   evidence; the PNGs never enter the repo.

## The scenario grammar (quick reference)

`clear` — `storage {set}` — `nav {url, expectText?, expectUrl?,
shot?}` — `click {role+name | text, expectText?, shot?, critical?}`
— `fill {label|role+name, text, shot?}` — `press {key}` —
`wait {text, timeout?}` — `expect {text|headingIncludes|urlContains
|titleIncludes}` — `shot {label, expectText?, expectUrl?}` —
`evalExpect {expr, contains?|equals?}` (read-only) —
`viewport {width, height}`.

Every step accepts `shot: label`, `critical: true` (failure aborts),
`bug: "description"` (logged to the results' Bugs section on
failure). Scenario-level `settleMs` tunes the hydration settle.

## The wiring (copy into any project)

1. Copy `portable-workflows/human-e2e/` into the target project.
2. Ensure a browser-automation CLI the runner can drive is
   installed.
3. Write scenarios in `scenarios/` (start from the example smoke).
4. Run: `bun portable-workflows/human-e2e/run.mjs --scenario
   <path> --out <local-shots-dir>`.
5. **Verify the guards after porting:** run the duplicate-guard
   self-test — it MUST fail with the DUPLICATE SCREENSHOT message
   (exit 1). If it passes, the guard is broken.

## The receipts discipline

A portability claim for this workflow requires the run receipts
(pairs with `receipts-or-retract`): the real-scenario PASS log + the
duplicate-guard FAIL log. The engine's first live run demonstrated
the capture protocol catching its own author's API defect — the
protocol works on its author too.

Pairs with: `verified-build-round` (the live walk rung), `audit-driver`
(the identity-verified shots feed cold audits), and `battery-runner`
(the E2E gate can join the battery config).

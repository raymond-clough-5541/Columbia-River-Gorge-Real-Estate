# human-e2e — the portable human-style E2E workflow

> **What this is:** a copy-to-any-project workflow for running
> end-to-end tests that interact with your app **like a real human
> would** — real clicks, real typing, real waits — capturing
> identity-verified screenshots at every key moment and emitting a
> results log you can commit as evidence.
>
> **Provenance:** extracted R73 from the Free Trader project per the
> user's modularity mandate (DR-8/DR-14): *"modularize the workflows so
> they can be used in any project — i.e. the human-style E2E tests where
> you click and interact with the app like a real human would."*
> Receipts: `audits/e2e/r73-portable-harness-verification.md`.

## Why it exists (the failure class it prevents)

1. **Project-coupled test harnesses die with the project.** The original
   E2E scripts were hard-welded to one app (hard-coded URLs, strings,
   personas). This engine contains ZERO project assumptions — your
   project lives entirely in the scenario JSON.
2. **Mislabeled screenshots poisoning analyses** (the M24 incident
   class): a navigation that lagged got captured under the intended
   page's name. Every screenshot here asserts page identity FIRST
   (expected text/URL on the page) and the run FAILS on any
   byte-identical duplicate shot.
3. **The hydration race** (the M27 incident class): SSR pages show all
   their text BEFORE React attaches handlers. A click fired in that
   window is **silently swallowed** — no error, clean console, looks
   exactly like an app bug. The engine settles every navigation
   (readyState `complete` + `settleMs`, default 900ms) and names this
   race in every click-timeout diagnostic. Tune `settleMs` per
   scenario (cold dev compiles want more; warmed prod builds less).
4. **"Human-style" discipline**: no eval-mutated app state. `eval` is
   read-only assertions only. Interactions go through real accessible
   roles and labels (they survive restyling; CSS selectors don't).

## Port it in 3 steps (any project, any stack)

1. **Copy this folder** into the target project
   (`portable-workflows/human-e2e/`). Requirements: `node` or `bun` +
   the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
   CLI on PATH (`npm install -g agent-browser && agent-browser install`).
2. **Write a scenario JSON** in `scenarios/` — set `base` to your app's
   URL, then describe your flow with accessible roles + labels
   (see the schema below). Start from `example-smoke.json`.
3. **Run it:**
   ```bash
   bun portable-workflows/human-e2e/run.mjs \
     --scenario portable-workflows/human-e2e/scenarios/my-flow.json \
     --out /tmp/e2e-shots/my-flow-$(date +%s)
   ```
   Exit `0` = all steps passed. Exit `1` = failures (details in
   `<out>/results.md`). PNGs are LOCAL-ONLY — commit the results.md,
   never the screenshots (DR-13 discipline).

## The scenario schema

```jsonc
{
  "name": "my-flow",
  "description": "what a human is verifying",
  "base": "http://localhost:3000",
  "viewport": "390x844",            // optional: mobile-first testing
  "settleMs": 900,                   // optional: hydration settle after nav (M27)
  "steps": [ /* step objects below */ ]
}
```

| Action | Fields | Behavior |
|---|---|---|
| `clear` | — | Opens `base` (fresh origin context) and clears localStorage |
| `storage` | `set: {key: value}` | Injects localStorage entries (e.g. session seeds) |
| `nav` | `url`, `expectText?`, `expectUrl?`, `shot?`, `timeout?` | Hard navigation with cache-buster (`_ts`), then optional text/URL assertions, then optional screenshot |
| `click` | `role`+`name` or `text`, `expectText?`, `shot?`, `timeout?`, `critical?` | Click by accessible role+name (`tab`, `button`, `link`, `menuitem`…) or by visible text; human pause before/after |
| `fill` | `label`+`text` (or `role`+`name`+`text`), `shot?` | Type into a field by its label |
| `press` | `key` | Press a key (`Enter`, `Tab`…) |
| `wait` | `text`, `timeout?` | Poll until text appears (default 8s) |
| `expect` | `text?` / `headingIncludes?` / `urlContains?` / `titleIncludes?` | Assertion — one per step |
| `shot` | `label`, `expectText?`, `expectUrl?` | Screenshot WITH identity assertion (M24 capture protocol) |
| `evalExpect` | `expr`, `contains?` / `equals?` | READ-ONLY escape hatch: assert on an eval's output |
| `viewport` | `width`, `height` | Resize mid-run (responsive checks) |

**Every step** also accepts:
- `shot: "label"` — capture an identity-verified screenshot after the
  step (assertion fields `expectText` / `expectUrl` feed the capture).
- `critical: true` — a failure here aborts the run (remaining steps
  are skipped and logged as such).
- `bug: "description"` — if this step fails, the description is logged
  to the results' **Bugs** section with reproduction context.

**Rules baked into the engine** (from the source methodology):
human-style interaction only; hard-nav + cache-buster for loads;
**hydration-safe settle after every nav (M27: readyState complete +
settleMs, default 900ms — SSR text shows before handlers attach)**;
identity assertion before every screenshot; duplicate-hash guard
(byte-identical shots = hard FAIL); read-only evals only; PNGs
local-only.

## The self-tests (verify the guards in ANY project)

```bash
# Must FAIL (exit 1) with "DUPLICATE SCREENSHOT" — the M24 guard works:
bun run.mjs --scenario scenarios/self-test-duplicate-guard.json
```

If that scenario ever PASSES, the duplicate guard is broken.

## Real portability receipt

`scenarios/free-trader-signin.json` is the original project-coupled
script (`scripts/e2e/01-signin-signup.mts`) re-expressed as a scenario:
11/11 steps pass against the live app, 4 identity-verified unique
screenshots — with ZERO engine changes. That is the modularity claim,
with receipts.

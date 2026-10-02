---
name: human-e2e-testing
description: Run human-style end-to-end tests on any web app — click, type, and wait like a real human via agent-browser semantic locators; per-step identity-verified screenshots with a duplicate-hash guard; emits a committable markdown results log. Project-agnostic: flows are scenario JSONs, the engine has zero app assumptions.
read_when:
  - Testing web UIs end-to-end like a real user
  - Verifying user flows with clicks, typing, and waits
  - Capturing evidence screenshots for UI audits
  - Porting E2E test workflows to a new project
allowed-tools: Bash(agent-browser:*)
---

# Human-Style E2E Testing (portable)

The full package lives at `portable-workflows/human-e2e/` (this file
travels with it — copying the folder gives you the engine, the runner,
the scenario schema, and the self-tests).

## Quick start

```bash
bun portable-workflows/human-e2e/run.mjs \
  --scenario portable-workflows/human-e2e/scenarios/<flow>.json \
  --out /tmp/e2e-shots/<flow>-$(date +%s)
```

1. Write the flow as a scenario JSON — steps speak **accessible roles
   and labels** (`{"action":"click","role":"button","name":"Sign In"}`),
   never CSS selectors.
2. Every screenshot is identity-asserted first (expected text/URL on
   the page); byte-identical duplicate shots hard-FAIL the run.
3. Results land in `<out>/results.md` — commit that, never the PNGs.

Schema, rules, and the port-in-3-steps guide: see `README.md` in this
folder. Governance context: `docs/portable/11-human-e2e-testing.md`
(DR-14: portability at build time — this skill IS that rule's product).

## Rules (enforced by the engine, restated for the agent)

- Human-style only: real clicks/typing/waits; `eval` is read-only.
- Hard navigation (cache-buster) for initial loads; in-app clicks after.
- **Hydration-safe interaction (M27):** after any hard nav, the engine
  waits for `readyState complete` + a settle (`settleMs`, default
  900ms) before interactions — SSR text paints BEFORE React attaches
  handlers, and clicks in that window are silently swallowed (no
  error, clean console, looks like an app bug). For ad-hoc
  agent-browser use OUTSIDE this harness: settle ≥1s or probe one real
  handler before the first click. Text-waits prove nothing about
  interactivity.
- No screenshot without an identity assertion (M24 capture protocol).
- Screenshots are local-only artifacts (DR-13).

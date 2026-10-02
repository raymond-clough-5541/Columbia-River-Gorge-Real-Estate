# The Importable Methodology Skill Collection

> **What this is:** the project's ENTIRE learned methodology — every
> workflow, discipline, and guardrail developed across its rounds —
> packaged as 27 skills in the open Agent Skills format (one folder
> per skill, `SKILL.md` with name/description frontmatter,
> self-contained, project-agnostic). Import them into any AI coder
> (Claude Code, OpenCode, Cursor, any agent that reads markdown, any
> full-stack Z.ai session) and the same workflow runs everywhere.
> Per-tool install steps: **[INSTALL.md](INSTALL.md)**.

## Why this folder is the canonical home

The live `skills/` directory in the source workspace is PARTLY
PLATFORM-MANAGED: platform commits add and alter skill folders
there, and one documented platform auto-commit (212ee4b,
2026-09-15) deleted `skills/feature-analysis-framework/SKILL.md`
(R213's 146-line deliverable) and stripped the accessibility
passages from `skills/verified-build-round/`. `portable-skills/`
(top-level, beside the equally durable `portable-workflows/`) is the
**canonical collection**: the source of truth. If the live copies
drift or vanish, re-run the sync (below); `--check` detects drift.

## The collection (27 skills)

### The foundations (context + decisions)

| Skill | Prevents |
|---|---|
| `agent-context-state` | Context amnesia — sessions forgetting prior decisions |
| `requirements-register` | Requirements as agent memory (drift via forgetting) |
| `adr-decision-register` | Amendment archaeology; current state buried under history |
| `governance-consolidation` | Rule lookup across N docs |
| `owner-decision-format` | Bare questions to the owner (decisions without reasoning) |
| `always-explain-format` | Recommendation lists the user cannot evaluate |

### The process disciplines (how the work runs)

| Skill | Prevents |
|---|---|
| `planning-mode` | Building without approval; reactive fix loops |
| `task-fidelity` | Task drift (scope downgrade, substitution, overclaim) |
| `receipts-or-retract` | Overclaimed analysis; silent no-op edits |
| `commit-gate` | Advisory rules a session can skip |
| `verified-build-round` | "It compiles" counting as done |
| `feature-analysis-framework` | The reactive feature loop (pointless features built) |
| `feature-gap-analysis` | Unbounded gap hunting (no convergence rule) |

### The quality disciplines (what good looks like)

| Skill | Prevents |
|---|---|
| `anti-ai-ui-style` | UIs that read as machine-generated |
| `four-axis-filter` | Aesthetic-only changes (decoration imitating function) |
| `cold-audit-discipline` | Score-chasing, leading prompts, judge noise |
| `audit-driver` | Evidence-integrity incidents from hand-copied scripts |
| `contrast-check` | Unmeasured contrast claims driving wrong fixes |

### The executable workflows (skills that point at packages)

| Skill | Prevents |
|---|---|
| `human-e2e-testing` | Harnesses that die with their project; mislabeled screenshots |
| `battery-runner` | "It passed" with no committable artifact |
| `realtime-service` | Chat spoofing (client-supplied identity); project-scared services |
| `review-gallery` | Visual sign-offs in a medium the reviewer cannot use |
| `progress-report-pdf` | Prose-only reports a stakeholder cannot assess |

Five of these (11-15 in the module numbering) reference their
executable engines at `portable-workflows/<package>/` — **copy
`portable-workflows/` alongside when importing them** (see
INSTALL.md).

### The environment + shipping skills (R218: where the work runs, where it ships)

| Skill | Prevents |
|---|---|
| `zai-fullstack-session` | Environment amnesia — a fresh session fumbling the sandbox (ports, gateway, reaping, rollbacks) |
| `production-deploy-stack` | The untested lift — a local-first app pushed to prod without a staging proving ground |

## The load order for a new project

Adapted from the portable pack's wiring order (the skills compose;
each names its pairs):

0. **Day one in a Z.ai sandbox:** `zai-fullstack-session` — the
   environment contract, the gateway, the recovery playbook; load it
   before any other skill runs so the session never fumbles the
   sandbox mechanics.
1. **Foundations first:** `requirements-register` (create the
   register from the user's first instructions) +
   `agent-context-state` (the state file + append-only worklog +
   session-start ritual) + `adr-decision-register` (the decisions
   directory + the root entry point).
2. **The process contract:** `planning-mode` (reports -> approval ->
   implementation rounds; the approval ledger) + `task-fidelity`
   (paste the fidelity prompt into the agent preamble) +
   `receipts-or-retract` (the preamble rule + the ledger template).
3. **The gate:** `commit-gate` (install the base checks — approval
   token, scope, worklog; add the four-axis check when UI work
   begins; add the format check when reports begin).
4. **The quality rails, at the moment their surface appears:**
   `anti-ai-ui-style` + `four-axis-filter` when UI work begins;
   `cold-audit-discipline` + `audit-driver` when the first
   vision/quality audit runs; `contrast-check` when color claims
   arrive; `governance-consolidation` when rules spread past one
   doc; `always-explain-format` + `owner-decision-format` when the
   first decisions go to the owner.
5. **The verification machine:** `battery-runner` (the one-command
   gate + evidence source) + `human-e2e-testing` (interactive
   verification) — both as portable packages + their skills.
6. **The build loop:** `verified-build-round` (plan-first, layered
   seams, gates, LIVE walk, receipts-or-retract) +
   `feature-analysis-framework` before feature phases +
   `feature-gap-analysis` when a targeted gap pass is warranted.
7. **Surfaces as needed:** `realtime-service`, `review-gallery`,
   `progress-report-pdf`.
8. **When the project must ship:** `production-deploy-stack` — the
   staging environment, the AI's scoped credentials, the security
   checklist, the private preview — loaded when cross-device use or
   production testing begins.

## The relationship to portable-workflows/

`portable-workflows/` holds the EXECUTABLE packages (runnable code +
self-tests): `human-e2e/`, `battery-runner/`, `chat-service/`,
`review-gallery/`, `progress-report-pdf/`. The five collection
skills named above carry the USAGE knowledge and point at their
package for the engine. Docs-only skills run from the SKILL.md
alone; the executable five need their package folder beside them.
The module docs in `docs/portable/` (01-18) remain the long-form
methodology chapters this collection was converted from.

## The sync / live-loading story

`scripts/sync-methodology-skills.mjs` copies every collection skill
from `portable-skills/<name>/` into the live `skills/<name>/` —
ONLY the 26 enumerated names, never the platform-managed skills —
idempotently. Modes: default sync (prints per-folder
COPIED/IDENTICAL) and `--check` (diffs each folder, exit 1 on
drift, prints the receipt). **Disclose:** the environment may clobber
`skills/` again (the 212ee4b precedent); `portable-skills/` is
canonical; re-run the sync; `--check` detects drift. The current
session does not hot-reload `skills/` — future sessions see the
synced copies. Validation:
`scripts/validate-skill-collection.mjs` (frontmatter, name/folder
match, description length, body size, no absolute paths, no TODO
markers — N/N PASS required).

## Provenance

Born from the R179 outside-world comparison (the Agent Skills format
is the industry's retrieval contract; the receipts discipline is the
content that travels inside it) and the R213/R214 portability rules:
a workflow is not done until its skill conversion exists. The 24-skill
collection + the two-layer architecture (canonical folder + sync) is
the R217 deliverable. Full receipts:
`docs/R217-PORTABLE-SKILLS-COLLECTION.md`.

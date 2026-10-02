---
name: requirements-register
description: Keep every standing user requirement in ONE register file (verbatim quote + decoded meaning + source + status, categorized) so requirements become durable INPUT that every plan, audit, and report cites by ID instead of living in chat history. Use this skill at project start and at every session where the user gives a requirement, when an agent keeps re-asking or contradicting earlier instructions, or when a long project's rules drift because "the user said so once" is no longer findable.
license: MIT
---

# Requirements Register

The failure class this skill prevents: **requirements as agent memory**.
A user instruction given in chat is read once, then decays: sessions
compact, agents re-derive policy from recent context, and standing
rules silently contradict each other. Six months in, nobody can say
what the user actually asked for.

The fix is a single file that makes every requirement durable, citable,
and re-readable.

## The pattern

One file (e.g. `docs/REQUIREMENTS-REGISTER.md`) holds EVERY standing
requirement as a row, categorized:

- **A. Product requirements** — what the product must do
- **B. Engineering standards** — how the code must be built
- **C. Style standards** — how the UI/copy must look and read
- **D. Process requirements** — how the work itself must run
- **E. Open decisions** — user taste-calls, with status

## The rules

1. **Capture the moment it is given.** A new requirement enters the
   register in the same session the user states it — verbatim quote +
   decoded meaning + source (session/date) + status. Never "I'll add
   it later."
2. **Verbatim quotes are sacred.** The user's exact words (typos
   included) are the primary record; the decoded meaning sits beside
   them, never replacing them. A paraphrase CREATES drift.
3. **Cite by ID.** Every plan, audit, design doc, and report names the
   register IDs it satisfies (e.g. "satisfies PR-2, AR-3"). An
   uncited requirement is an unread one.
4. **Changes need the user's explicit instruction.** Removing or
   altering a requirement is itself a recorded decision, never an
   agent judgment call.
5. **Open decisions live in their own section** with their status —
   taste-calls the owner owes an answer on, blocked items, deferred
   questions.

## The template

```markdown
# REQUIREMENTS REGISTER

## A. Product requirements
| ID | Requirement (decoded) | Source | Status |

## B. Engineering standards
| ID | Standard | Source | Status |

## C. Style standards
| ID | Standard | Source | Status |

## D. Process requirements
| ID | Rule | Source | Status |

## E. Open decisions (user taste calls)
| ID | Question | Options | Status |

## How this file is used (the wiring footer)
1. FIRST read at session start, before any planning.
2. New requirements enter the moment they are given.
3. Every plan/audit/report cites the IDs it satisfies.
```

## The wiring

- List the register as the required FIRST read in the project's
  session entry point (README/AGENTS/state file).
- Check new-requirement capture at session start ("did the user say
  anything last session that is not yet a row?").
- If a commit gate exists (pairs with `commit-gate`), wire a check
  that analysis/plan docs cite at least the register IDs they touch.

## Worked example (labeled: one project's rows)

| ID | Requirement (decoded) | Source | Status |
|---|---|---|---|
| PR-2 | Auth card above the fold on desktop | session 12, verbatim kept | standing |
| AR-2 | No em dashes in user-visible UI text | session 14 | standing |
| ER-1 | No dark-mode-only round; decorative changes need function | session 20 | standing |

Pairs with: `agent-context-state` (the register is a first-read input
to the session ritual), `feature-gap-analysis` and
`feature-analysis-framework` (the register is intake input #1), and
`owner-decision-format` (section E rows are the open-decision queue).

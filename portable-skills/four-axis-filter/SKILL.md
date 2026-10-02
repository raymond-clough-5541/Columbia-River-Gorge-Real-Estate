---
name: four-axis-filter
description: Filter every UI change through four mandatory axes — functional (wired to real behavior), scalable (holds at the extremes, derived from data), secure (no new attack surface), aesthetic (the project's style rubric) — so aesthetic compliance is never mistaken for done. Use this skill BEFORE implementing any UI change or audit finding, when triaging design/audit findings into actionable vs. rejected, or when a change looks pretty but might be decoration imitating function.
license: MIT
---

# Four-Axis Filter

The failure class this skill prevents: **aesthetic-only changes** —
decoration imitating function. An audit finding gets "fixed" by
polishing pixels; a feature ships a beautiful element wired to
nothing. Aesthetic compliance is necessary, NEVER sufficient.

## The rule

Every UI change must pass ALL FOUR axes before implementation. Any
failing axis blocks the change; findings that can only be satisfied
through axis-failing changes are logged non-actionable with the
failing axis named.

## The four axes (canonical definitions)

### 1. Functional
Every UI element must DO something real — wired to actual behavior,
working in the real user flow, doing what it claims. Bans:
- **Decoration imitating function** — an illustration that looks like
  a map but renders nothing; a button with no flow behind it.
- **Copy that does not match the data** — an invented count; words
  describing something other than what the data holds.
- **Elements that only fill space** — every pixel justifies itself
  with a job in the page's ONE primary purpose.

The positive test: trace a real path — data -> derivation -> rendered
pixels -> user action -> real consequence. If you can only describe
what it LOOKS like, it fails.

### 2. Scalable
The change must hold for EVERY user and situation, not just the demo:
- **Derived from data, never hardcoded** — a count that recomputes; a
  tint keyed to the item's own attributes.
- **Correct at the extremes** — 0 items, 10,000 items, missing
  images, very long names, no entries, many entries; empty/loading/
  truncation paths all handled.
- **No single-locale or single-demo assumptions** — one static
  depiction of one fictional place cannot be right for every real
  user location.
- **Maintainable at scale** — token-level styling over one-off
  values; shared patterns over per-surface reinventions.

### 3. Secure
The change must not open new attack surface or weaken protections:
- **No new inputs without validation** (schemas on client AND server).
- **No undue data exposure**; existing auth/rate-limit/validation
  gates stay intact and nothing bypasses them.
- **Dev chrome never leaks to production** (env-gated + tree-shaken;
  users see the product, not the tools).
- **Flows behave honestly** — an unconfigured provider says so;
  nothing pretends to work.

### 4. Aesthetic
The change must pass the project's style rubric in COLD audits —
reading as human-crafted, not machine-generated (pairs with
`anti-ai-ui-style` for the anti-AI-tells rubric; whatever published
style standard the project adopted otherwise). Includes the
banned-tells list and the recurring-findings discipline (pairs with
`cold-audit-discipline`).

## The triage convention

Every finding/prescription gets a verdict BEFORE implementation:

```markdown
| # | Finding | Functional | Scalable | Secure | Aesthetic | Verdict |
|---|---------|-----------|----------|--------|-----------|---------|
| 1 | Add glow to CTA | pass | pass | pass | FAIL (banned tell) | rejected: axis named |
```

- Failures are logged **non-actionable with the failing axis named**.
- Findings satisfiable only through axis-failing changes are
  aesthetic-only -> user decision, never a silent implement.

## The wiring

- Pairs with `commit-gate`: block UI commits whose design doc lacks a
  "Four-axis triage" section naming all four axes.
- Pairs with `planning-mode`: the triage table is part of every audit
  report that recommends UI changes.

## Worked example (labeled: one project's triage)

A VLM audit flagged "the sage bubble reads ~2.3:1" — measured
(pairs with `contrast-check`) the bubble TEXT passed 10:1 and the
BOUNDARY pair was 2.8:1; the fix strengthened the boundary ring
(aesthetic + functional pass), and the misread claim itself was
answered with the measured pair table, not a blanket "fixed".

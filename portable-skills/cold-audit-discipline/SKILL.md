---
name: cold-audit-discipline
description: Run quality/UX audits COLD — the context describes what the thing IS, never what changed or what to verify — because leading contexts inflate judge scores, and recurring findings (2+ runs) drive changes while single-run verdicts on stable elements are noise. Use this skill whenever an LLM/VLM judge scores screenshots or UI, when audit scores need to be comparable across runs, or when a judge's headline finding is about to become an implementation action.
license: MIT
---

# Cold-Audit Discipline

The failure class this skill prevents: **score-chasing** — the agent
optimizing for the audit proxy instead of the design target — fed by
**leading prompts** (contexts that tell the judge what changed
inflate its scores; measured at +2.0 on a 10-point scale in one
documented case) and **judge noise** (the same element praised and
panned across runs).

## The rules

1. **Cold contexts only** for gate decisions. The context describes
   what the thing IS, never what changed or what to verify.
   "New dashboard with cards X/Y" is a leading context; "A dashboard
   page" is cold.
2. **Recurring findings (2+ runs) drive changes.** Single-run
   verdicts on stable elements are noise. Brand-level elements are
   USER decisions, never judge decisions.
3. **Bands, not points.** Report the score BAND + run count
   ("6/10 band across 3 runs"); single-run point scores live in
   raw-output appendices only.
4. **Evidence-check every headline finding** against the DOM/source
   before triage (pairs with `receipts-or-retract`) — tiny-glyph
   findings are presumed misreads pending verification (see the
   misread classes below).

## The known blind spots (codified workarounds)

| Blind spot | The workaround |
|---|---|
| Static shots cannot verify hover/micro-interactions | Never flag "missing" without a state note; capture interaction states explicitly |
| Disabled-state shots over-flag ("dead" buttons) | Capture enabled + disabled as SEPARATE labeled shots |
| Tiny glyphs read as "emojis" at screenshot resolution | Presume misread; verify against the DOM (icon component vs text glyph) before actioning |
| Multi-image payloads degrade shot attribution | HARD LIMIT: at most 4 images per vision call |

## The verified-misread class (the recurring hallucination)

Vision judges repeatedly "see" emoji that do not exist in the source
(small icon-font/SVG renders misread as Unicode pictographs) and
"see" elements that are dev-only chrome. The protocol:

1. Every glyph/emoji/AI-tell finding gets a source-truth cross-check
   (grep the source for the claimed glyph) BEFORE it enters a
   findings list.
2. Verified misreads land in a dedicated "Verified MISREADS
   (non-actionable)" table with the grep evidence inlined.
3. The table is durable: future rounds read it, do not re-verify the
   same misread, and never implement against it ("remove the emoji"
   when there is no emoji).
4. A finding class that recurs across N audits with every retraction
   holding earns an AUTO-RETRACTION rule: claims in that class
   without NEW source evidence land directly in the misreads table.

## The session rule

Code changes and audits NEVER happen in the same session (one task
per session). The audit session runs audits, diagnoses, proposes the
next round, and stops; the code session implements. Mixing both
causes score-chasing — optimizing for the judge instead of the user.

## The wiring

- The limits (4 images/call, state labels, cold contexts) are
  enforced mechanically by the audit driver (pairs with
  `audit-driver`).
- The report template carries the band + evidence rules (pairs with
  `always-explain-format`).
- Pairs with `four-axis-filter` for the triage of verified findings
  and with `anti-ai-ui-style` for the rubric the cold audit scores
  against.

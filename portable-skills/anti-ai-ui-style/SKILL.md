---
name: anti-ai-ui-style
description: Build UIs that read as human-crafted, not machine-generated — write against a banned AI-tells list (gradient/glow CTAs, initials-avatar stacks, all-caps shouting, floating fake-UI cards, purple-to-indigo everything, card-ception, uniform grids, emoji as icons, em dashes in UI copy) at DESIGN time, keep copy truthful to the underlying data, enforce the rules with a mechanical source check every round, and run VLM audits only as cold, evidence-checked spot-checks with the known misread classes mitigated. Use this skill BEFORE building or restyling any UI surface, when a product must not look AI-generated, or when a VLM keeps flagging your UI as "vibe-coded".
license: MIT
---

# Anti-AI UI Style (the operational discipline)

The failure class this skill prevents: **the AI look** — UIs that
read as statistical averages from training data: competent,
forgettable, and instantly recognizable as machine-generated. This
is the project's most-repeated learned discipline: the rules were
codified as register rows and enforced by a machine check every
round; the fix that works is designing AWAY from the tells list
before code, not reacting to audit findings after.

## 1. The banned tells (the hard list)

No UI text, element, or composition ships with any of these:

- **Gradient/glow CTAs and decorative glow/aurora backgrounds** —
  especially purple-to-indigo gradients (the "Times New Roman of AI
  design"); radial highlight overlays.
- **Initials-avatar stacks** — the row of colored circles with
  initials that decorates every AI-generated landing page.
- **All-caps shouting** — micro-labels in heavy uppercase tracking
  everywhere.
- **Floating fake-UI cards** — the hero's tilted screenshot card,
  the "app window" illustration that renders nothing.
- **Stock-photo anchors** — the smiling-team banner used as a
  credibility prop.
- **Decorative emoji** — emojis as icons, bullets, navigation, or
  "personality" (a real icon system is the requirement).
- **Em dashes in user-visible UI text** — the typography tell (docs
  and code comments may use house style; UI copy may not).
- **Card-ception** — cards inside cards inside cards; everything
  equally contained.
- **Multicolored side tabs / status dots that map to nothing** —
  decoration that looks like data.
- **Uniform grids** — every element the same size; hierarchy by size
  alone.
- **Default-font-only typography** — the AI-default body font with
  no display pairing.
- **Labels that explain what an icon does** — signifiers should do
  the work; if a caption must explain a button, the design failed.
- **Invented proof** — fake "10x faster" claims, "99.9% uptime"
  nobody measured, filler content, lorem ipsum.

## 2. Copy truthfulness (the honesty layer)

A button that says X must DO X through the real behavior chain.
Copy that promises a review, a delivery, or a count that nothing
fulfills is treated as a bug of the same severity as a crash. Data
shown must be real or derived (an invented count on screen is a
functional failure, not a copy quibble). When delivery is
backend-gated, the surface carries the quiet disclosure line
("arrives with the account backend") instead of a lie. Demo/sample
data is visibly labeled on screen.

## 3. The build-time discipline (design away from the list, before code)

Per section, answer seven questions in the plan BEFORE writing code:

1. **What is this section's job?** (user-intent focused — "help a
   moderator decide a report in under 5 seconds", never "display
   data")
2. **What's the primary action?** (one per region; six equal buttons
   is a design failure)
3. **What personality should it have?** (tied to the brand's actual
   voice)
4. **What's the visual rhythm?** (varied heights, weights, spacing —
   a region where every element is the same size is a tell)
5. **What signifiers communicate function?** (icon + position +
   color, not labels)
6. **What's the color budget?** (one dominant, one accent, one
   neutral; every accent maps to a meaning; no new colors
   mid-feature)
7. **Where's the human touch?** (one deliberate detail per section:
   an asymmetry, a conversational empty state, a tactile texture —
   the absence of intent is the tell audits keep catching)

Then the required human-crafted signals: asymmetric layouts with
deliberate grid breaks; varied element sizes; generous negative
space with proximity-based grouping; one orchestrated page-load
motion (no permanent animations); a distinctive display+body font
pairing; semantic color only; empty states that guide to the next
action; one "wow" moment per section a human designer would sign.

## 4. The machine check (a lint/gate that enforces the rules every round)

Judgment is not a gate. Stand up a deterministic source check (a
script in the verification battery — pairs with `battery-runner`)
that greps the source mechanically, zero VLM judgment, for the
objective subset: the banned punctuation shapes in UI copy, the
AI-tell phrases, emoji in source, and the a11y semantics. It writes
a timestamped audit file and exits nonzero on any FAIL. Every build
round runs it and must show 0 FAIL before the round-end commit;
warnings get triaged, FAILs get fixed (pairs with `commit-gate`).

## 5. The VLM audit, when one IS needed (cold, evidence-checked, mitigated)

When a visual quality pass is genuinely needed (new surfaces, big
restyles — not every round):

- **Order matters:** fix code -> seed comprehensive test data ->
  walk the real flows human-style with screenshots at each key step
  (pairs with `human-e2e-testing`) -> THEN analyze the flow
  screenshots -> fix the findings. Static page-top audits are
  spot-checks only, never the audit of record.
- **Cold contexts only**; bands, not points; recurring findings
  drive changes (pairs with `cold-audit-discipline`).
- **The misread classes are known — mitigate, do not implement
  against them:** small icon-font/SVG renders get "seen" as emoji
  (source-truth grep before any action; verified misreads land in a
  non-actionable table with the evidence; a recurring misread class
  earns an auto-retraction rule); dev-only chrome gets flagged as
  product; disabled-state shots over-flag; tiny glyphs are presumed
  misreads pending DOM verification.
- **One task per session:** code changes and audits never mix —
  mixing causes score-chasing (optimizing for the audit proxy
  instead of the design target).
- Contrast claims get measured, not trusted (pairs with
  `contrast-check`).

## The wiring

1. Paste the banned list + the seven questions into the project's
   design template (the plan doc answers them per section).
2. Add the machine check to the battery; require 0 FAIL at round
   end.
3. Register the four-axis triage for every UI change (pairs with
   `four-axis-filter` — aesthetic compliance is necessary, never
   sufficient).
4. The audit driver (pairs with `audit-driver`) enforces the
   4-image limit + state labels mechanically.

Worked example (labeled: one project's rule rows): the tells list
above began as 3 register rows (a banned-emoji row, an
em-dash-in-UI-copy row, a copy-truthfulness row), accumulated
findings across audit rounds, and ended as this skill — the
discipline's stable core, importable whole.

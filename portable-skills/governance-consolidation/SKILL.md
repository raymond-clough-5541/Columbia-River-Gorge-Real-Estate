---
name: governance-consolidation
description: Keep ONE current-rulebook file that extracts every governing rule verbatim from the source docs — the sources stay as forensic record with "consolidated" banners — so rule lookup is O(1) and amendment archaeology (following chains of in-doc amendment markers across N docs) disappears. Use this skill when standing rules are scattered across history docs, when agents cite superseded rules because the current state is buried, or when every governance question costs a five-document dig.
license: MIT
---

# Governance Consolidation (one rulebook)

The failure class this skill prevents: **rule lookup across N docs**
and **amendment archaeology** — reconstructing what is currently in
force by following chains of in-place amendment markers across
documents. The agent cites a superseded rule because the current one
lives three amendments deep in a different file; every governance
question costs a dig; the dig is often skipped and the rule guessed.

## The pattern

ONE current-rulebook file (e.g. `docs/GOVERNANCE.md`) extracts every
governing rule VERBATIM from the sources. The sources REMAIN in-repo
as forensic record, each carrying a top banner: "consolidated — read
GOVERNANCE.md first for the current rules."

Rule lookup becomes O(1): one file, current state, nothing else.
Superseded docs keep their history role and lose their
authoritative-role confusion.

## The extraction discipline

- **Verbatim-accurate.** A rushed paraphrase CREATES drift — the
  consolidated file would become a new source of divergence instead
  of the single current one. Copy the rule text exactly; add the
  source citation beside it.
- **Asserted + verified edits.** Every edit to the rulebook is
  verified after writing (pairs with `receipts-or-retract`).
- **The consolidated file cites its sources** — every rule row names
  where it came from, so the forensic trail survives the
  consolidation.

## The maintenance rule

New rules land in the rulebook AT THE MOMENT they are decided —
the same capture rule as the requirements register (pairs with
`requirements-register`): the decision session writes the rulebook
row in the same session, never later. The source docs get their
banner once, at consolidation time; new amendments go to the
rulebook (and their own decision record — pairs with
`adr-decision-register`), not to in-place edits of the old docs.

## The wiring

- The entry-point docs (index/resume/README) route to the governance
  file FIRST.
- The agent preamble points to it.
- Superseded docs get banners, NEVER deletions — the forensic record
  is the mistakes-log's evidence; deleting it destroys the ability
  to audit why a rule changed.
- Pairs with `agent-context-state` (the rulebook is a first-read at
  session start) and `commit-gate` (checks cite the rules they
  enforce).

## Worked example (labeled: one project's consolidation)

Rules lived across a requirements register, three methodology docs,
a mistakes log, and round-close prose. Every "what is the current
rule for X" cost reading all five plus their amendment chains. The
consolidation round extracted ~40 rules verbatim with sources into
one file; the five sources got banners; lookup went from an
archaeology dig to a single file read. The amendment-archaeology
class was later killed structurally by moving decision STORAGE to
one-file-per-decision (the `adr-decision-register` skill) — the two
compose: the rulebook is the current-state view, the ADR directory
is the decision history.

---
name: adr-decision-register
description: Store every standing decision as exactly one numbered MADR-lite file in a dedicated adr/ directory — status line (accepted/amended/retired with links), context, the decision itself, and the owner's verbatim words — with a README index and a root AGENTS.md entry point, so decision lookup is a filename search and current state never buries under history. Use this skill when decisions-as-rows get restated across N docs, when amendment archaeology wastes sessions, or when a new agent lands in a repo with no root entry point.
license: MIT
---

# ADR Decision Register (one decision, one file)

The failure class this skill prevents: **decisions-as-rows restated
across N docs** (amendment archaeology — reconstructing what is
currently in force across a chain of in-place amendments) and
**decisions logs that bury current state under history**. Also: the
missing root entry point that leaves a convention-aware agent
stranded outside the project's context tiering.

## The pattern

Every standing decision gets exactly one numbered file in a
dedicated `adr/` directory, in a MADR-lite shape:

```markdown
# DR-NN: <short title>

- **Status:** accepted | amended by DR-XX | retired by DR-XX
- **Date / Source round:** ...
- **Decided by:** the owner (verbatim quote) | the agent (delegated)

## Context
What prompted the decision (2-8 lines).

## Decision
The decision itself, verbatim where the owner's words exist —
never paraphrased.

## Consequences + pointers
What changes, what it supersedes (links BOTH directions), the
enforcement pointer (which gate/doc carries it).
```

A register/README in the same directory is the index.

## Why it beats the alternatives

- **vs. decisions-as-rows-in-one-big-register:** the row's full text
  has one home (no restatement drift across N docs), and amendment
  archaeology becomes reading one status line plus one linked chain.
  Lookup is a filename search.
- **vs. an append-only decisions log:** a log buries the CURRENT
  state of a decision under its history; the ADR file surfaces it in
  the header and keeps the history linked, not inline.
- **vs. plain MADR:** keep the storage format, thicken the record
  where the project needs it — the owner's verbatim words (never
  paraphrased), the round receipts, the enforcement pointers.

## The migration discipline

When adopting on a project that already has decisions recorded
elsewhere: move the existing records **VERBATIM** — mechanically if
possible (a small script that parses the old register and emits the
files guarantees byte-exact copies of the owner's quoted words).
Never paraphrase during migration: a rushed paraphrase CREATES drift.
The old register becomes the index (its read-first role survives; the
full text moves).

## The boundary pattern (which decisions land here)

- Decisions that shape the product still go to the owner in the
  decision memo format (pairs with `always-explain-format`).
- **Structural, reversible, zero-product-behavior choices**
  (storage, docs organization, tooling) are the AGENT's to make and
  record here — with options + reasoning + the override line — so
  the owner can reverse them by their own word without having been
  asked.

## The entry-point pattern

A root `AGENTS.md` (the convention standard) points every
convention-aware agent at the context tiering: the live state file
(pairs with `agent-context-state`), the rulebook (pairs with
`governance-consolidation`), the register index, the worklog — so
the ADR directory is discoverable from the repo root in one hop.

## The wiring

- The register (or its index) is required reading at session start.
- New decisions append a file + an index row — never rewrite the
  original text; amendments link, they do not edit.
- The commit gate can require the index row for any commit that
  carries a decision (pairs with `commit-gate`).

---
name: omega-deep-research
description: The anti-hallucination deep-research protocol for multi-entity research, claim-dense audits, and vendor/product evaluations — primary sources only, zero parametric memory, sequential extraction with verbatim-quote scratchpads, hypothesis registers with no silent omissions, citation-or-flag on every factual sentence, and a post-generation audit on every response. Use this skill automatically whenever the task is deep research, comparing or evaluating multiple products/frameworks/platforms, auditing a claim-dense document or thread, producing a research report grounded in verifiable sources, or any request where "the model confidently said so" must not be the evidence. Built from the OMEGA v2.0 COMPLETE EDITION engine (the twelve amendments D1–D12 from two documented incident post-mortems).
license: MIT
---

# OMEGA Deep Research & Zero-Omission Engine (v2.0 COMPLETE)

The failure class this skill prevents: **the confident hallucination**.
Reconstructed quotes that read plausibly. Attribute bleed between similar
entities. The forum claim recycled as fact. The silent omission — the
question the engine skipped because its evidence was empty. Every rule below
is a mechanism for making those failures VISIBLE instead of trusting the
model's discipline.

**Design premise:** treat yourself as an unreliable narrator whose footnotes
are always plausible. Models under output pressure skip ceremony, reconstruct
quotes, and cite convenient sources — on every tier tested. Where this
protocol runs in a pipeline, enforce the checks in code (substring-verify
quotes, gate phases, inject flags on empty evidence), never in memory.

## When to Use

- Deep research across multiple entities (products, frameworks, platforms,
  vendors, standards, papers) — one scratchpad per entity, no batching.
- Auditing a claim-dense input (a discussion thread, an article, a report) —
  every distinct claim becomes a numbered hypothesis before researching.
- Any deliverable whose factual sentences must trace to verifiable sources.
- Evaluations where vendor marketing and community opinion must be separated
  from primary documentation.

## The Protocol (copy-paste ready)

### 0. TASK-RESTATED GATE — before anything
Restate what was asked in one plain sentence. It must be the first entry of
the Execution Ledger. A wrong task executed perfectly is still wrong.

### 1. THE ZERO-OMISSION PROTOCOL (PHASE 0) — the Ledger is your first output
No preamble, no verdicts, no searches before it. If you begin with anything
else, you have already failed the protocol. The Ledger carries:
- **Explicit Directives** — the primary goals (first entry: the task restatement).
- **Negative Constraints** — every "do not / avoid / never / exclude".
- **"Quiet" Details** — subtle formatting asks, edge cases, tone, minor
  variables mentioned in passing.
- **Disambiguation Warnings** — commonly confused entities in the prompt +
  how you will keep their attributes separated; for claim-dense inputs,
  pre-register the domain's known attribute-bleed risks.

### 2. ANTI-HALLUCINATION & SOURCING MANDATE
- **PRIMARY SOURCES ONLY** — official documentation, whitepapers, RFCs,
  peer-reviewed papers, official repositories.
- **ZERO PARAMETRIC MEMORY** — a claim you cannot verify against a primary
  source is flagged `[UNVERIFIED - DOC SILENT]`. Do NOT guess.
- **EXCLUSION MANDATE** — never cite forums, Reddit, social threads, or SEO
  blog posts as factual evidence; only `[ANECDOTAL / UNVERIFIED]`.
- **SEARCH TRIAGE** — you may READ forums/blogs to LOCATE primary sources,
  but may only CITE primary. Check the domain before every citation.
- **QUESTION-SOURCE FIREWALL** — if the task input is itself from a
  forbidden source class (a thread, a blog, marketing), it may define WHAT
  TO TEST but never WHAT IS TRUE.
- **HUNT, DON'T ONLY FLAG** — when a claim fails verification but matters,
  run a governed search for the actual paper/report/filing before settling
  for a flag. A flag is a checkpoint, not a finish line.
- **VENDOR LABELING** — vendor-biased sources are labeled VENDOR SOURCE and
  used only where corroborated.

### 3. SEQUENTIAL EXTRACTION (PHASE 1 — MAP)
One entity at a time. No premature synthesis. For each entity, output a
Research Scratchpad in JSON — verbatim evidence gathered BEFORE conclusions:

```json
{
  "target_entity": "",
  "primary_sources_consulted": [""],
  "research_scratchpad": {
    "core_attribute_1": {"claim": "", "verbatim_evidence": "Exact quote from source"},
    "negative_constraint_check": "how this entity adheres to the user's negative constraints"
  }
}
```

**VERBATIM MEANS VERBATIM** — `verbatim_evidence` must be an exact substring
of the source. Models reconstruct quotes with prefix-accurate,
suffix-divergent drift and no felt sense of error; when deployed in a
pipeline, verify by literal substring search.

**CLAIM-DENSE INPUTS — the Hypothesis Register:** enumerate every distinct
claim as its own numbered, testable item BEFORE researching. Every claim maps
to exactly one item; an unanswered item stays as a visible empty row in the
final matrix — omission becomes structural, not silent. Verdict vocabulary:
`CONFIRMED [source ID]` / `PLAUSIBLE` / `REFUTED [source ID]` / `ALLEGATION`
/ `UNVERIFIABLE`.

**PACING** — at token limits, stop and emit `[TOKEN LIMIT REACHED: Type
'CONTINUE' to resume extraction]`. Never truncate silently. **TURN-GATE** —
Phase 0 and Phase 1 in your first response; synthesize only after the user
types CONTINUE. **COMPACT MODE** — scratchpads may abbreviate to claim+quote
when registers run long or the task is small.

### 4. SYNTHESIS & DELIVERABLES (PHASE 2 — REDUCE)
Only after ALL scratchpads exist and the gate is passed. Structure exactly
as the user's directives requested. Use ONLY verified scratchpad data.
- **CITATION-OR-FLAG** — every factual sentence carries a source ID matching
  a dedicated reference section, or is explicitly marked `[ANALYSIS]`,
  `[UNVERIFIED - DOC SILENT]`, or `[ANECDOTAL / UNVERIFIED]`. No unlabelled
  factual sentences.
- **KNOWLEDGE HORIZON** — for fast-moving topics, state the knowledge
  cutoff / current date at the top and date-stamp every source.
- Render the verdict matrix with one row per registered hypothesis — empty
  rows stay visible.

### 5. POST-GENERATION AUDIT (every response, not only the final one)
```
- [ ] Did I violate any Negative Constraints? (Yes/No)
- [ ] Did I include all "Quiet" Details? (Yes/No)
- [ ] Are all factual claims backed by the Phase 1 Scratchpads? (Yes/No)
```

## The Execution Order (the SOP that produced compliant runs)

1. Restate the task → 2. Ledger first → 3. register claims if claim-dense →
4. firewall contaminated inputs → 5. search with triage → 6. one scratchpad
per entity (verbatim first, flag gaps, hunt primaries) → 7. respect pacing →
8. gate synthesis → 9. synthesize with source IDs only → 10. audit every
response.

**Remediation loop on a failed run:** admit → audit honestly → fix the root
cause (mechanism, not memory) → full compliant re-run. A silent patch fixes
one response; a protocol fix fixes all future ones.

## Reference Table template

| ID | Source | Type / Recency | — mark VENDOR sources explicitly; date-stamp when facts move fast.

## Canonical source

The complete edition (Parts I–V: the protocol, the operator SOP, the template
kit, the model-reliability findings, the version history — including the two
incident post-mortems the twelve amendments came from) lives at
`docs/research/r219/OMEGA-DEEP-RESEARCH-ENGINE.md` in the Free-Trader-Remake
repository. This skill is the deployable extraction of Part I + III.

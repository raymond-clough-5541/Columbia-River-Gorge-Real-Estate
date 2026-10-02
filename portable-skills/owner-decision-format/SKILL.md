---
name: owner-decision-format
description: Escalate decisions to a human owner without bare questions. Every question arrives as a decision memo — 2 to 4 options each with pros AND cons, exactly ONE recommendation, the reasoning argued from the project's own record (receipts, past rounds, standing rules), and the what-changes-if-overridden line. Use this skill whenever an AI agent needs a human decision (approvals, direction, trade-offs, ambiguous directives), when preparing a decision deep-dive over several questions at once, or when a project owner should never receive a bare question again.
license: MIT
---

# Owner Decision Format

The failure class this skill prevents: **the unevaluable question**. An
agent asks the owner "should we do X or Y?" — no context, no trade-offs,
no recommendation. The owner cannot evaluate it without doing the
agent's homework; the answer becomes a coin flip the agent later treats
as informed direction. Worse: option lists without a recommendation
transfer the analytical work to the person least positioned to do it,
and recommendations without reasoning are indistinguishable from
guesses with confidence.

The rule, standing: **the owner never receives a bare question, an
options list without a recommendation, or a recommendation without the
reasoning.**

## When to Use

- Any point where a build decision needs the owner's approval.
- Any moment the directive is ambiguous and the agent must choose an
  interpretation (decode it, but disclose the decoding — do not
  silently pick).
- Periodic decision deep-dives: several accumulated questions
  answered in one memo.
- Any "should we keep doing X / start Y / stop Z" moment.

## When NOT to Use (the boundary — decide and record instead)

Not every choice is an owner question. When the choice is ALL THREE of:

1. **Zero product behavior change** (storage format, docs
   organization, tooling, repo structure — nothing the app does,
   shows, or promises changes),
2. **Zero queue seats** (it consumes or reorders no approved feature
   work), and
3. **Mechanically reversible** (the record preserves the exact prior
   state),

…then the agent **chooses the best option itself and records the
decision the same way this skill records an owner answer**: options,
pros/cons, the one recommendation, the reasoning argued from the
project's record, the override line, and the note that the owner
delegated this class (or would — the delegation quote if one exists).
The build proceeds immediately; the owner can reverse any such
decision later by their own word.

The inverse failure is worse than over-asking: presenting a
structural choice as if the owner's fingerprints belong on it wastes
the owner's attention on questions the agent is equipped to answer.
(Worked example from the origin project: an "adopt an ADR directory?"
survey left waiting on the owner for two rounds — the owner's
correction: "this is not a user decision … you must choose the best
option.")

Product-shaping choices (features, powers, reversibility trade-offs,
queue order, scope, tone, thresholds) are NEVER in this class — those
memos always go to the owner.

## The Memo (one question)

Five required parts, in order:

1. **The question, one line.** Plain language, no jargon, no hedging.
   If the question only exists because of prior rounds, one clause of
   context — never a paragraph.
2. **The options — 2 to 4, each with pros AND cons.** Both lists
   honest. A pro that is really a con wearing a costume is a
   lie-shaped sentence. If an option is cheap but wrong, its "cheap"
   goes in pros and its "wrong" goes in cons — visibly.
3. **THE recommendation — exactly one.** Never "A or B, both fine."
   Never a menu of maybes. If the agent cannot pick one, the question
   is not ready for the owner — do more analysis first.
4. **The reasoning — argued from the project's OWN record.** This is
   the part that separates a recommendation from a guess: cite the
   prior rounds, the receipts, the standing rules. "Option B, because
   the record shows the same approach worked in <case> and the
   standing rule <rule> names exactly this trade-off." The owner
   should be able to CHECK the reasoning against files.
5. **The override line.** What changes if the owner picks differently
   — scope, cost, what gets deferred. One sentence. This is what
   makes the memo a real decision instrument: the owner sees the
   price of each path before choosing.

## The Deep-Dive (several questions at once)

When questions accumulate (the periodic review moment), the memo
gains structure:

- **Per question:** the five parts above, unchanged.
- **The interaction map:** which answers affect which (Question 2's
   recommendation assumes Question 1's answer; if the owner overrides
   Q1, here is what happens to Q2). Owners answer holistically even
   when memos are structured — give them the dependencies.
- **The build order:** if all recommendations are approved as-is, the
   sequence in which they should be built and why (dependencies
   first, risk-reduction first, or quick-wins first — name the
   ordering principle).
- **The how-to-answer guide:** for each option, a one-phrase label
   the owner can reply with ("Option A" / "B but skip the second
   part"). Lower the friction of a precise answer.

## Decoding Ambiguous Directives

Owner instructions arrive typo-laden, context-heavy, half-remembered.
The rules:

- Decode the intent faithfully; **disclose the decoding** in the
  worklog ("the directive, verbatim: <text> — decoded as: <reading>").
- If the decoding could go two materially different ways, that
  ambiguity is ITSELF a question for the owner — this format, one
  question, two interpretation-options, the recommendation being the
  reading the record supports.
- Never silently pick the interpretation that is easier to build.

## Reasoning Sources (ranked by weight)

1. The project's standing rules (the owner's own prior directives —
   they outrank the agent's preference every time).
2. Receipts from prior rounds (what actually happened when the
   project tried the adjacent thing).
3. The current record's constraints (frozen scopes, gated work).
4. General best practice — last, and labeled as such. "Industry
   standard says X" is a tiebreaker, not an argument, and the owner
   should see when it is being used as one.

An argument built only from source 4 is a weak memo. Say so.

## Anti-Patterns

- **The bare question**: "Should we migrate the DB?" — retracted on
  sight; rewrite before sending.
- **The options dump**: 4 options, 12 sub-bullets, no recommendation.
  The agent is asking the owner to do the agent's job.
- **The false binary**: two options where the real answer is "neither
  — the premise is wrong." If the premise is shaky, Question 0 is
  "is the premise right?" and that memo goes first.
- **The reasoned guess**: a confident recommendation whose reasoning
  cites nothing checkable. Mark it honestly ("no record applies
  here; this is judgment, not precedent") or do more analysis.
- **The vanishing override line**: omitting what changes if the
  owner decides otherwise — the memo becomes a funnel, not a choice.
- **The invented urgency**: "we must decide today." Unless true,
  it is pressure-shaped manipulation. If true, say why.

## Quick Reference

| Topic | File |
|---|---|
| One-question memo template | `decision-template.md` |
| Deep-dive (multi-question) skeleton | `decision-template.md` |
| Worklog/approval ledger row shape | `decision-template.md` |

## Scope

This skill covers decision escalation only. Recording the context that
the reasoning cites is `agent-context-state`; verifying that an
approved decision actually works is `verified-build-round`; collecting
the questions worth asking is `feature-gap-analysis`.

# Templates — owner-decision-format

## The one-question memo

```markdown
## Question <n>: <one-line plain-language question>

<One clause of context if needed. No more.>

| Option | Pros | Cons |
|---|---|---|
| A — <label> | <honest pro> · <honest pro> | <honest con> · <honest con> |
| B — <label> | <honest pro> | <honest con> |
| C — <label> | <honest pro> | <honest con> |

**Recommendation: <Option X>.**

**Reasoning from the record:** <cite the standing rule / the prior
round's receipt / the frozen scope that makes X the fit. The owner
must be able to check every citation against a file.>

**If overridden:** <one sentence — what changes in scope, cost, or
deferral if the owner picks a different option.>

**How to answer:** "<Option letter>" or "<one-phrase variant, e.g.
B but only the first half>".
```

## The deep-dive skeleton (several accumulated questions)

```markdown
# <Project> — the <n> open decisions, one memo

> Format: every question carries its options, one recommendation, and
> the reasoning argued from this project's own record. Nothing here
> is a bare question. Answer per-question with the one-phrase labels;
> "approve all as written" is also a complete answer.

## Question 1: <...> (the five parts, per the one-question memo)
## Question 2: <...>
## ...

## The interaction map

- Question <a>'s recommendation assumes Question <b>'s answer. If
  you override <b>, <what happens to <a> — which option becomes the
  fit, or what re-analysis is needed>.
- <dependency pairs in plain language>

## The build order (if approved as written)

1. <Item> — <why first: the dependency / the risk reduction / the
   ordering principle, named>
2. <Item>
3. ...

## How to answer

- Per question: "<Option letter>" (or the phrase variant).
- Whole memo: "approve all as written" / "approve 1 and 3, 2 as
  option B" — any mix works; the map shows what follows.
```

## The approval-ledger row (in the project's approvals doc)

```markdown
| <round/dec-id> | <the owner's directive verbatim (typos kept) +
the decoded reading, disclosed> | <what was decided: the chosen
options, in the owner's words where possible> | <scope: files and
artifacts the decision touches> | <status: approved / pending /
superseded by <id>> |
```

Ledger rules:

- The directive column keeps the owner's words verbatim — the record
  of what was actually asked, not what was conveniently heard.
- Superseded decisions stay in the table with their supersede pointer
  (decision history is append-only, like everything else in this
  discipline).

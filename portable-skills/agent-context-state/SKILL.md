---
name: agent-context-state
description: Keep an AI coding agent's context across sessions with state-as-file discipline. Maintains a SESSION-STATE file (the single current-state doc, auto-refreshed at every commit), an append-only worklog (one entry per work unit, never overwritten), and a session-start ritual that rebuilds context from the record instead of from memory — including the environment-contract step: on ANY environment mismatch (rollback, fresh sandbox, missing hooks, stale refs), the agent reads the repo's own redeploy/recovery docs (e.g. REDEPLOY.md / REDEPLOY-PROMPT.md) and follows THAT playbook, never an ad-hoc recovery. Use this skill when an agent forgets prior decisions between sessions, drifts from standing rules, when multiple agents or rounds must share one history, or when a long project keeps losing its thread across context resets and handoffs.
license: MIT
---

# Agent Context State

The failure class this skill prevents: **context amnesia**. An AI agent's
memory resets between sessions, mid-session compaction silently drops
detail, and "I remember doing X" becomes a guess that drifts into
confident wrong claims. The fix is not better memory — it is making the
file system the memory.

Three rules:

1. **The state file IS the current context.** One small file, read at
   session start, updated at every commit. The agent never has to
   remember — it just reads.
2. **The worklog is append-only truth.** One entry per work unit
   (round, task, subagent job). Never rewritten, never summarized away.
   History is never edited; corrections become new entries.
3. **Context is rebuilt from the record, never from memory.** At every
   session start the agent re-derives "where are we" from files and
   git history — never from what it thinks it remembers.

## When to Use

- Any project worked on across more than one session.
- Any project where multiple agents (main + subagents) work in
  parallel and must not collide or duplicate.
- Any long-running project with standing rules that must survive
  context resets ("frozen", "watch items", "never do X").
- Handoffs: a fresh agent (or a human) must be able to resume from
  the files alone.

## The Three Files

### 1. `SESSION-STATE.md` — the current-state pointer

A single file, intentionally small (readable in one screen). Sections:

- **Current task** — what was just completed (with receipts), and
  what is explicitly NEXT.
- **Previous items** — the last 3-5 completed units, one line each
  (enough to answer "how did we get here", not a full history).
- **Standing rules** — the owner's permanent directives (frozen
  scopes, banned practices, format rules). These are RULES, not
  notes: every future session must obey them.
- **Watch items** — known traps with their proven fixes (recurring
  tool bugs, flaky behaviors, environment quirks). Each entry: the
  symptom, the cause, the fix that worked, and how many times seen.
- **The queue** — approved-but-not-built work, in order, with the
  "next up" item named.

Update triggers (any of these → rewrite the file): a work unit
completes, a standing rule changes, a watch item gains an occurrence,
the queue advances. The update happens in the SAME unit that caused
it — never "later".

### 2. `worklog.md` — the append-only history

One entry per work unit. The entry is written at the END of the unit
(it is a record of what happened, not a promise). Every entry uses
the SAME template (see `templates.md`):

- A separator line, then: Task ID, Agent, Task (the instruction, kept
  verbatim or decoded-with-disclosure).
- **Work Log** — concrete steps in order: what was read, what was
  decided, what was built, what was verified, what broke and how it
  was fixed (in-round fixes are part of the record, not noise).
- **Stage Summary** — the key results: deliverables, gate numbers,
  decisions made, what is next.

Rules:

- APPEND ONLY. Never edit a prior entry. If an entry was wrong, the
  correction is a new entry that says so.
- Every claim in an entry should be checkable (a file path, a test
  count, a log line) — the worklog is a receipt book, not prose.
- Subagents that share the project append to the SAME worklog with
  their own Task IDs. Before appending, re-read the tail; if another
  agent appended concurrently, re-read and retry (append-only makes
  conflicts recoverable — the retry cannot destroy anything).

### 3. The resume pointer (optional but cheap)

A one-line "start here" file or the top of the state file:
`RESUME: read SESSION-STATE.md, then the worklog tail, then git log
-5. Do not trust memory.`

## The Session-Start Ritual

Run at the start of EVERY session, before any work:

1. Read the state file in full.
2. Read the worklog tail (the last 1-3 entries — enough to cover the
   previous unit).
3. Check the repo tip: `git log --oneline -5` and `git status` —
   verify the tree matches the state file's claim (a dirty tree or a
   different tip means the environment changed; investigate before
   building).
4. Verify the environment contract: hooks installed, remotes
   configured, services actually up (dev server; a cheap smoke run
   if available). On ANY mismatch — rollback symptoms, missing
   hooks, stale refs, dead services — read the repo's
   redeploy/recovery docs (e.g. `REDEPLOY.md` / `REDEPLOY-PROMPT.md`)
   and follow THAT playbook; never recover ad-hoc. If the repo
   carries such docs, they outrank generic recovery patterns
   everywhere they conflict (they encode this repo's proven
   recoveries).
5. Only then plan the session's first unit. If anything contradicts
   the state file, THE RECORD WINS — the discrepancy itself becomes
   the first work item of the session (disclosed, not silently
   papered over).

The ritual is deliberately mechanical. It converts "the agent
remembers" into "the agent read" — a checkable claim.

## Parallel Agents

- One shared worklog, append-only, unique Task IDs per agent.
- IDs that reflect order and parallelism (e.g., `3`, `4-a`, `4-b`)
   make the history readable without a diagram.
- Each subagent's prompt MUST include: its Task ID, the instruction
  to read the worklog before working, and the entry template.
- The main agent integrates subagent results and owns the state file
  (subagents append worklog entries; only the round owner rewrites
  SESSION-STATE, so the pointer never forks).

## Anti-Patterns (each of these actually happened somewhere)

- **Memory-as-context**: "I recall we decided X" with no file behind
  it. Retracted on sight.
- **The summarized-away history**: rewriting old entries "for
  clarity" — destroys the receipt chain. Archive instead (move old
  entries to an archive file, keep the path).
- **The stale pointer**: the state file says NEXT: X, but three units
  happened since. Update triggers exist precisely for this.
- **The promise-entry**: a worklog entry written BEFORE the work
  ("will do X"). Entries record what happened; plans live in plan
  files.
- **The private log**: a subagent keeping its own notes file instead
  of appending to the shared log — the history forks silently.

## Quick Reference

| Topic | File |
|---|---|
| State-file, worklog-entry, resume templates | `templates.md` |

## Scope

This skill provides the context-state pattern only. Verification
gates live in `verified-build-round`; decision escalation lives in
`owner-decision-format`; completeness auditing lives in
`feature-gap-analysis`. Install all four for the full discipline.

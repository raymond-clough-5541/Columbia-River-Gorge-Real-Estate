# Templates — agent-context-state

Copy-paste shapes. Placeholder text in angle brackets; delete this line.

## SESSION-STATE.md template

```markdown
# SESSION STATE — auto-maintained by the enforcement gate

> This file IS the current state. The session-start gate reads it.
> Updated at every commit and every audit. The agent never has to
> remember — it just reads this file.

---

## Current task

- **Item:** **<ID> COMPLETE — <one paragraph: what was delivered, the
  receipts (file paths, test counts, log lines), and the honest
  boundaries (what was deliberately NOT done and why).>**
- **Item (previous):** <one line for each of the last 3-5 units.>

- **Type:** <build round / writing round / audit round / research
  round>. NEXT: **<ID> = <the next queue item, one line>**.
- **Standing rules:** <the owner's permanent directives, verbatim or
  decoded-with-disclosure. Never paraphrased into mush — keep them
  pointed.>
- **Watch items:** <each: the symptom, the cause class, the proven
  fix, the occurrence count.>
- **Status:** <one line: done-state of the current unit + queue
  position + services health.>

## Score history (if quality gates exist)

| Round | Scope | Result |
|---|---|---|
| <id> | <scope> | <the honest number, never the flattering one> |
```

## worklog.md entry template

```markdown
---
Task ID: <id, e.g. 4-a — order-reflecting, parallelism-reflecting>
Agent: <agent name/role>
Task: <the instruction as given — verbatim if it came from the owner
(typos included, decoded reading disclosed); summarized only if long
and mechanical.>

Work Log:
- <concrete step 1 — what was read/decided/built/verified>
- <concrete step 2>
- <...in-round fixes and gate failures belong here too, with how
  they were resolved — they are part of the record>

Stage Summary:
- <key results: deliverables with paths, gate numbers, decisions,
  what is next>
```

Rules encoded in the shape:

- The `---` separator starts every entry (append tools can anchor on
  it safely).
- `Work Log` = steps in order. `Stage Summary` = the takeaways.
- No entry without at least one checkable reference (a path, a count,
  a log line). If a claim has no receipt, it belongs in the plan, not
  the log — or it gets retracted.

## Resume pointer template

```markdown
# RESUME HERE

1. Read `SESSION-STATE.md` (in full).
2. Read the last 2-3 entries of `worklog.md`.
3. `git log --oneline -5` + `git status` — confirm the tree matches
   the state file. If it does not, THE RECORD WINS; the discrepancy
   is the first work item of this session (disclose it).
4. Verify services: dev server up, test suite green if cheap.
5. Only then plan the session's first unit.

Do not trust memory. Trust the record.
```

## Subagent briefing block (paste into every subagent prompt)

```text
PROTOCOL:
- Your Task ID: <id>. Read the tail of <worklog path> before working.
- At the END of your work, append ONE entry to <worklog path> using
  the standing template (separator line, Task ID, Agent, Task, Work
  Log steps, Stage Summary). Re-read the tail right before appending;
  if the append fails because another agent wrote concurrently,
  re-read and retry.
- You may only write: <the files this task owns>. Everything else is
  read-only.
```

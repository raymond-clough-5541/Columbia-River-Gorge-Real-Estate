---
name: battery-runner
description: Run every verification gate (types, quality, security, tests) through ONE project-agnostic runner that always runs all gates, captures failures with context, treats timeouts as failures, and writes a timestamped plain-markdown log that IS the citable receipt. The executable package is a copy-to-any-project folder (portable-workflows/battery-runner/); this skill carries the usage knowledge: the config schema, the run command, the failure-accounting self-check. Use this skill when verification is a console scrollback nobody can cite, or when gates get skipped because one failed.
license: MIT
---

# The Portable Verification Battery (battery-runner)

The failure class this skill prevents: **verification harnesses that
die with their project** (a battery hard-coding one repo's gate
commands is unrunnable the moment the next project differs) and
**"it passed" claims without a committable artifact** — the battery's
product IS the log you cite, not a console scrollback.

## The pattern (runner + gate configs)

The workflow splits into **runner** (project-agnostic, never edited)
and **gate configs** (JSON files that ARE the project):

- The runner knows only "run command -> capture output -> write
  timestamped log -> exit nonzero on failure." Zero project strings,
  node builtins only.
- A config names the gates:

```json
{
  "name": "my-project",
  "gates": [
    {"name": "types", "command": "bunx tsc --noEmit"},
    {"name": "lint", "command": "bun run lint", "timeoutSec": 300},
    {"name": "security", "command": "bun run security-check"},
    {"name": "tests", "command": "bunx vitest run", "timeoutSec": 900}
  ],
  "logDir": "logs/battery"
}
```

Any shell command; exit 0 = pass.

**The executable package lives at `portable-workflows/battery-runner/`**
(runner `run.mjs` + example configs + README). Copy that folder into
the target project; this skill is the usage knowledge.

## The rules baked into the runner

1. **All gates run, always** — one failure never skips the rest; you
   want the full damage report per run.
2. **Failures carry context** — the last 5 lines of each failing
   gate's output land in the log (enough to diagnose, not to drown).
3. **Timeouts are failures** — a hung gate is killed and recorded as
   `FAIL (TIMED OUT after Ns)`, never left hanging.
4. **The log is the receipt** — plain markdown, ANSI-free,
   committable, grep-able by a commit gate (pairs with
   `commit-gate`: the `[battery: <path>]` token on code commits).

## The wiring (copy into any project)

1. Copy `portable-workflows/battery-runner/` into the target
   project.
2. Write `configs/<project>.json` naming your gates (start from the
   example config).
3. Run: `bun portable-workflows/battery-runner/run.mjs --config
   portable-workflows/battery-runner/configs/<project>.json`.
4. Optional: wire the log path into the commit discipline (code
   commits cite it).
5. **Verify the runner after porting with the failure-accounting
   self-check:** run it against a deliberately-failing config — it
   must exit nonzero AND record every failure in the log. If it
   exits 0, the accounting is broken and the runner must not be
   trusted as a gate.

## The receipts discipline

A portability claim requires run receipts (pairs with
`receipts-or-retract`): the failure-accounting self-check (nonzero
exit + full log) and the real-project run (the 4/4 ALL PASS log
cited in the round record).

Pairs with: `verified-build-round` (the battery is the round's
one-command verification), `commit-gate` (CHECK 4 cites the log),
and `human-e2e-testing` (an E2E gate can join the config).

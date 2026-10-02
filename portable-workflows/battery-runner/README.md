# battery-runner — the portable verification battery

> **What this is:** a copy-to-any-project, one-command verification
> battery. Runs every gate in a config JSON, writes a timestamped
> log you can commit as evidence, exits nonzero on any failure.
>
> **Provenance:** extracted R74 from the Free Trader project's
> `scripts/battery.sh` per the modularity mandate (DR-14). The
> original was hard-welded to one project's 4 gate commands; this
> engine contains ZERO project assumptions — your gates live
> entirely in the config JSON.
> Receipts: `audits/e2e/r74-portability-closure.md`.

## Why it exists (the failure class it prevents)

1. **Project-coupled verification dies with the project.** A battery
   hard-coding `tsc`+`vitest`+this-repo's-scripts is unrunnable the
   moment the next project has different gates. Here the runner knows
   only "run command, capture output, write log" — the config IS the
   project.
2. **"It passed" claims without receipts.** The battery's whole job
   is producing a committable artifact (`logs/battery/<ts>.log`)
   whose path can be cited (e.g. in a commit message token like
   `[battery: logs/battery/….log]`) — evidence, not assertion.

## Port it in 3 steps (any project, any stack)

1. **Copy this folder** into the target project
   (`portable-workflows/battery-runner/`). Requirements: `node` ≥ 18
   or `bun` — nothing else (node builtins only).
2. **Write a config JSON** in `configs/` naming your gates (see
   `configs/example.json`). Each gate is `{ name, command,
   timeoutSec? }` — any shell command; exit 0 = pass.
3. **Run it:**
   ```bash
   bun portable-workflows/battery-runner/run.mjs \
     --config portable-workflows/battery-runner/configs/my-project.json
   ```
   Exit `0` = all gates passed. Exit `N` = N gates failed (details +
   last 5 lines of each failure's output are in `<logDir>/<ts>.log`).

## The config schema

```jsonc
{
  "name": "my-project",       // label in the log header
  "logDir": "logs/battery",   // relative to CWD; created if missing
  "gates": [
    { "name": "tsc",    "command": "bunx tsc --noEmit" },
    { "name": "lint",   "command": "bun run lint" },
    { "name": "tests",  "command": "bunx vitest run", "timeoutSec": 600 }
  ]
}
```

- `command` runs through `/bin/bash -c` from the current working
  directory — pipes, `&&`, env-prefixes all work.
- `timeoutSec` (optional) kills a hung gate and marks it
  `FAIL (TIMED OUT after Ns)`.
- `--list` prints the gates without running them.
- `--label x` overrides the config's `name` (e.g. to distinguish
  "freetrader" from "freetrader-portable-check").

## Rules baked into the engine

- Gates run **in order, all of them** — one failure does not skip the
  rest (you want the full damage report per run).
- Failures include the **last 5 lines** of output — enough to
  diagnose, not enough to drown in.
- The log is **plain, ANSI-free markdown** — committable as evidence.
- Exit code = number of failed gates (0 = ALL PASS).

## The self-check (verify the runner in ANY project)

```bash
# A config whose second gate MUST fail (exit 3, not 0):
echo '{"name":"self-test","logDir":"/tmp/battery-self-test","gates":[
  {"name":"true","command":"true"},
  {"name":"false","command":"false"},
  {"name":"timeout","command":"sleep 5","timeoutSec":1}
]}' > /tmp/battery-self-test-config.json
bun portable-workflows/battery-runner/run.mjs --config /tmp/battery-self-test-config.json
echo "exit=$?"   # → 2 (one plain fail + one timeout), and the log records all three gates
```

If that ever exits `0`, the failure accounting is broken.

## Real portability receipt

`configs/freetrader-gates.json` re-expresses the original
project-coupled `scripts/battery.sh` as a config — the same 4 gates
(tsc / layer4 / security / vitest), run by the portable runner,
producing a 4/4 ALL PASS log in `logs/battery/` with zero engine
changes. That is the modularity claim, with receipts. (The tsc gate
excludes `portable-workflows/` from error counting — standalone
sub-packages with their own dependencies, same treatment the project
already gives `mini-services/` and `skills/`.)

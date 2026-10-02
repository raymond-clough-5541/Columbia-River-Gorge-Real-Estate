# Round Checklist — verified-build-round

One page. Print it, walk it, mark it. Every box or its honest
skip-with-reason.

## Phase 0 — Plan

- [ ] The plan doc is WRITTEN AND COMMITTED before any build code
- [ ] Deliverable named (the artifact, by path)
- [ ] Non-goals named (what this round deliberately does NOT do)
- [ ] Verification plan named (which gates, which walk, which receipts)
- [ ] Honest boundaries named (what stays mock/limited and why)

## Phase 1 — Build (per seam, in order)

- [ ] Seam 1 pure logic built + unit tests pass
- [ ] Seam 2 server door built + route tests pass (guards, error
      messages, audit trail if the domain needs one)
- [ ] Seam 3 client adapter built + fail-closed behavior tested
      (throws with the server's error; no optimistic local writes)
- [ ] Seam 4 state store built + RE-DERIVATION SITES enumerated and
      tested (every place the session/state is rebuilt applies the
      change — list them in the plan; missed rebuild sites are the
      classic seam-4 bug family)
- [ ] Seam 5 UI surface built + fact-pins tested (label wordings,
      disclosure lines, chips — not pixel snapshots)

## Phase 2 — Gates (one command, one log)

- [ ] Full test suite: `<count>/<count>` (the WHOLE suite, this
      round's run — write the number)
- [ ] Lint: 0 errors, `<n>` warnings = the standing baseline (both
      numbers written; a moving count is a finding)
- [ ] Typecheck: clean over the whole tree
- [ ] Smoke: the app serves (main route 200, dev log clean)
- [ ] Project honesty gates (banned-pattern scans etc.): pass
- [ ] Battery log path recorded: `<path>` (goes in the commit
      message)
- [ ] Any gate failure this round: fixed and RE-RUN, both runs'
      numbers in the log

## Phase 3 — The live walk

- [ ] Fresh browser context per persona (never one reused context)
- [ ] REAL form sign-ins (the actual door, not a dev shortcut)
- [ ] Golden path walked end-to-end: click, submit, watch it render
- [ ] Accessibility spot-check on the touched surfaces (labels/aria,
      keyboard path, contrast, focus states — first-class); what was
      checked and what was found recorded in the round's ledger
- [ ] Failure paths walked (bad input, denied role — the ones this
      round claims to handle)
- [ ] Zero console errors — checked in the dev log (grep-level, not
      glance-level)
- [ ] Screenshots taken as receipts: `<paths>`
- [ ] State restored after the walk (mutations undone or
      documented as intentional)

## Phase 4 — Receipts or retract

- [ ] Every "passes" claim carries this round's numbers
- [ ] Every "works live" claim carries shot paths + log lines
- [ ] Every unverifiable claim REWRITTEN honestly or retracted
- [ ] The phrase "verified to X, not beyond" used where it is the
      truth

## Phase 5 — Ledgers + commit

- [ ] Worklog entry appended (template below — including the
      dead-ends field)
- [ ] State file refreshed (current task, queue, watch items)
- [ ] Commit message carries: round ID, battery log path, scope
      (files), the receipt tokens
- [ ] Push verified (remotes at the round's tip)

## The battery script shape

```bash
#!/usr/bin/env bash
# battery.sh — one command, all gates, one timestamped log.
set -uo pipefail
TIMESTAMP=$(date -u '+%Y-%m-%dT%H%M%S')
LOG="logs/battery/${TIMESTAMP}.log"
mkdir -p logs/battery

run_gate() {  # name, then command
  echo "--- $1 ---"
  if "${@:2}" >> /tmp/battery-gate-output.log 2>&1; then
    echo "$1: PASS"; else echo "$1: FAIL"; fi
}

run_gate "full-suite"  <test command>
run_gate "lint"        <lint command>
run_gate "typecheck"   <tsc command>
run_gate "smoke"       <curl -sf localhost check>
# ...plus the project's honesty gates
# summarize PASS/FAIL counts into $LOG
```

Rules: the log is committable evidence (path goes in the commit
message); a FAIL anywhere fails the battery; the re-run after a fix
appends (both runs stay in the record).

## The worklog entry shape (with dead-ends)

```markdown
---
Task ID: <id>
Agent: <who>
Task: <the instruction; owner directives verbatim + decoded reading
disclosed>

Work Log:
- <step 1 ... step N, in order — including in-round gate failures
  and their fixes>

Dead ends (approaches tried and refuted this round, so future
rounds do not re-walk them):
- <approach> — refuted because <the evidence>; the alternative that
  worked: <what>

Stage Summary:
- Deliverable: <path>
- Gates: <suite count, lint numbers, typecheck, battery log path,
  walk receipts>
- Next: <the next queue item>
```

The dead-ends field is not optional decoration: an approach that
failed with evidence is one of the most valuable things a round can
leave behind, and the first thing the next round's agent lacks
without it.

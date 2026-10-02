#!/usr/bin/env node
// ============================================================
// battery-runner — the portable one-command verification battery.
// ============================================================
// Runs every gate in a config JSON, writes a timestamped log,
// exits nonzero on any failure. ZERO project assumptions: the
// gates (commands) live entirely in the config file.
//
// Usage:
//   bun portable-workflows/battery-runner/run.mjs \
//        --config portable-workflows/battery-runner/configs/<project>.json
//   node works too (ESM, node builtins only).
//
// Config schema (JSON):
//   {
//     "name": "my-project",                  // label in the log
//     "logDir": "logs/battery",              // relative to CWD (created)
//     "gates": [
//       { "name": "tsc",     "command": "bunx tsc --noEmit" },
//       { "name": "vitest",  "command": "bunx vitest run", "timeoutSec": 600 }
//     ]
//   }
//
// Exit codes: 0 = ALL PASS · N = number of failed gates
//             2 = config/usage error
//
// Provenance: extracted R74 from the Free Trader project's
// scripts/battery.sh per the modularity mandate (DR-14) — the
// original was hard-welded to this project's 4 gate commands.
// Receipts: audits/e2e/r74-portability-closure.md.
// ============================================================

/* eslint-disable no-console -- this file is a CLI: stdout is its interface */
/* eslint-disable security/detect-object-injection -- dynamic keys on the
   locally-built args object are how a CLI parser works */
/* eslint-disable security/detect-non-literal-fs-filename -- the log path
   is derived from the operator's config + a UTC timestamp */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--config' || a === '-c') args.config = argv[++i]
    else if (a === '--label' || a === '-l') args.label = argv[++i]
    else if (a === '--list') args.list = true
    else {
      console.error(`usage: run.mjs --config <config.json> [--label x] [--list]`)
      process.exit(2)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (!args.config) {
  console.error('battery-runner: --config <config.json> is required')
  process.exit(2)
}

let config
try {
  config = JSON.parse(readFileSync(args.config, 'utf8'))
} catch (e) {
  console.error(`battery-runner: cannot read config ${args.config}: ${e.message}`)
  process.exit(2)
}

const name = args.label || config.name || 'battery'
const logDir = config.logDir || 'logs/battery'
const gates = Array.isArray(config.gates) ? config.gates : []

if (!gates.length) {
  console.error('battery-runner: config has no gates — nothing to run')
  process.exit(2)
}

if (args.list) {
  console.log(`battery "${name}" — ${gates.length} gate(s):`)
  for (const g of gates) console.log(`  - ${g.name}${g.timeoutSec ? ` (timeout ${g.timeoutSec}s)` : ''}`)
  process.exit(0)
}

mkdirSync(logDir, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const logPath = `${logDir}/${timestamp}.log`

console.log(`Battery "${name}": running ${gates.length} gate(s)...`)
console.log('')

const GRN = '\x1b[0;32m'
const RED = '\x1b[0;31m'
const RST = '\x1b[0m'

let passCount = 0
let failCount = 0
const results = []
const failureContext = []

for (const gate of gates) {
  const gateName = gate.name || 'unnamed-gate'
  const timeoutMs = (Number(gate.timeoutSec) || 0) * 1000
  console.log(`--- ${gateName} ---`)

  const started = Date.now()
  const run = spawnSync('/bin/bash', ['-c', String(gate.command || 'false')], {
    encoding: 'utf8',
    timeout: timeoutMs > 0 ? timeoutMs : undefined,
    maxBuffer: 32 * 1024 * 1024,
  })
  const durationMs = Date.now() - started

  const timedOut = Boolean(run.error) && run.error.code === 'ETIMEDOUT'
  const ok = !timedOut && run.status === 0

  if (ok) {
    passCount++
    results.push(`${gateName}: PASS (${(durationMs / 1000).toFixed(1)}s)`)
    console.log(`  ${GRN}PASS${RST} (${(durationMs / 1000).toFixed(1)}s)`)
  } else {
    failCount++
    const reason = timedOut ? `TIMED OUT after ${gate.timeoutSec}s` : `exit ${run.status}`
    results.push(`${gateName}: FAIL (${reason})`)
    console.log(`  ${RED}FAIL${RST} (${reason})`)
    // Keep the last 5 lines of output for context (same discipline as the
    // original battery.sh — enough to diagnose, not enough to drown in).
    const output = `${run.stdout || ''}${run.stderr || ''}`.trimEnd()
    const tail = output ? output.split('\n').slice(-5) : ['(no output)']
    const ctx = [`--- ${gateName} (last 5 lines) ---`, ...tail.map((l) => `  ${l}`)]
    failureContext.push(ctx.join('\n'))
    ctx.forEach((l) => console.log(`  ${RED}${l}${RST}`))
  }
}

const allPass = failCount === 0
const logBody = [
  `# Battery log — ${name} — ${timestamp}`,
  `# Config: ${args.config}`,
  `# Gates: ${passCount} PASS / ${failCount} FAIL`,
  '',
  ...results,
  '',
]
if (failureContext.length) logBody.push(failureContext.join('\n\n'), '')
logBody.push(allPass ? 'ALL PASS' : 'HAS FAILURES')

writeFileSync(logPath, logBody.join('\n') + '\n')

console.log('')
if (allPass) {
  console.log(`${GRN}✅ ALL PASS (${passCount}/${passCount} gates)${RST}`)
  console.log(`   Log: ${logPath}`)
  console.log(`   Include in commit: [battery: ${logPath}]`)
} else {
  console.log(`${RED}❌ ${failCount} gate(s) failed${RST}`)
  console.log(`   Log: ${logPath}`)
  console.log(`   Fix the failures, then re-run.`)
}
process.exit(failCount)

#!/usr/bin/env node
// ============================================================
// human-e2e runner — execute a scenario JSON like a real human.
// ============================================================
// Usage:
//   bun portable-workflows/human-e2e/run.mjs --scenario <path.json> \
//        [--base https://your-app.example] [--out /tmp/e2e-shots/my-run] \
//        [--viewport 390x844] [--keep-open]
//
//   node works too (ESM, no dependencies beyond node builtins +
//   the agent-browser CLI).
//
// Exit codes: 0 = all steps passed · 1 = failures (see results.md)
// ============================================================

/* eslint-disable no-console -- this file is a CLI: stdout is its interface */
/* eslint-disable security/detect-object-injection -- dynamic keys on the
   locally-built args object are how a CLI parser works */
/* eslint-disable security/detect-non-literal-fs-filename -- the scenario
   path comes from the operator's CLI invocation — that is the point */
import { readFileSync } from 'node:fs'
import { Harness, ab } from './lib.mjs'

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--scenario' || a === '-s') args.scenario = argv[++i]
    else if (a === '--base' || a === '-b') args.base = argv[++i]
    else if (a === '--out' || a === '-o') args.out = argv[++i]
    else if (a === '--viewport' || a === '-v') args.viewport = argv[++i]
    else if (a === '--keep-open') args.keepOpen = true
    else args._.push(a)
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (!args.scenario) {
  console.error(
    'usage: bun run.mjs --scenario <path.json> [--base URL] [--out DIR] [--viewport WxH] [--keep-open]'
  )
  process.exit(2)
}

let scenario
try {
  scenario = JSON.parse(readFileSync(args.scenario, 'utf8'))
} catch (e) {
  console.error(`cannot read scenario ${args.scenario}: ${e.message}`)
  process.exit(2)
}

const base = args.base || scenario.base || ''
const name = scenario.name || 'unnamed-scenario'
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = args.out || `/tmp/e2e-shots/${name}-${stamp}`

let viewport = null
const vp = args.viewport || scenario.viewport
if (vp) {
  const m = String(vp).match(/^(\d+)x(\d+)$/)
  if (m) viewport = [Number(m[1]), Number(m[2])]
  else if (Array.isArray(vp) && vp.length === 2) viewport = vp.map(Number)
}

console.log(`=== human-e2e: ${name} ===`)
console.log(`scenario: ${args.scenario}`)
console.log(`base:     ${base || '(absolute URLs only)'}`)
console.log(`out:      ${outDir}`)
if (viewport) console.log(`viewport: ${viewport[0]}x${viewport[1]}`)
console.log('')

const h = new Harness({
  name,
  base,
  outDir,
  scenarioPath: args.scenario,
  viewport,
  keepOpen: args.keepOpen,
  settleMs: scenario.settleMs, // M27: per-scenario hydration settle (default 900ms)
  navRetries: scenario.navRetries, // R82 F-1: per-scenario nav retry default (cold-compile hydration race)
})

for (const step of scenario.steps || []) {
  if (h.aborted) {
    h.log('skip', '·', 'skipped (run aborted at a critical failure)', '')
    continue
  }
  h.run(step)
}

const ok = h.finish()

if (!args.keepOpen) ab.close()
process.exit(ok ? 0 : 1)

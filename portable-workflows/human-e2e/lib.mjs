// ============================================================
// human-e2e — THE PORTABLE HUMAN-STYLE E2E ENGINE
// ============================================================
// Provenance: extracted R73 from the Free Trader E2E practice
// (docs/E2E-HUMAN-TEST-PLAN.md + scripts/e2e/) per the user's
// modularity mandate (DR-8, DR-14). Project-agnostic by
// construction: this file contains ZERO project strings, ZERO
// CSS selectors, ZERO app assumptions. It knows only:
//   agent-browser CLI primitives + accessible roles + labels.
//
// The rules baked into the engine (from the project methodology):
//   1. HUMAN-STYLE ONLY — real clicks, real typing, real waits.
//      No eval-mutated app state. `eval` is used EXCLUSIVELY for
//      read-only assertions (per the E2E plan's interaction rule).
//   2. HARD NAVIGATION for initial loads (open + cache-buster
//      defeats back-forward cache); in-app clicks afterwards.
//   3. THE CAPTURE PROTOCOL (M24): every screenshot asserts page
//      identity FIRST (expected text / URL); no assertion = no
//      screenshot. Plus the duplicate-hash guard: byte-identical
//      shots in one run = hard FAIL (mislabeled capture class).
//   4. PNGs are LOCAL-ONLY artifacts (never commit them; commit
//      the results.md instead — DR-13 discipline).
//
// Requirements: node/bun + the `agent-browser` CLI on PATH.
// ============================================================

/* eslint-disable no-console -- the harness reports every step to stdout;
   that IS the interface (the results.md file is the durable artifact) */
/* eslint-disable security/detect-non-literal-fs-filename -- the harness
   writes to the operator's --out directory and hashes the screenshots it
   just captured; paths come from the CLI invocation, not untrusted input */
/* eslint-disable security/detect-object-injection -- array indexing by
   parameter and bracket access on locally-built objects are the harness's
   data structures, not injection surfaces */

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULTS = {
  humanPauseMs: [200, 650], // randomized pause between human actions
  waitTimeoutMs: 8000,
  waitPollMs: 350,
  // M27 (hydration race): after every nav, the engine waits for
  // readyState 'complete' THEN settles this long before any interaction.
  // SSR text appears BEFORE React attaches handlers — a click in that
  // window is silently swallowed (no error, clean console). Overridable
  // per-scenario/per-step via `settleMs` (dev servers with cold compile
  // want more; warmed prod builds less).
  settleMs: 900,
}

// ---------- plumbing ----------

export function sh(cmd, timeoutMs = 45000) {
  return execSync(cmd, {
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).toString()
}

function shq(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'"
}

export function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const rand = (a, b) => a + Math.random() * (b - a)
const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ---------- agent-browser primitives (each verified live) ----------

export const ab = {
  open: (url) => sh(`agent-browser open ${shq(url)}`),
  close: () => {
    try {
      execSync('agent-browser close', { stdio: 'ignore' })
    } catch {
      // closing an already-closed browser is fine
    }
  },
  eval: (expr) => sh(`agent-browser eval ${shq(expr)}`).trim(),
  get url() {
    return sh('agent-browser get url').trim()
  },
  get title() {
    return sh('agent-browser get title').trim()
  },
  clickRole: (role, name) =>
    sh(`agent-browser find role ${shq(role)} click --name ${shq(name)}`),
  clickText: (text) => sh(`agent-browser find text ${shq(text)} click`),
  fillLabel: (label, text) =>
    sh(`agent-browser find label ${shq(label)} fill ${shq(text)}`),
  snapshot: () => sh('agent-browser snapshot -i'),
  clickRef: (ref) => sh(`agent-browser click ${shq(ref)}`),
  fillRef: (ref, text) => sh(`agent-browser fill ${shq(ref)} ${shq(text)}`),
  press: (key) => sh(`agent-browser press ${shq(key)}`),
  scroll: (dir, px) => sh(`agent-browser scroll ${shq(dir)} ${Number(px) || 0}`),
  screenshot: (path) => sh(`agent-browser screenshot ${shq(path)}`),
  storageClear: () => sh('agent-browser storage local clear'),
  storageSet: (k, v) => sh(`agent-browser storage local set ${shq(k)} ${shq(v)}`),
  setViewport: (w, h) => sh(`agent-browser set viewport ${w} ${h}`),
}

// ---------- page queries (read-only evals) ----------

export function pageHasText(text) {
  return ab
    .eval(`document.body.innerText.includes(${JSON.stringify(text)})`)
    .includes('true')
}

export function pageHeading() {
  return ab.eval(`(document.querySelector('h1')?.textContent || '').trim()`)
}

export function pageTextSnippet(max = 300) {
  return ab.eval(`document.body.innerText.substring(0, ${max})`)
}

export function waitFor(fn, { timeoutMs, pollMs } = {}) {
  const timeout = timeoutMs ?? DEFAULTS.waitTimeoutMs
  const poll = pollMs ?? DEFAULTS.waitPollMs
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (fn()) return true
    sleepSync(poll)
  }
  return fn()
}

export function waitForText(text, timeoutMs) {
  return waitFor(() => pageHasText(text), { timeoutMs })
}

// M27 — hydration-safe readiness. A page can show all its SSR text while
// React handlers are still NOT attached; text waits prove nothing about
// interactivity. The generic guard: readyState 'complete' (no framework
// beacon exists for hydration completion) + a settle window. Framework-
// specific apps can raise settleMs per scenario/step.
export function waitForReady(settleMs) {
  const settle = settleMs ?? DEFAULTS.settleMs
  const loaded = waitFor(() => {
    try {
      return ab.eval('document.readyState').includes('complete')
    } catch {
      return false
    }
  })
  if (loaded) sleepSync(settle)
  return loaded
}

// Find an element ref from a snapshot by role + name substring.
// Snapshot lines look like:  `- textbox "Email" [required, ref=e21]`
function refFromSnapshot(snapshot, role, name, index = 0) {
  // The role/name come from the scenario JSON authored by the harness
  // user; escapeRx neutralizes regex metacharacters before interpolation.
  // eslint-disable-next-line security/detect-non-literal-regexp
  const rx = new RegExp(`^\\s*-\\s+${escapeRx(role)}\\s+"([^"]*)".*?ref=e(\\d+)`, 'i')
  const matches = []
  for (const line of snapshot.split('\n')) {
    const m = line.match(rx)
    if (m && m[1].toLowerCase().includes(String(name).toLowerCase())) {
      matches.push(m[2])
    }
  }
  return matches[index] ? `@e${matches[index]}` : null
}

// ---------- the harness ----------

export class Harness {
  constructor({ name, base, outDir, scenarioPath, viewport, keepOpen, settleMs, navRetries }) {
    this.name = name || 'unnamed-scenario'
    this.base = String(base || '').replace(/\/+$/, '')
    this.outDir = outDir
    this.scenarioPath = scenarioPath
    this.keepOpen = Boolean(keepOpen)
    this.settleMs = Number.isFinite(settleMs) ? settleMs : DEFAULTS.settleMs
    // R82 F-1: default retry count for nav steps (cold-compile hydration race)
    this.navRetries = Number.isFinite(navRetries) ? navRetries : 0
    this.rows = []
    this.bugs = []
    this.shotHashes = new Map() // sha256 -> label
    this.passed = 0
    this.failed = 0
    this.aborted = false
    this.startedAt = new Date()
    mkdirSync(outDir, { recursive: true })
    if (viewport) ab.setViewport(viewport[0], viewport[1])
  }

  log(action, status, note, target) {
    const row = {
      n: this.rows.length + 1,
      action,
      target: target || '',
      status,
      note: note || '',
    }
    this.rows.push(row)
    const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '·'
    console.log(
      `${mark} [${row.n}] ${action}${row.target ? ' → ' + row.target : ''}${
        row.note ? ' — ' + row.note : ''
      }`
    )
    if (status === 'FAIL') this.failed++
    else if (status === 'PASS') this.passed++
    return row
  }

  humanPause() {
    sleepSync(rand(DEFAULTS.humanPauseMs[0], DEFAULTS.humanPauseMs[1]))
  }

  resolveUrl(url) {
    if (/^https?:\/\//i.test(url)) return url
    return this.base + (url.startsWith('/') ? url : '/' + url)
  }

  static bust(url) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}_ts=${Date.now()}`
  }

  // THE CAPTURE PROTOCOL (M24): identity assertion BEFORE the shot,
  // duplicate-hash check AFTER it. No assertion = no screenshot.
  capture(label, expect = {}) {
    const url = ab.url
    if (expect.text !== undefined && !pageHasText(expect.text)) {
      this.log(
        'shot',
        'FAIL',
        `IDENTITY ASSERTION FAILED — expected text "${expect.text}" not on page; screenshot BLOCKED (M24 capture protocol). url=${url}`,
        label
      )
      return null
    }
    if (expect.urlContains && !url.includes(expect.urlContains)) {
      this.log(
        'shot',
        'FAIL',
        `IDENTITY ASSERTION FAILED — url "${url}" does not contain "${expect.urlContains}"; screenshot BLOCKED (M24 capture protocol).`,
        label
      )
      return null
    }
    const file = join(this.outDir, `${label}.png`)
    try {
      ab.screenshot(file)
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
      if (this.shotHashes.has(hash)) {
        this.log(
          'shot',
          'FAIL',
          `DUPLICATE SCREENSHOT — byte-identical to "${this.shotHashes.get(
            hash
          )}" (mislabeled-capture class; M24 hash guard). url=${url}`,
          label
        )
        return null
      }
      this.shotHashes.set(hash, label)
      this.log(
        'shot',
        'PASS',
        `${label} saved (url=${url}, sha256:${hash.slice(0, 10)})`,
        label
      )
      return file
    } catch (e) {
      this.log('shot', 'FAIL', `screenshot error: ${e.message}`, label)
      return null
    }
  }

  // Step dispatcher. Every handler is defensive: exceptions become
  // FAIL rows, never crashes — the results log is the evidence.
  run(step) {
    const action = step && step.action
    try {
      switch (action) {
        case 'clear':
          // Storage ops need an open page on the app's origin:
          // localStorage is per-origin, and the browser session may
          // be cold at run start (previous run closed it).
          if (this.base) {
            ab.open(this.base)
            sleepSync(400)
          }
          ab.storageClear()
          this.log(
            action,
            'PASS',
            `localStorage cleared${this.base ? ` (origin ${this.base})` : ''}`,
            'storage'
          )
          break

        case 'storage': {
          const set = step.set || {}
          for (const [k, v] of Object.entries(set)) ab.storageSet(k, String(v))
          this.log(
            action,
            'PASS',
            `localStorage set: ${Object.keys(set).join(', ')}`,
            'storage'
          )
          break
        }

        case 'nav': {
          // R82 F-1 mitigation: cold-compile routes in dev can land on a
          // dead-SSR page (HTML painted, hydration never completes, zero
          // console errors — the permanent M27 variant). Empirically a
          // SECOND navigation (fresh HTML + now-warm chunks) hydrates
          // fine, so nav steps support `retries` (scenario-level default
          // `navRetries`).
          const retries = step.retries ?? this.navRetries ?? 0
          let attempt = 0
          let ok = true
          while (true) {
            const url = Harness.bust(this.resolveUrl(step.url))
            ab.open(url)
            // M27: hydration-safe settle (was a bare 600ms sleep — SSR text
            // shows before handlers attach; see waitForReady)
            waitForReady(step.settleMs ?? this.settleMs)
            ok = true
            if (step.expectText !== undefined) {
              ok = waitForText(step.expectText, step.timeout)
            }
            if (ok && step.expectUrl) {
              ok = ab.url.includes(step.expectUrl)
            }
            if (ok || attempt >= retries) break
            attempt++
            this.log(
              'nav',
              '·',
              `retry ${attempt}/${retries} — expected text "${step.expectText}" not present after navigation (cold-compile hydration race, R82 F-1)`,
              step.url
            )
            sleepSync(800)
          }
          if (step.expectText !== undefined) {
            this.log(
              'wait',
              ok ? 'PASS' : 'FAIL',
              `text "${step.expectText}" ${ok ? 'present' : 'NOT found before timeout'}${retries ? ` (after ${attempt} retr${attempt === 1 ? 'y' : 'ies'})` : ''}`,
              step.url
            )
            if (!ok) this.maybeBug(step, `nav to ${step.url}: expected text "${step.expectText}" never appeared`)
          }
          if (ok && step.expectUrl) {
            const u = ab.url
            this.log(
              'expect',
              'PASS',
              `url "${u}" contains "${step.expectUrl}"`,
              step.url
            )
          }
          if (step.shot) this.capture(step.shot, { text: step.expectText, urlContains: step.expectUrl })
          break
        }

        case 'click': {
          this.humanPause() // human rhythm before acting
          let out = ''
          if (step.text) {
            out = ab.clickText(step.text)
          } else {
            out = ab.clickRole(step.role || 'button', step.name)
          }
          const notFound = /not found/i.test(out)
          let ok = !notFound
          this.log(action, ok ? 'PASS' : 'FAIL', notFound ? `element not found: ${step.role || 'text'} "${step.name || step.text}"` : 'clicked', `${step.role || 'text'} "${step.name || step.text}"`)
          if (!ok) this.maybeBug(step, `click target missing: ${step.role || 'text'} "${step.name || step.text}"`)
          if (ok) {
            this.humanPause()
            if (step.expectText !== undefined) {
              ok = waitForText(step.expectText, step.timeout)
              for (let attempt = 1; !ok && attempt <= 3; attempt++) {
                // M27 retry: a human whose tap did nothing taps AGAIN. The
                // first click can land in the SSR-painted-but-not-yet-
                // hydrated window (handlers dead, console clean) — or its
                // point can sit under a sticky header after a full-page
                // screenshot scrolled (F-4). Tap again, from the top.
                this.humanPause()
                try {
                  ab.scroll('up', 99999)
                  if (step.text) out = ab.clickText(step.text)
                  else out = ab.clickRole(step.role || 'button', step.name)
                  ok = !/not found/i.test(out) && waitForText(step.expectText, step.timeout)
                } catch {
                  ok = false
                }
                if (ok)
                  this.log('click', '·', `retry click "${step.name || step.text}" — tap ${attempt + 1} landed (M27/F-4)`, step.name || step.text || '')
              }
              this.log(
                'wait',
                ok ? 'PASS' : 'FAIL',
                `text "${step.expectText}" ${ok ? 'present' : 'NOT found before timeout'}${
                  ok
                    ? ''
                    : ' — HINT (M27): if this was the FIRST interaction after nav, the click may have fired before hydration (SSR text present, handlers dead, console clean). Raise settleMs on the nav step, or add a wait step before it.'
                }`,
                `after click "${step.name || step.text}"`
              )
              if (!ok) this.maybeBug(step, `after clicking "${step.name || step.text}", expected "${step.expectText}" never appeared`)
            }
            if (step.shot) this.capture(step.shot, { text: step.expectText, urlContains: step.expectUrl })
          }
          break
        }

        case 'fill': {
          this.humanPause()
          let ok = true
          let note = ''
          if (step.label) {
            const out = ab.fillLabel(step.label, step.text)
            ok = !/not found/i.test(out)
            note = `label "${step.label}"`
          } else {
            // fallback path: snapshot ref by role + name
            const ref = refFromSnapshot(ab.snapshot(), step.role || 'textbox', step.name)
            if (ref) {
              ab.fillRef(ref, step.text)
              note = `ref ${ref} (${step.role} "${step.name}")`
            } else {
              ok = false
              note = `no element matched ${step.role || 'textbox'} "${step.name}"`
            }
          }
          this.log(action, ok ? 'PASS' : 'FAIL', ok ? `filled ${note}` : note, note)
          if (!ok) this.maybeBug(step, `fill target missing: ${step.label || `${step.role} "${step.name}"`}`)
          if (ok && step.shot) this.capture(step.shot, { text: step.expectText, urlContains: step.expectUrl })
          break
        }

        case 'press':
          this.humanPause()
          ab.press(step.key)
          this.log(action, 'PASS', `key "${step.key}" pressed`, step.key)
          break

        case 'scroll': {
          // Viewport-only action (DR-17-safe: never mutates app state).
          // Needed because full-page screenshots leave the page scrolled,
          // and a subsequent click's point can sit under a sticky header
          // (the R82 F-4 class: "covered by <div.mx-auto.flex>").
          const dir = step.dir || 'up'
          const px = step.px ?? 99999
          ab.scroll(dir, px)
          this.humanPause()
          this.log(action, 'PASS', `scrolled ${dir} ${px}px`, `${dir} ${px}`)
          break
        }

        case 'wait': {
          const ok = waitForText(step.text, step.timeout)
          this.log(action, ok ? 'PASS' : 'FAIL', `text "${step.text}" ${ok ? 'present' : 'NOT found before timeout'}`, step.text)
          if (!ok) this.maybeBug(step, `waited for "${step.text}" — never appeared`)
          break
        }

        case 'expect': {
          let ok = true
          let note = ''
          if (step.text !== undefined) {
            ok = pageHasText(step.text)
            note = `page ${ok ? 'contains' : 'does NOT contain'} text "${step.text}"`
          } else if (step.headingIncludes) {
            const h = pageHeading()
            ok = h.toLowerCase().includes(String(step.headingIncludes).toLowerCase())
            note = `h1 "${h}" ${ok ? 'includes' : 'does NOT include'} "${step.headingIncludes}"`
          } else if (step.urlContains) {
            const u = ab.url
            ok = u.includes(step.urlContains)
            note = `url "${u}" ${ok ? 'contains' : 'does NOT contain'} "${step.urlContains}"`
          } else if (step.titleIncludes) {
            const t = ab.title
            ok = t.toLowerCase().includes(String(step.titleIncludes).toLowerCase())
            note = `title "${t}" ${ok ? 'includes' : 'does NOT include'} "${step.titleIncludes}"`
          } else {
            ok = false
            note = 'expect step has no assertion (text/headingIncludes/urlContains/titleIncludes)'
          }
          this.log(action, ok ? 'PASS' : 'FAIL', note, step.text || step.headingIncludes || step.urlContains || step.titleIncludes || '')
          if (!ok) this.maybeBug(step, note)
          break
        }

        case 'shot':
          this.capture(step.label, { text: step.expectText, urlContains: step.expectUrl })
          break

        case 'evalExpect': {
          // READ-ONLY escape hatch: evaluate an expression and assert
          // on its output. Contract: the expr MUST NOT mutate state.
          const out = ab.eval(step.expr)
          let ok = true
          let note = `=> ${out.substring(0, 160)}`
          if (step.contains !== undefined) {
            ok = out.includes(step.contains)
            note = `${ok ? 'contains' : 'does NOT contain'} "${step.contains}" (${out.substring(0, 120)})`
          } else if (step.equals !== undefined) {
            ok = out.trim() === String(step.equals)
            note = `${ok ? 'equals' : 'does NOT equal'} "${step.equals}" (${out.substring(0, 120)})`
          }
          this.log(action, ok ? 'PASS' : 'FAIL', note, step.name || 'expr')
          if (!ok) this.maybeBug(step, note)
          break
        }

        case 'viewport':
          ab.setViewport(step.width, step.height)
          this.log(action, 'PASS', `viewport ${step.width}x${step.height}`, `${step.width}x${step.height}`)
          break

        default:
          this.log(action || '(none)', 'FAIL', `unknown action "${action}" — see README schema`)
      }
    } catch (e) {
      const row = this.log(action, 'FAIL', `error: ${String(e.message || e).substring(0, 300)}`, step.name || step.label || step.text || '')
      this.maybeBug(step, String(e.message || e))
      if (step && step.critical) {
        this.aborted = true
        this.log('abort', '·', `critical step ${row.n} failed — remaining steps skipped`, '')
      }
    }
    // critical-failure propagation for FAIL rows outside exceptions
    const last = this.rows[this.rows.length - 1]
    if (last && last.status === 'FAIL' && step && step.critical && !this.aborted) {
      this.aborted = true
      this.log('abort', '·', `critical step ${last.n} failed — remaining steps skipped`, '')
    }
  }

  maybeBug(step, detail) {
    if (step && step.bug) {
      this.bugs.push({
        step: this.rows.length,
        action: step.action,
        bug: step.bug,
        detail,
      })
    }
  }

  finish() {
    const ok = this.failed === 0 && !this.aborted
    const lines = []
    lines.push(`# Human E2E Results — ${this.name}`)
    lines.push('')
    lines.push(`- **Date:** ${this.startedAt.toISOString()}`)
    lines.push(`- **Scenario:** ${this.scenarioPath}`)
    lines.push(`- **Base URL:** ${this.base || '(absolute URLs only)'}`)
    lines.push(`- **Engine:** portable-workflows/human-e2e (R73, DR-14) — human-style: real clicks/typing/waits, no eval state mutation, M24 capture protocol on every shot`)
    lines.push(`- **Screenshots:** local-only artifacts in \`${this.outDir}\` (DR-13: never commit PNGs; commit this results file instead)`)
    lines.push('')
    lines.push('## Steps')
    lines.push('')
    lines.push('| # | Action | Target | Result | Note |')
    lines.push('|---|--------|--------|--------|------|')
    for (const r of this.rows) {
      lines.push(
        `| ${r.n} | ${r.action} | ${r.target.replace(/\|/g, '\\|')} | ${r.status} | ${r.note.replace(/\|/g, '\\|')} |`
      )
    }
    lines.push('')
    lines.push('## Bugs logged')
    lines.push('')
    if (this.bugs.length === 0) {
      lines.push('None.')
    } else {
      for (const b of this.bugs) {
        lines.push(`- **Step ${b.step} (${b.action}):** ${b.bug} — ${b.detail}`)
      }
    }
    lines.push('')
    lines.push('## Summary')
    lines.push('')
    lines.push(
      `${this.rows.length} steps · ${this.passed} passed · ${this.failed} failed${
        this.aborted ? ' · ABORTED (critical failure)' : ''
      } → **${ok ? 'PASS' : 'FAIL'}**`
    )
    lines.push('')
    const file = join(this.outDir, 'results.md')
    writeFileSync(file, lines.join('\n'))
    console.log(`\n${ok ? '✓' : '✗'} ${this.rows.length} steps · ${this.passed} passed · ${this.failed} failed → ${ok ? 'PASS' : 'FAIL'}`)
    console.log(`results: ${file}`)
    return ok
  }
}

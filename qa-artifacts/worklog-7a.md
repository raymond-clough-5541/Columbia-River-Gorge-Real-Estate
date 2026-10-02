# Round 7 — Feature 7-a Work Record

**Task:** Corridor-map year-synced KPI readouts + reduced-motion play support + focus-visible rings.
**File changed (ONLY this one):** `src/components/gorge/corridor-map.tsx` (603 → 763 lines, +163/-2).
**Agent note:** `git status` shows `src/components/gorge/matrix.tsx` also modified — that is a *parallel agent's* change (feature 7-b), not mine.

---

## What was built

### Part 1 — Year-synced KPI strip (3 computed tiles)

**Placement:** between the SVG map wrapper (`div.relative.overflow-x-auto`, closes at line ~493) and the
"Depletion-timeline scrubber" panel. Container: `mt-4 grid gap-3 sm:grid-cols-3`; each tile:
`rounded-lg border bg-muted/30 p-3` (matches the scrubber panel's muted instrument feel; the map card
itself is `bg-card`). Tile anatomy: icon row (`h-3.5 w-3.5` lucide icon, `aria-hidden`, muted) + `MicroLabel`,
value `text-[17px] font-semibold tracking-tight tabular-nums`, sub-line `text-[11.5px] tabular-nums`.

All figures come from ONE `useMemo` (`kpis`, lines ~170–214) keyed on `[submarkets, stats.regionalMedianPrice, timelineYear]`
— nothing hard-coded. Math:

1. **Median price · as of {year}** — `futureValue(s.baselinePrice2026, s.projectedCagr, timelineYear - 2026)`
   for all markets, sort ascending, take the middle element (odd-count median; even count averages the two
   middle — same convention `page.tsx`/`stats` route use for `regionalMedianPrice`, so at 2026 the delta is
   exactly 0). Formatted `fmtCurrency(v, { compact: true })`. Sub-line: signed % vs `stats.regionalMedianPrice`
   (`(median/regionalMedian − 1) × 100`, rounded, `+`/`−`), whole sub-line emerald
   (`text-emerald-600 dark:text-emerald-400`) when > 0, muted at the 2026 baseline. Icon: `Landmark`.
2. **Live buildable reserve** — one pass summing `netBuildableMid(s)` for markets with
   `timelineYear < s.depletionYear` (spent → 0), vs the full-midpoint sum for the "% of the 2026 reserve"
   sub-line. 0 live markets → value `fmtAcres(0)` = "0 ac", sub-line "corridor fully built out" in rose
   (`text-rose-600 dark:text-rose-400`). Icon: `Layers`.
3. **Next exhaustion** — smallest `depletionYear > timelineYear` (+ that market's name) found in the same
   pass. Value `"{year} · {name}"`: year `font-semibold` + inline color from
   `RUNWAY_TIER_STYLES[runwayTier(depletionYear − timelineYear)].color`, name `font-medium text-muted-foreground`.
   Sub-line `"{n} yrs out from {timelineYear}"` (pluralizes to "1 yr out"). No future depletion (≥2038):
   value "—" (muted) + sub-line "every market is past exhaustion" in rose. Icon: `Timer`.

### Part 2 — Reduced-motion play loop

- New constant `REDUCED_PLAY_MS_PER_YEAR = 700` next to `PLAY_MS_PER_YEAR = 400`.
- `reducedMotion` state (initial `false`) set in a mount `useEffect` via
  `window.matchMedia("(prefers-reduced-motion: reduce)")` — read lazily AFTER mount only, so SSR/hydration
  are safe (same class of rule as round-5's hash-router fix). `addEventListener("change", sync)` keeps it
  live; cleanup removes the listener.
- The play `useEffect` now branches: with `reducedMotion` it arms a discrete
  `window.setInterval(…, 700)` that advances **one year per tick** from a local `year` captured at arm
  time (mirrors the existing rAF `from` pattern — no interpolation, no tweening), stops + `setPlaying(false)`
  at 2046, and is cleared in the effect cleanup (unmount / dep change). Deps extended to
  `[playing, reducedMotion]` so a live preference change mid-play swaps loops in place. Pause/reset/scrub
  (which always calls `setPlaying(false)` → cleanup clears the interval) are unchanged. Play-at-the-end
  restart from 2026 still works.

### Part 3 — focus-visible rings

Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60
focus-visible:ring-offset-1 focus-visible:ring-offset-background` (pattern from compare-sheet.tsx photo
buttons, adapted with ring-offset) to: play/pause circular button, reset circular button, and both lens
toggle (radio) buttons in the segmented control.

## Exact UI copy of the 3 tiles (data-verified against the seeded DB, page ordering `state asc, name asc`)

| Year | Tile 1 | Tile 2 | Tile 3 |
|---|---|---|---|
| 2026 | `Median price · as of 2026` → **$465k** / "+0% vs 2026 baseline" (muted) | `Live buildable reserve` → **950 ac** / "100% of the 2026 reserve" | `Next exhaustion` → **2032 · Mosier** (year in critical red `#f43f5e`) / "6 yrs out from 2026" |
| 2032 | $620k / "+33% vs 2026 baseline" (emerald) | 930 ac / "98% of the 2026 reserve" | 2033 · White Salmon / "1 yr out from 2032" |
| 2034 | $682k / "+47% vs 2026 baseline" | 848 ac / "89% of the 2026 reserve" | 2035 · Bingen / "1 yr out from 2034" |
| 2037 | $787k / "+69% vs 2026 baseline" | 350 ac / "37% of the 2026 reserve" | 2038 · The Dalles / "1 yr out from 2037" |
| 2038+ | $826k…$1.21M / "+78%"…"+160% vs 2026 baseline" | **0 ac** / "corridor fully built out" (rose) | **—** / "every market is past exhaustion" (rose) |

(Tile-2/3 complement the existing "N of 11 past exhaustion" chip: live 8 ↔ spent 3 at 2034.)

## Lint / tsc

- `bun run lint` — **clean** (zero warnings/errors).
- `bunx tsc --noEmit` — **zero errors in `src/`** (only the pre-existing, task-ignored errors in
  `examples/`, `portable-workflows/`, `skills/`).
- No `toast()` anywhere; no state-updater side effects; TypeScript strict, no `any`.

## Deviations / risks for browser QA

1. **Tile-3 tie-breaking:** depletion ties (2035 Bingen/Lyle, 2036 N.Bonneville/Stevenson, 2037
   Cascade Locks/Hood River, 2038 The Dalles/Dallesport) resolve to the first market in the page's
   `state asc, name asc` order (OR before WA). Deterministic, but a different pick than a naive
   "first in seed file" reading — expected at 2034: **Bingen**, at 2037: **The Dalles**.
2. **Tier color is always `#f43f5e` (critical) with this seed** — the next exhaustion is never more than
   6-7 yrs out at any scrub year, so the bonus runway-tier coloring never shows orange/amber/emerald.
   Don't flag "year should be orange" — it's data-correct.
3. **Median price keeps compounding past full build-out** (2046 → $1.21M) — per spec it's the plain
   `futureValue` projection (same math as the map's price figures), not the depletion-adjusted regime.
4. **Reduced-motion QA:** needs `--init-script` (or OS emulation) setting `prefers-reduced-motion: reduce`
   BEFORE load; expect ~700 ms/yr discrete steps (dots/ticks/readouts jump year-by-year, ~14 s full sweep),
   no smooth tweening. Verify pause mid-play, reset, keyboard slider scrub still work, and that toggling
   the media query live re-arms the loop. With motion NOT reduced, the original 400 ms/yr rAF sweep must be
   unchanged.
5. **Focus rings:** Tab through the map card — play/pause, reset (when enabled), and both lens toggles
   should show a 2px emerald ring with 1px offset; ring on `bg-background` segments should look clean in
   light + dark.
6. Mobile (<640 px): tiles stack 1-column; the "Median price · as of 2034" micro-label may wrap to two
   lines inside its tile — intentional (`min-w-0`), check it doesn't look clipped at 390 px.

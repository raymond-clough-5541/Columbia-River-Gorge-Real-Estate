# Work Record — Round 7, Feature 7-c: Pinned-set aggregate dossier strip (Master Matrix)

**File changed (only):** `src/components/gorge/matrix.tsx` (773 → 926 lines). No other file touched (parallel agents own the rest).

## What was built

### 1. Pinned-set aggregate dossier strip
Renders BELOW the filter/summary bar and ABOVE the matrix table, only while ≥1 pin exists (mounts/unmounts with pin state):

- Container: `<section role="region" aria-label="Pinned set aggregate">` with `mb-5 rounded-xl border border-amber-400/50 bg-amber-400/[0.06] p-3.5 shadow-sm sm:p-4` (amber pinning semantics, matches the existing "n/3 pinned" chip language).
- **Left block** (`min-w-0 flex-auto`): `MicroLabel` "Pinned set" styled `text-amber-700 dark:text-amber-300`, then the pinned market names joined in PIN ORDER with mid-dots — `text-[13px] font-semibold leading-snug`, text wraps on mobile via `min-w-0`.
- **Right block**: 4 compact stat tiles in `flex flex-wrap gap-x-5 gap-y-3`, each `min-w-[130px]` (wraps into a 2×2 grid below ~360px of inner width); tiles 2–4 carry `border-l border-amber-400/30 pl-4` dividers. Tile pattern: 10.5px uppercase tracking-wider muted label → 15px font-semibold tabular-nums value → 11px muted sub (same figure typography as the compare-sheet metric rows).
- All aggregates compute in ONE `useMemo` keyed on `[pins, submarkets]` (`pinnedSet`, null when unpinned → strip unmounts). Corridor share is computed locally (MatrixView has no `stats` prop). `toast()` is never called inside any updater — `togglePin` was left untouched.

### 2. The four aggregate tiles (exact copy + math)

| Tile | Value | Sub | Math |
|---|---|---|---|
| **Combined reserve** | `{fmtAcres(Math.round(combinedReserve))}` e.g. "485 ac" | `{fmtPct(share)} of corridor reserve` e.g. "51.1% of corridor reserve" | Σ net-buildable midpoints `(min+max)/2` of pinned ÷ same sum over ALL 11 submarkets (seed corridor = 950 ac mid) |
| **Avg 20-yr CAGR** | `{fmtPct(avgCagr)}` e.g. "5.0%", tier-colored text | `band {min}–{max}%` e.g. "band 4.6–5.8%" | mean of pinned `projectedCagr`, `.toFixed(1)` for the band |
| **Blended 20-yr multiple** | `{(1 + avgCagr/100)^20 .toFixed(2)}×` e.g. "2.67×" | "compounded 2026–2046" | `(1 + avgCagr/100)^20` |
| **Earliest depletion** | `{earliestYear}` e.g. "2032" (rose `text-rose-600 dark:text-rose-400` when year ≤ 2032) | `{earliestName} · {n} yrs of runway` e.g. "Mosier · 6 yrs of runway" | min `depletionYear` among pinned (strict `<` keeps the first-pinned market on ties); n = year − 2026 |

CAGR value color: local `CAGR_VALUE_COLORS: Record<CagrTier, string>` — the exact text pairs from `CAGR_TIER_STYLES` (elite emerald-700/300, strong emerald-600/400, moderate amber-700/300, baseline zinc-600/300) without the badge bg/border chrome, per spec's "plain colored span matching those tiers" option.

Verified against seed data (bun script):
- Dallesport · The Dalles · Hood River → 485 ac / 51.1% / avg 5.0% (strong) band 4.6–5.8% / 2.67× / 2037 Hood River · 11 yrs (not rose).
- Mosier alone → 20 ac / 2.1% / 5.2% / 2.76× / **2032 rose** · 6 yrs of runway.
- Mosier · Wishram · White Salmon → 102.5 ac / 10.8% / band 4.3–5.6% / 2.67× / **2032 rose**.

### 3. "Model the pinned set" cross-workspace action
Far-right chip in the strip: `group/model inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-400/10 px-2.5 text-[12px] font-medium text-amber-700 dark:text-amber-300`, hover `bg-amber-400/20`, `active:scale-[0.97]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60`, label "Model the pinned set" + `ArrowRight` icon h-3.5 w-3.5 with `group-hover/model:translate-x-0.5` (reads as "Model the pinned set →"; same affordance as overview's DrilldownChip).

Wiring — verified against `gorge-app.tsx` (`NavigateFn` / `Route` accepts `{ view: "projections"; query?: string }`; `routeToHash` emits `#/projections?…`; views unmount on route change so ProjectionsView's mount-effect adopts the query):

```tsx
onClick={() => navigate({ view: "projections", query: `m=${pins.join(",")}&s=1` })}
```

`readSharedFromHash` in projections.tsx requires one of `m/pv/r/n` (`m` present ✓), splits `m` on commas, filters unknown slugs; `s=1` keeps the scenario overlay on; pv/r/n fall back to defaults ($455k / 4.7% / 20y). MAX_SELECTED = 5 ≥ 3 pins, safe.

### 4. Focus-visible pass (keyboard a11y)
Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60` to:
- per-row pin toggle buttons (base of the `cn()` in the Market cell),
- the "n/3 pinned" clear-all chip in the summary bar,
- the new "Model the pinned set" chip (in its spec'd className).

Matches the listings/submarket photo-button + methodology focus pattern.

## QA gates
- `bun run lint` → clean (no output, exit 0).
- `bunx tsc --noEmit` → **0 errors in `src/`**; remaining errors are the pre-existing vendored `examples/`, `skills/`, `portable-workflows/` folders only (outside the app, instructed to ignore).
- No browser testing performed (orchestrator handles QA per task brief). No dev server started, no agent-browser used.

## Deviations / risks for the orchestrator's browser pass
1. **Spec's literal `CAGR_TIER_STYLES[...].className` not applied verbatim** — those strings include bg/border chrome meant for badges; used the spec-sanctioned alternative ("plain colored span matching those tiers") so values stay clean figures inside the amber strip. Colors are 1:1 with the badge text pairs.
2. **Tile dividers on wrap** — tiles 2–4 carry `border-l`; when the row wraps (mobile 2×2), tile 3 starts a row with a leading divider. Spec explicitly prescribed flex-wrap + gap, so accepted; visually reads as a rule between columns.
3. **Responsive row behavior** (pure flex-wrap, no JS): xl+ = one row (names | 4 tiles | chip); lg ≈ names row, tiles+chip row; sm/md = names / tiles (2×2 or 3+1) / chip rows. Nothing overflows (all items shrinkable except the chip; names `min-w-0`).
4. **Stale-slug edge**: if a pin's slug ever failed to resolve, the strip hides for an all-stale set (summary-bar chip would still count it) — pre-existing pin semantics unchanged (`prev.filter`/`setPins([])` untouched).
5. The chip's accessible name is "Model the pinned set" (arrow icon is `aria-hidden`); region landmark name is "Pinned set aggregate".

## Suggested browser tests
- Pin 1 → strip appears below summary bar; pin 3 → names "A · B · C" in pin order; unpin all (chip or PinOff) → strip unmounts.
- Pin Dallesport + The Dalles + Hood River → "485 ac", "51.1% of corridor reserve", "5.0%" (emerald strong tier), "band 4.6–5.8%", "2.67×", "2037" + "Hood River · 11 yrs of runway" (zinc, not rose).
- Pin Mosier (± Wishram/White Salmon) → "2032" renders rose; sub "Mosier · 6 yrs of runway".
- Click "Model the pinned set →" → hash `#/projections?m=…&s=1`, market chips preloaded in pin order, scenario overlay on, no console errors.
- Keyboard: Tab through a pin toggle, the clear chip, and the model chip → emerald focus ring visible on each.
- Mobile 390px: tiles wrap 2×2, names wrap, no horizontal overflow; dark mode: strip border/bg/labels pair correctly.

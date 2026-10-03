# Round 7-b — What-if listing column in the watchlist comparison sheet

Task: inject ONE hypothetical listing at a target price point into the CompareSheet
and underwrite it alongside the starred listings (same 12 metric rows, same winner
logic, same verdict picks). Code-only round — no browser testing (orchestrator QA).

## Files changed (exactly two, per hard constraints)

1. `src/components/gorge/compare-sheet.tsx` (558 → 1042 lines) — the whole feature.
2. `src/components/gorge/listings-view.tsx` — ONE prop added at the single
   `<CompareTrigger>` call site (~line 516): `submarkets={submarkets}`
   (ListingsView already destructures `submarkets: Submarket[]`). Nothing else
   touched in that file.

`CompareSheet` + `CompareTrigger` both gained an optional `submarkets?: Submarket[]`
prop; optional so no other call sites break (there are none today).

## What was built

### Trigger + editor
- "Add what-if" ghost button (h-7, dashed `border-amber-400/60`, `FlaskConical`
  h-3.5 w-3.5, text-[12px], dark variants paired) rendered in the **SheetHeader**
  next to the description, inside a `flex min-w-0 flex-wrap justify-between` row
  (description has `min-w-[180px] flex-1`, button `shrink-0` — at 390px the pair
  fits on one row, and wraps cleanly below that). Shows only when
  `starred.length >= 2 && sortedSubmarkets.length > 0` (guard: no submarkets prop →
  button hidden entirely). Becomes **"Edit what-if"** once one exists.
- Clicking opens a **Popover** (anchored end-aligned to the button, `w-[320px]
  max-w-[calc(100vw-1.5rem)] p-3.5`) containing a `<form className="grid
  grid-cols-2 gap-2.5">`. Labels `text-[10.5px] uppercase tracking-wider
  font-semibold text-muted-foreground`; inputs `h-8 text-[13px]`.
- Form fields + defaults (defaults recomputed fresh each time the popover opens
  with no what-if present; prefilled from the what-if object when editing):

| Field | Control | Default | Clamp/validation |
|---|---|---|---|
| Target price | number Input | **median of starred asking prices, rounded to nearest $5k** | `min=50000 step=5000`; on submit NaN or < 50k → toast "Enter a target price first" (no clamp — hard reject); otherwise rounded to $5k step |
| Product type | Select | "Single-Family" | options: Single-Family / Infill Multi-Family / Luxury Agricultural/Farm Estate / Land Parcel |
| Market | Select | **first starred listing's market slug** (falls back to first alphabetically-sorted submarket if the slug isn't found) | options = `submarkets` prop sorted by `name`, shown as `${name} (${state})`; missing on submit → toast "Pick a market first" |
| Square feet | number Input | 2200 | clamped 0–15,000 (step=100 in UI) |
| Acreage | number Input | 0.3 (step 0.1) | clamped 0–500 |
| Label | text Input, optional | blank; **placeholder is live**: `What-if · $Xk` where X follows the price field (falls back to the starred median) | trimmed; blank → auto label `What-if · $Math.round(price/1000)k` |

- Buttons row: "Add to sheet" primary (`bg-zinc-900 text-white hover:bg-zinc-800
  dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400`, h-8,
  text-[12.5px], FlaskConical icon) + "Cancel" ghost (h-8).
- Contextual note inside the form when the entry pencils as land (type = Land
  Parcel or sqft = 0): "Land posture applies — 35% down @ 8.5%, no rent until
  entitlement."
- On submit: builds a `PropertyListing` with `id: "what-if"`,
  `submarketId: "what-if"`, `zoningCode: "—"`, `description: ""`, `imageUrl: ""`,
  `featured: false`, `status: "Hypothesis"`, `createdAt: new Date().toISOString()`,
  `bedrooms/bathrooms` = 3/2 for improved entries, 0/0 for land (required fields
  unused by the sheet), and a `submarket: ListingSubmarketSummary` built from the
  chosen Submarket mirroring the Prisma select in `src/app/page.tsx` exactly
  (slug/name/state/county/regulatoryFramework/projectedCagr/depletionYear/
  baselinePrice2026 — baselinePrice2026 is what drives the round-6 market rent
  index). Closes the popover, keeps the what-if in sheet state, toasts
  "What-if added to sheet" / "What-if updated".
- **Max one what-if.** Remove = X button on its column header
  (`aria-label="Remove the what-if listing"`) → `setWhatIf(null)` + toast
  "What-if removed".
- **Persistence verified by structure**: state lives in `CompareSheet`, which is
  rendered unconditionally by `CompareTrigger` (only the Radix sheet *content*
  unmounts on close, not the component holding `useState`). Closing and
  reopening the sheet during the session keeps the what-if column. It is NOT
  persisted to localStorage (session-only, resets on reload) — intentional.

### What-if column rendering
- Appended to `entries` via `useMemo` → all 12 metric rows, `winnerOf` crowns,
  and the Income/Appreciation verdict picks include it automatically. **A
  hypothetical CAN win a crown and CAN be a verdict pick.**
- Header cell (instead of the photo `Image`): dashed placeholder
  `aspect-[16/10] border-2 border-dashed border-amber-400/50 bg-amber-400/[0.06]`
  with `FlaskConical` + "WHAT-IF" (`text-[10.5px] font-bold tracking-widest
  text-amber-600 dark:text-amber-300`); X remove button top-right (h-6 w-6,
  blurred bg, rose hover); title = the label; an extra amber micro-line shows the
  chosen product type (judgment call — the type radically changes the
  underwriting); market name + StateBadge as with real columns. No
  open-dossier overlay button (it isn't a real listing).
- Metric cells: subtle amber wash `bg-amber-400/[0.05] dark:bg-amber-400/[0.08]`
  on non-winning cells only — **emerald winner highlight takes precedence**
  (crowned what-if cells render exactly like real winners). Rose negatives and
  muted "—" land cells keep their text colors under the wash.
- Verdict banner: if the what-if wins either pick, the pick title renders as
  `${label} (what-if)` (via `pickTitle()`).
- Footer: second note line (only while a what-if exists) — FlaskConical + "The
  amber column is a hypothetical entry — underwritten with the same sheet, not a
  live listing." — alongside the existing rent-index note.

### Flow-through verification (no code changes needed in `underwrite`)
- `underwrite()` needed **zero changes**: what-if price → `Math.max(1, price)`;
  Land Parcel or sqft 0 → `isLand` → 35%↓ @ 8.5% land terms, insurance = 0;
  `submarket.state` → per-state property tax; `submarket.projectedCagr` /
  `depletionYear` → FV/runway rows; `estimateMarketRent` reads
  `submarket.baselinePrice2026` → market-indexed rent applies to the hypothesis
  too.
- `winnerOf` scores it like any entry (ties still suppress the crown — honest).
- `bestIncome` (max cash flow among improved) and `bestEquity` (max 2046 FV)
  naturally include it.

### CSV export
- What-if column included; header cell = `${label} (what-if)`. Export toast copy
  changed from "N starred listings → CSV." to "N underwritten columns → CSV."
  (truthful when a hypothetical is in the sheet).

## Round-6 bug-class guard
All `toast()` calls fire in event handlers only (`submitWhatIf` on form submit,
`removeWhatIf` on click, `exportCsv` on click) — never inside `setState`
updaters or render.

## Radix interplay (verified in installed sources, not browser)
- Popover-in-modal-Sheet: `@radix-ui/react-dismissable-layer@1.1.x` sets
  `pointer-events: auto` on the portaled popover layer when the dialog has
  disabled body pointer events (dist line 104), and the popover's mounted
  FocusScope pauses the sheet's focus trap via the focusScopesStack — inputs and
  the embedded Select are focusable/clickable. Select-inside-popover follows the
  same layer stack.

## Lint / typecheck
- `bun run lint` → clean (zero output).
- `bunx tsc --noEmit` → only the pre-existing errors in `examples/`,
  `portable-workflows/`, `skills/`; **`src/` is clean** (verified by filtering
  `^src/` → zero matches).

## Deviations / judgment calls / risks
1. Trigger placed in the SheetHeader (option 1 of the spec's two placements),
   not the verdict banner row — keeps the banner untouched and works at 390px.
2. Product-type micro-line added under the what-if column title (not in spec,
   low risk, aids comprehension; truncates gracefully).
3. Amber wash values `bg-amber-400/[0.05] dark:bg-amber-400/[0.08]` (spec
   suggested `[0.04]`; +dark variant pairing so the tint reads in dark mode).
   Chose the tint over a left/top accent border to avoid 1px column
   misalignment in the shared grid.
4. Price is hard-rejected below $50k (toast) rather than clamped up, per the
   spec's validation wording; sqft/acreage are clamped.
5. Empty sqft parses to 0 → land path; the in-form land note warns about this
   before submit.
6. Bedrooms/bathrooms 3/2 (improved) / 0/0 (land) — required by `PropertyListing`,
   unused by the sheet.
7. Export-toast copy change + "What-if updated" toast on re-submit (edit path).
8. Not browser-tested (per instructions); orchestrator should QA the popover
   interaction inside the sheet, mobile 390px, dark mode, and CSV.

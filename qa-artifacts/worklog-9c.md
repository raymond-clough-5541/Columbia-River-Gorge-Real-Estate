---
Task ID: 9-c
Agent: command-palette subagent
Task: listings group in the command palette with dossier pre-open jump

Work Log:
- Read the worklog.md top section (Task ID: 7 context: round-8 palette architecture, round-9 candidate "command palette → listing entries (jump to #/listings with the dossier pre-opened via a session flag)").
- Studied `src/components/gorge/command-palette.tsx` (253 lines): cmdk value-based filtering, `gap-2.5` item layout with icon + `min-w-0` text block + right-aligned metadata, `CommandShortcut` hints, `CommandSeparator` between groups, `run(fn)` close-then-execute wrapper.
- Confirmed data shapes in `src/lib/gorge.ts`: `PropertyType` union is exactly 4 values ("Single-Family" | "Luxury Agricultural/Farm Estate" | "Infill Multi-Family" | "Land Parcel" — no bare "Multi-Family"); `PropertyListing.submarket?: ListingSubmarketSummary | null` carrying `name: string` and `state: StateCode` ("OR" | "WA"); `fmtCurrency(value, { compact: true })` already exists (returns "$4.85M" / "$312k") — reused instead of writing a local helper.
- Verified lucide icon availability in node_modules: Home, Grape, Building2, LandPlot all exported.
- Implemented in command-palette.tsx ONLY (gorge-app.tsx / listings-view.tsx / site-header.tsx untouched):
  - New optional prop `listings?: PropertyListing[]` (default `[]`), inserted after `submarkets` in the destructuring and type; group renders only when `listings.length > 0`, and its `CommandSeparator` is wrapped in the same conditional so an absent/empty prop leaves the palette DOM byte-identical to before.
  - `listingIcon(propertyType: PropertyType)` helper with the documented comment mapping: Single-Family → Home, Luxury Agricultural/Farm Estate → Grape (Gorge wine-country estate), Infill Multi-Family → Building2, Land Parcel → LandPlot; `default` → Home so any future union member degrades gracefully.
  - Group heading `Listings · N assets` (singular/plural guarded), placed between Micro-markets and Actions, mirroring the "Micro-markets · 11 jurisdictions" pattern.
  - Item layout mirrors micro-markets: `className="gap-2.5"`, `h-4 w-4 shrink-0 text-muted-foreground` icon with `aria-hidden`, `min-w-0 flex-1` text block (title truncates; secondary line `{marketName} · {state} · {zoningCode}` with the same OR slate-600/slate-300 vs WA emerald-600/emerald-400 tint classes), right-aligned `fmtCurrency(l.price, { compact: true })` in `text-[11px] font-semibold tabular-nums`.
  - cmdk `value` = `` `${l.title} ${marketName} ${state ?? ""} ${l.zoningCode} ${l.propertyType} listing` `` — so "farm", "R2", "white salmon" (title + market + zoning + type tokens) all match.
  - onSelect inside `run(...)`: (1) `try { sessionStorage.setItem("crgnsa-open-listing", l.id) } catch {}` (storage may be unavailable — private mode/quota); (2) `window.dispatchEvent(new CustomEvent("crgnsa-open-listing", { detail: l.id }))`; (3) `navigate({ view: "listings" })`. In-code comment documents the dual-path contract: flag consumed on fresh mount, event for the already-mounted case.
  - Missing-submarket edge: marketName falls back to "—" and state to "—" (matches listings-view's existing `?? "—"` convention); undefined state takes the neutral slate tint.
  - Copy polish: dialog description and input placeholder gain ", listing(s)" only while the group is rendered (conditional strings; identical copy when prop omitted).
- Verification: `cd /home/z/my-project && bun run lint` → clean (exit 0, zero errors). `bunx tsc --noEmit 2>&1 | grep command-palette` → empty (exit 1 from grep = no matches). Full tsc shows only the 7 pre-existing `examples/websocket` module-resolution lines (outside src/, present before this task — worklog notes the same category). No browser used — orchestrator owns QA per constraints.
- Contract for the orchestrator: pass `listings` (any `PropertyListing[]`, e.g. the same inventory list fed to the showcase) into `CommandPalette`; consume key `crgnsa-open-listing` (sessionStorage, value = listing id) in listings-view's mount effect and listen for CustomEvent `crgnsa-open-listing` (detail = listing id) when already mounted.

Stage Summary:
- Prop added (optional, standalone-compilable): `listings?: PropertyListing[]`; group + separator render only on non-empty array.
- sessionStorage key and CustomEvent name are both exactly `crgnsa-open-listing`; both carry the listing id (flag value / event `detail`); both stamped before `navigate({ view: "listings" })` and wrapped in `run(...)` so the palette closes first.
- Icons per spec: Home / Grape / Building2 / LandPlot with a comment mapping; price via existing `fmtCurrency` compact mode; state tint and layout mirror the micro-markets group conventions.
- `bun run lint` clean; `bunx tsc --noEmit` clean for command-palette.tsx (and for all of src/). File grew 253 → 369 lines. One decision worth flagging to the orchestrator: this palette's type→icon mapping follows the 9-c spec (Building2 = Infill Multi-Family, LandPlot = Land Parcel), which differs from listings-view's legacy `TYPE_ICONS` map (Building2 = Single-Family, LandPlot = Infill Multi-Family, Map = Land Parcel) — left untouched since listings-view.tsx is out of scope for this task.

# Project Worklog — CRGNSA Real Estate & Land Supply Analytics

> Shared handover document for all agents working on this project.
> Append new sections below — never overwrite previous entries.

---

Task ID: 3
Agent: Z.ai Code (scheduled webDevReview cycle — round 3)
Task: QA sweep of the stable platform, then deliver the round-2 roadmap: mortgage/financing calculator, depletion-adjusted CAGR mode, A/B scenario comparison, KPI sparklines, and a print-stylesheet styling pass.

Work Log:
- QA sweep (agent-browser): all 5 workspaces loaded with zero console errors; matrix row → infrastructure sheet, listing dialog + gallery, filters all verified pre-change. dev.log clean, `bun run lint` clean.
- New feature — Financing Lab (`src/components/gorge/financing-lab.tsx`, embedded in every listing dossier): down-payment % (5–75), APR (3–12%), 15/20/30-yr term selectors; monthly carry stack (P&I via amortized payment formula, state-blended property tax — OR 0.90% / WA 0.70% effective, insurance heuristic 0.32% structure value); lifetime interest; 20-year equity runway (2046 value at submarket CAGR − remaining loan balance → leverage multiple of the down stroke). Land parcels auto-load land-loan pricing (35% down @ 8.5%) with an explanatory amber note. All math hand-verified ($3.88M note @ 6.5%/30yr = $24,524 P&I, $28,647 total carry ✓).
- New feature — Depletion-adjusted projection mode (`futureValueDepletionAdjusted` in `lib/gorge.ts`): toggle in projections controls; each market compounds at full CAGR until its depletion year, then cools to a 2.5% infill-replacement rate. Amber toggle + explainer note, chart-header regime chip, outcome cards recompute FV/multiple and show implied CAGR + "adj." tag, ReferenceDots re-anchor, CSV export notes the regime. Verified: Hood River $685k × 1.058^11 × 1.025^9 = $1.59M, implied 4.3% CAGR ✓.
- New feature — A/B scenario comparison: compare toggle (GitCompareArrows) on each saved scenario (FIFO slot eviction, A/B chips on selected rows); when two are picked, an "A/B Verdict" card renders side-by-side FV outcomes with winner highlighting, delta in $ and %, and a narrative verdict ("the compounding-rate edge dominates" etc.). Deleting a scenario evicts it from comparison. Verified: 6.5%/20yr ($1.60M) vs 4.7%/20yr ($1.14M) → "$463k (40.6%) ahead" ✓.
- New feature — KPI sparklines (`Sparkline` in `shared.tsx`): lightweight inline SVG polyline + gradient area fill + terminal dot, embedded in all four overview StatCards (buildable-land decline curve, median-price compounding, $1-growth multiple, cumulative exhaustion count), bottom-right positioned at 46% card width with hover opacity lift. VLM-verified: no text overlap, clean rendering.
- Styling pass — print stylesheet (`@media print` in `globals.css`): light-palette forcing, app chrome hiding (nav/footer/sticky/back-to-top), scroll-container expansion, element-level `break-inside` protection, and dossier-only printing when a dialog is open (`body:has([data-slot="dialog-content"]) > *:not(...)` hides the page behind). "Print dossier" button added to listing dialogs (window.print, hidden from the printout itself).
- **Bug hunt (print CSS)**: dossier initially printed with the left half of every line off-page. Root cause chain: (1) Tailwind v4 translate utilities compile to the individual CSS `translate` property, not `transform` — `transform: none` was a no-op; (2) Lightning CSS silently DROPS `translate: none !important` (and earlier `display: block !important`) from compound rules during minification. Fix: reset the Tailwind custom properties (`--tw-translate-x/y: 0 !important`) which survive compilation, and keep `display: block` in its own rule. Also scoped card-level break-inside protection to dialogs only so page tables fragment between rows with repeating headers.
- Editorial details: emerald `::selection` tint, refined `:focus-visible` ring, smooth scroll-padding for anchors, depletion-dot pop animation (transform-box: fill-box fix).

Stage Summary:
- ✅ All new features browser-verified end-to-end: financing lab (term switch recompute, land-loan defaults, equity runway), depletion-adjusted mode (FV + implied CAGR math hand-checked), A/B verdict card (winner + delta + narrative), sparklines (4 render, VLM no-overlap), print dossiers (VLM: "no text cut in half, all sections complete, professional appearance — excellent"), matrix print flow (2 pages, repeating header row, no clipped rows), mobile financing lab (no horizontal overflow).
- ✅ `bun run lint` clean; dev.log error-free; all routes 200.
- Cumulative feature set: 5 analytics workspaces + CSV exports + saved scenarios + photo dossier + financing lab + depletion-adjusted mode + A/B comparison + KPI sparklines + print dossiers.
- Key learnings recorded for future rounds: (a) Lightning CSS drops certain `!important` declarations (translate/display) from compound rules — use separate rules or custom-property resets; (b) Tailwind v4 uses individual `translate`/`rotate`/`scale` properties; (c) Recharts curves all carry `stroke-dasharray` attributes — don't try CSS line-draw animations over them (native isAnimationActive already handles draw-in).
- Next-phase candidates (round 4): matrix column-visibility toggles; submarket profile comparable-market links; overview KPI sparklines → interactive drilldowns; watchlist (starred listings persisted to localStorage); appreciation-percentile heat strip on corridor map; keyboard-shortcut palette (g m / g p / g l navigation); accessibility audit (focus order in dialogs, ARIA on toggles); mortgage amortization schedule table (yearly principal/interest split) inside Financing Lab.

---

Task ID: 2
Agent: Z.ai Code (scheduled webDevReview cycle — round 1)
Task: QA sweep of the stable platform, then deliver the worklog's next-phase roadmap: CSV exports, saved projection scenarios, flagship photo gallery, and a styling polish pass.

Work Log:
- QA sweep (agent-browser): loaded all 5 workspaces (`#/`, `#/matrix`, `#/projections`, `#/listings`, `#/submarket/dallesport`, `#/submarket/mosier`) — zero runtime errors, zero console warnings. Spot-checked matrix rows render.
- Generated 3 new AI images for the flagship estate dossier: `estate-interior.png` (great room), `estate-vineyard.png` (vineyard + residence), `estate-grounds.png` (terrace/patio) → 12+3 = 15 images total.
- New feature — CSV export (`src/lib/csv.ts`): Excel-friendly BOM+CRLF `toCsv`/`downloadCsv`/`timestampSuffix`. Wired into: (a) Master Matrix "Export CSV" header button → exports all 22 columns for the current filter+sort state with toast confirmation; (b) Projections "Export series CSV" on the annual snapshot table → year × markets × scenario matrix.
- New feature — saved projection scenarios: localStorage-backed (`crgnsa-saved-scenarios`, 12-entry cap) via a lint-safe cached `useSyncExternalStore` subscription (custom change event + `storage` event). UI card in the projections controls column: name input (Enter-to-save), scenario list with meta (PV · CAGR · horizon · market count), load (FolderOpen → restores all inputs) and delete (Trash2) actions, toast feedback on every action.
- New feature — flagship photo gallery: `getGalleryImages()` + `ListingGallery` component in `listing-dialog.tsx` — 4-image dossier for the GMA Luxury Farm & Vineyard Estate (main + interior + vineyard + grounds) with prev/next arrows, 1/4 counter badge, emerald-outlined thumbnail strip; state keyed per listing id. Single-image listings fall back gracefully (verified). Grid cards show a camera-count chip when a gallery exists.
- Styling polish: (1) `CountUp` animated numeric reveal on the four overview KPI cards (framer-motion `animate` + `useInView` once, imperative textContent updates — ref-latest pattern kept lint-clean); (2) floating BackToTop button (scroll-past-700px via useSyncExternalStore, AnimatePresence fade/slide, smooth scroll); (3) animated hero scroll cue linking to `#corridor-metrics` (section got id + scroll-mt); (4) hover rows on the projections snapshot table; (5) active:scale micro-interactions on new buttons.
- ESLint config: added ignores for the merged user collections (`portable-skills/`, `portable-workflows/`, `git-hooks/`, `mini-services/`, `.zscripts/`, `supabase/`) — their vendored eslint-disable comments referenced uninstalled security plugins.
- Fixed lint error found this round: react-hooks/refs flagged ref-write-during-render in CountUp → moved formatRef update into an effect (blessed latest-ref pattern).

Stage Summary:
- ✅ All new features browser-verified: matrix CSV (toast "11 jurisdictions"), scenario save → localStorage JSON confirmed, CAGR changed 4.7→5.5 → load restored 4.7, delete cleared storage, series CSV toast, gallery 1/4 → next → 2/4 (estate-interior) → thumbnail 3 → 3/4 (estate-vineyard), non-gallery listing regression clean, mobile listing grid (17 view buttons), back-to-top appears after scroll.
- ✅ `bun run lint` clean; dev.log error-free; all API routes 200.
- Cumulative feature set now: 5 analytics workspaces + CSV exports + saved scenarios + photo dossier + animations.
- Next-phase candidates (for round 2): mortgage/cashflow calculator on listings; "depletion-adjusted CAGR" toggle on projections (cap appreciation post-depletion); comparison mode (two saved scenarios side-by-side); matrix column visibility toggles; submarket profile: comparable-market links; overview: KPI sparkline mini-charts; print stylesheet for dossiers; accessibility audit (focus order in dialogs/sheets).

---

Task ID: 1
Agent: Z.ai Code (main orchestrator)
Task: Build complete production-grade Columbia River Gorge (CRGNSA) real estate analytics platform — DB schema, seed data, API routes, and 5 analytics workspaces (Overview / Master Matrix / Projections / Listings / Submarket profiles) with dark-light theming.

Work Log:
- Replaced Supabase backend requirement with the sandbox stack: Prisma ORM + SQLite (`prisma/schema.prisma` → `Submarket`, `PropertyListing` models with UUID ids, FK relation, indexes). Supabase/PostgreSQL deliverable preserved as `supabase/migration.sql` (full DDL + check constraints + RLS policies: anon/authenticated read-only, service_role write + identical seed set), generated programmatically from the live DB for consistency.
- Seeded 11 micro-markets with report-consistent data: Hood River (125–145 net ac, 5.8% CAGR), The Dalles (175–205 ac, 4.6%), Dallesport (140–180 ac, $430k–480k baseline, 4.7% CAGR, $1.08M–1.21M 2046), Lyle (55–70 ac, 5.4%), Wishram, Stevenson, North Bonneville, White Salmon (full planning, 5.6%), Cascade Locks, Mosier (2032 depletion), Bingen — plus water purveyors, wastewater systems, WUI fire-risk constraints, narratives, depletion years, map coordinates.
- Seeded 16 listings incl. flagship "GMA Luxury Farm & Vineyard Estate with High-Value Residence" ($4.85M, 38.5 ac, water rights, visual subordinance compliance) and infill/land plays across Dallesport, Hood River, White Salmon.
- Generated 12 AI images (hero + property photography set) via z-ai CLI into `public/images/`. Note: image API requires dimensions divisible by 32 (1344x768 works; 1440x720 fails).
- API routes: `/api/submarkets` (state/jurisdiction filters), `/api/submarkets/[slug]`, `/api/listings` (q/submarket/type/minPrice/maxPrice/minAcreage/sort), `/api/stats` (corridor aggregates).
- Frontend: single-route SPA on `/` with hash-based router (`#/`, `#/matrix`, `#/projections`, `#/listings`, `#/submarket/<slug>`) + framer-motion view transitions (sandbox only exposes `/`).
- Components in `src/components/gorge/`: app shell (header w/ nav + next-themes toggle + mobile menu, sticky footer), executive overview (hero, 4 KPI cards, interactive SVG corridor map with 11 clickable/hoverable market dots + river + highways + OR/WA reserve split bar, statutory framework explorer with 4 selectable lenses [1986 Act/SMA/GMA/UGB-UGA], OR-vs-WA income-tax arbitrage calculator with progressive-bracket math + cross-river commuting pairs, CAGR leaderboard, raw-land depletion clock), master matrix (state/jurisdiction filters, 6 sortable columns, row-click infrastructure dossier Sheet), projections visualizer (Recharts multi-line compound curves, PV/r/n sliders, live FV formula card, ReferenceDot depletion milestones, milestone timeline strip, per-market outcome cards, annual snapshot table), listings showcase (flagship card, debounced API-driven search/price/acreage/submarket/type filters, detail dialogs w/ micro-market context + 2046 projection), submarket profiles (KPIs, projection area chart vs corridor mean, inventory ledger, infrastructure, active inventory).
- Design: editorial-financial slate/zinc palette + emerald appreciation accents, tabular numerals, dark/light themes, thin custom scrollbars, sticky footer verified on short + long pages.

Stage Summary:
- ✅ All 5 workspaces browser-verified end-to-end with agent-browser (nav, filters, sorting, sheet/drawer, sliders, dialogs, theme toggle, mobile menu, sticky footer). Fixed during QA: (1) Next.js `<Link>` intercepted hash-only navigation suppressing `hashchange` → replaced all internal links with plain anchors; (2) Recharts `ReferenceDot` crashed when wrapped in `<g>` → unwrapped to direct chart children; (3) double "ac" unit in corridor KPI; (4) lint errors (setState-in-effect) → useSyncExternalStore + onClick handlers.
- ✅ `bun run lint` clean; dev.log free of runtime errors; all API routes return 200.
- Data model: Prisma schema mirrors the requested Supabase spec 1:1 (snake_case columns, check constraints, RLS in the SQL deliverable).
- Next-phase candidates: saved comparison scenarios (localStorage), CSV export of matrix/projections, listing detail photo galleries, mortgage/cashflow calculator, "depletion-adjusted" CAGR mode, Supabase datasource swap guide implementation.

## Current Project Status (post Task 1)

**Assessment: STABLE — feature-complete per original brief, browser-verified.**
- Dev server: running on port 3000 (`bun run dev`), no errors in dev.log.
- DB: `db/custom.db` seeded (11 submarkets, 16 listings). Reseed: `bun prisma/seed.ts`.
- Routes: `/` (SPA hash router) + 4 API route groups, all 200.
- Lint: clean.

## Goals / Completed Modifications / Verification Results
- Goals from brief: DB schema & backend ✓ (Prisma + Supabase SQL deliverable), app architecture ✓ (adapted to single-route constraint), executive overview ✓, master matrix ✓, projections visualizer ✓, listings showcase ✓, submarket detail ✓, code standards ✓ (strict TS interfaces in `src/lib/gorge.ts`, RSC data fetching + `"use client"` only for interactive pieces).
- Verified via agent-browser: view navigation (desktop + mobile), framework tabs, arbitrage sliders, matrix filters + sorting + sheet, chart rendering (5 lines + 4 depletion dots), live formula updates, listing search/price filters + reset, dialogs, theme toggle, sticky footer on short/long pages.

## Unresolved Issues / Risks + Next-Phase Priorities
- Minor: agent-browser `find text` clicks occasionally hit covering sticky bars — interaction-level only, not a product bug.
- Risk: images are AI-generated illustrative assets; production should swap licensed photography.
- Priority next steps (for scheduled webDevReview rounds): deeper styling detail passes, scenario persistence, CSV export, additional analytics features, then QA each round.

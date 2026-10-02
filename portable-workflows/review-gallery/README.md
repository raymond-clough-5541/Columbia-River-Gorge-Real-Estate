# Portable Review Gallery

> Copy this folder into any project when you need **visual UI sign-offs**:
> a one-page gallery that serves a local screenshot corpus so a human can
> actually SEE the UI state being reviewed. Extracted R85 per DR-14 from
> the Free Trader instance (`mini-services/review-gallery/`); extended in
> R86 with a **progress-report view** (`/report`) for non-technical
> stakeholders.

## The pattern

- **Engine** (`index.ts` + `report.ts`, dependency-free: node:fs + Bun.serve):
  walks the corpora for PNGs and renders two views:
  - **Gallery** (`/`): a dark one-page grid of every shot — a sticky
    live-filter box, per-section jump chips (highlighted as you scroll),
    and a keyboard-accessible lightbox with the full walk (R214/R215/
    R216): clicking a shot (or pressing `→`/`←` anywhere in the gallery)
    opens it DIRECTLY in **full-screen scan mode, and the IMAGE fills
    the screen edge to edge** (`object-fit: cover` + center crop — no
    background bands on any aspect mismatch; overflow edges are
    cropped away). The opening click/keydown is the user-activation
    gesture, so the Fullscreen API engages in normal browser contexts,
    and the class-based viewport fill is the always-works fallback
    where it rejects (the caption/nav collapse to a bottom scrim that
    fades out when you go idle). `F` toggles to the windowed
    FIT-whole-shot view (contain, the 80vh cap — the button label
    flips: "Windowed (F)" while scanning, "Full screen (F)" when
    windowed), the arrows walk, `Home`/`End` jump to the ends, `Z`
    toggles native 1:1 zoom (scrollable, resets to the fill/windowed
    fit on every step), `Esc` or a backdrop click to close.
    The walk follows the current filter, and the ±1 neighbors preload
    so a large corpus never stalls on network. Arrows in the gallery
    never fire while you are typing in the filter box.
  - **Progress report** (`/report?XTransformPort=<port>`): a plain-language,
    screenshot-paired walkthrough for non-technical reviewers (what the
    project is, a guided tour, frontend/backend progress bars, recent work,
    the recommended next track). The content arrays in `report.ts` are the
    instance's R86 report; rewrite them for your project — the structure
    (tour steps + area cards + timeline + recommendations) is the reusable
    part. Tour shots that are missing from the corpus render a placeholder,
    never a crash. Reads corpus 0 only.
- **Two corpus modes** (R212 — the feature-shot gallery):
  - `folder` (corpus 0, `CORPUS_ROOT`): PNGs grouped by top-level folder,
    newest-captured first. Optional per-folder `captions.json`
    (`{ "01-welcome.png": "caption" }`).
  - `round` (`EXTRA_CORPUS_ROOTS` entries with a `:round` suffix): flat
    folders of `rNNN-slug.png` receipts grouped by the round prefix,
    newest round first. Section titles derive from design-pass doc
    filenames (`SECTION_TITLE_DIRS`, `rNNN-slug.md` → "Group Activity
    Insights"; trailing `-PLAN`/`-RESULTS` stripped); captions humanize
    the filename slug (`r209-activity-db-sourced.png` → "Activity DB
    Sourced"; `captions.json` in the corpus root still wins).
- **Seams** (env): `PORT` (default 3031) · `CORPUS_ROOT` (corpus 0) ·
  `EXTRA_CORPUS_ROOTS` — `;`-separated entries, each `/abs/path` or
  `/abs/path:round` (unprefixed entries default to `folder`) ·
  `SECTION_TITLE_DIRS` — `;`-separated dirs to derive round titles from.
  The in-code defaults are the source instance's paths; override for your
  project. `ROUND_TITLE_OVERRIDES` in `index.ts` is the source instance's
  curated fallback for under-specified rounds — edit per project.
- **Image URLs** are corpus-prefixed (`/?img=c1/<rel>` — `cN` indexes the
  corpora in order; unprefixed paths stay corpus 0 for pre-R212 URLs).
- **Gateway-aware**: every asset URL carries `?XTransformPort=<port>` so
  the page + its images forward correctly through the sandbox gateway
  (reach it at `/?XTransformPort=3031` from the preview panel). Accessed
  directly, the param is ignored.
- **Keyboard map** (R214, the R215 default, the R216 fit contract):
  opening a shot (click or gallery arrows) lands DIRECTLY in scan
  mode with the image FILLING the screen (cover); lightbox open →
  `←`/`→` walk · `Home`/`End` first/last visible shot · `F` toggles
  scan ↔ the windowed fit-whole-shot view · `Z` native 1:1 zoom
  (scrollable, overrides the fill sizing) · `Esc` close (exits
  fullscreen too, without force-closing the lightbox); lightbox
  closed → `→` opens the first visible shot, `←` the last (guarded
  against input/textarea/contentEditable focus).
- **Guard model** (proven by `bun self-test.mjs`): per-corpus root prefix
  check (traversal → 403, including corpus-prefixed traversal), PNG-only
  (everything else → 404), out-of-range corpus index → 404, no repo data
  exposed beyond the configured corpora, and the served-HTML machinery
  markers for the scan mode + keyboard walk + the click-to-fullscreen
  default + the R216 fill contract (cover tokens, the retired contain
  rule absent, the zoom override declared after the scan rule)
  (21 assertions).

## Wiring (copy into any project)

1. Copy `portable-workflows/review-gallery/`, then run `bun self-test.mjs`
   — 21/21 or do not ship.
2. Run: `CORPUS_ROOT=/path/to/screenshots PORT=3031 bun index.ts`
   (or `bun --hot index.ts` while iterating). To also serve a flat
   round-prefixed feature corpus:
   `EXTRA_CORPUS_ROOTS=/path/to/shots:round SECTION_TITLE_DIRS=/path/to/design-docs bun index.ts`.
3. Keep it alive: a restart-loop supervisor started with a **double-fork
   orphan** (an intermediate shell that exits while your command still
   runs, so the service re-parents to init and survives session reaping —
   see `scripts/review-gallery-supervisor.sh` in the source project for
   the working pattern).
4. NEVER serve the gallery from inside the product app's tree — the
   gallery is tooling that lives beside the app, not in it (the source
   project encodes this as DR-21 + DR-13 + DR-25; keep whatever your
   project's equivalents are). Follow YOUR project's rules about which
   corpora may be committed — the source instance serves its
   already-committed design-pass record read-only and keeps fresh
   captures uncommitted.

## Why screenshots (not docs)

Asking a human to approve UI state from a text document or a table of
filenames fails: they can read, but they cannot SEE the UI through prose.
Visual sign-offs need the actual pixels. The gallery is the visual
surface; markdown stays the written ledger.

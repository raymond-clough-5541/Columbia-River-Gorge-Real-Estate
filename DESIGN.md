# DESIGN.md — Gorge Capital Intelligence

> Design-language contract for every agent touching UI in this repo.
> Produced round 16 by applying the vendored `agent-skills/ui-skills/create-design-md`
> skill in repository mode. Evidence: `src/app/globals.css`, `src/components/gorge/*`,
> rendered QA in `qa-artifacts/`.
>
> **Rule of thumb:** when a surface you are building doesn't appear below, copy the
> closest existing owner in `src/components/gorge/shared.tsx` — do not invent a
> parallel system.

## Design language

- **Audited surface:** the single-page analytics shell at `/` (hash-routed workspaces:
  overview, matrix, projections, listings, regions, submarket detail) plus its chrome
  (header, footer, command palette, compare sheet).
- **Design sources:** this file; `src/app/globals.css` (tokens, thin-scroll, selection,
  focus-visible, reduced-motion, print stylesheet); shadcn/ui New York primitives in
  `src/components/ui/`.
- **Documented decisions:** emerald-on-zinc "capital intelligence" identity (rounds 1–15);
  emerald reserved for value/appreciation semantics; rose reserved for depletion/risk;
  zinc for structure. Indigo/blue are **banned** accent choices.
- **Governing owners:** `MicroLabel`, `SectionHeader`, `StatCard`, `Sparkline`,
  `CountUp`, `StateBadge` in `src/components/gorge/shared.tsx`.
- **Explicit exceptions:** the hero and featured-asset teaser intentionally break the
  card system with full-bleed photography + `zinc-950` scrims (marketing layer, not
  data layer).

## Foundations

| Property | Decision |
| --- | --- |
| Theme | next-themes, `class` strategy; dark-first (`.dark`), full light parity |
| Radius | `--radius: 0.625rem` → cards `rounded-xl`, controls `rounded-lg`/`rounded-md` |
| Type scale | 10/11/12/13/15 px micro-labels & body metadata · `text-sm` body · `text-lg` card titles · `text-4xl→6xl` hero |
| Numerals | `tabular-nums` on **every** data value, price, year, percent |
| Micro-labels | `text-[10px] font-semibold uppercase tracking-[0.16em]` muted — via `MicroLabel`, never re-typed |
| Spacing rhythm | Tailwind default scale; section gaps `gap-14 sm:gap-16`; card padding `p-5`; grids `gap-4` |
| Container | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` — one width system shared by hero, sections, header, footer |

## Color semantics

- **Emerald (`emerald-500/600`)**: appreciation, CAGR, positive money, primary CTA
  (`bg-emerald-500 text-zinc-950`), focus ring (`:focus-visible` outline, 70% emerald).
- **Rose**: depletion, risk, negative (`rose-500` Flame icons, exhaustion bars).
- **Amber**: caution band (mid-runway depletion).
- **Zinc**: all structure/borders/surfaces; hero uses `zinc-950` + emerald radial tint.
- **Charts**: `--chart-1..5` tokens (Recharts) — reference them, never hard-code hex
  in components (existing exception: sparkline hex props passed from parents).

## Interaction & motion

- Framer Motion only for compositor props (`transform`, `opacity`); entrance curves
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion` is honored **three ways**: global CSS collapse
  (globals.css), `useReducedMotion` branch in `shared.tsx`/maps, discrete scrubber
  stepping in maps.
- Icon-only buttons always carry `aria-label`; decorative icons always `aria-hidden`.
- `:focus-visible` global ring — do not remove outlines.

## Data-display patterns

- Dense tables: sticky header + `thin-scroll` container, `max-h-96` editorial lists.
- Every data surface ships a CSV export via `src/lib/csv.ts` (`downloadCsv` +
  `timestampSuffix` + toast confirmation).
- Print: dossier dialogs print standalone (`data-print` gates); thead repetition,
  zebra `[data-print="schedule"]`, chrome auto-hidden.

## Anti-patterns (reject in review)

- Raw hex colors outside chart-token wiring.
- Non-tabular numerals in data cells.
- New micro-label/button/card styles duplicating `shared.tsx` owners.
- Animating layout properties; `h-screen` (use `h-dvh`/`min-h-dvh`).
- Indigo/blue accents. Low-contrast ghost buttons as the only affordance for a
  primary action.

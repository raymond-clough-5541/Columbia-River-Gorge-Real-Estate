# Gorge Capital Intelligence — CRGNSA Real Estate & Land Supply Analytics

A production-grade analytics platform covering the **Columbia River Gorge National Scenic Area (CRGNSA)**: regulatory land-supply scarcity, urban growth boundaries, micro-market pricing, and 20-year compound valuation projections (FV = PV · (1 + r)ⁿ) across the corridor's 11 urban enclaves in Oregon and Washington.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons |
| Charts | Recharts |
| Database | Prisma ORM — **SQLite** in this sandbox (Supabase PostgreSQL migration included) |
| Theming | next-themes (dark/light) |
| Data fetching | React Server Components (Prisma server client) + REST API routes |

> **Note on Supabase:** the brief specified a Supabase PostgreSQL backend. This sandbox runs SQLite via Prisma, so the schema, RLS policies, and full seed set are additionally shipped as a ready-to-apply Supabase migration in **`supabase/migration.sql`** — swap the Prisma datasource to PostgreSQL and run it to stand the platform up on Supabase verbatim.

## Getting started

```bash
# 1. Install dependencies
bun install        # or npm install / pnpm install

# 2. Configure the local database
#    .env
#    DATABASE_URL="file:/home/z/my-project/db/custom.db"

# 3. Push the schema and seed the corridor ledger
bun run db:push
bun prisma/seed.ts

# 4. Run the dev server
bun run dev        # http://localhost:3000
```

### Deploying the same data model to Supabase

```bash
# Create a project at database.new, then:
psql "$SUPABASE_DB_URL" -f supabase/migration.sql

# .env.local for the Next.js app
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-side only
DATABASE_URL=postgresql://...                 # if swapping Prisma to Postgres
```

The migration creates `public.submarkets` and `public.property_listings` with
check constraints on enums, cascade FKs, indexes, and Row Level Security:

- `anon` / `authenticated` → **read-only** access to both tables (public analytics)
- `service_role` → full write access (server-side ingestion only)

## Architecture

```
prisma/schema.prisma        Submarket + PropertyListing models (SQLite here, Postgres-ready)
prisma/seed.ts              11 micro-markets + 16 curated listings
supabase/migration.sql      PostgreSQL DDL + RLS + identical seed set
src/lib/gorge.ts            Domain types, formatters, compound projection math
src/lib/db.ts               Prisma client singleton
src/app/page.tsx            RSC entry — server-side ledger fetch → analytics shell
src/app/api/
  submarkets/route.ts       GET ?state=OR|WA&jurisdiction=…
  submarkets/[slug]/route.ts GET one micro-market + listings
  listings/route.ts         GET ?submarket&type&minPrice&maxPrice&minAcreage&q&sort
  stats/route.ts            GET corridor aggregates
src/components/gorge/       Client analytics workspaces (see below)
public/images/              AI-generated corridor & property imagery
```

### Analytics workspaces (single-route SPA with addressable fragments)

| Workspace | Fragment | Highlights |
| --- | --- | --- |
| Executive Overview | `#/` | Corridor KPIs, interactive regional map (hover/click all 11 markets), statutory framework explorer (1986 Act / SMA / GMA / UGB-UGA), OR-vs-WA income-tax arbitrage calculator with cross-river commuting pairs, appreciation leaderboard, raw-land depletion clock |
| Master Matrix | `#/matrix` | All 11 jurisdictions; filter by state + jurisdiction type; sort on footprint, net buildable, baseline price, DOM, CAGR, 2046 forecast; row-click infrastructure dossier (water purveyor, wastewater, WUI fire risk) |
| Projections | `#/projections` | Recharts compound visualizer; multi-select submarkets; PV / r / n sliders; live formula card; raw-land exhaustion ReferenceDots + milestone strip; per-market outcome cards; annual snapshot table |
| Listings | `#/listings` | Flagship GMA Luxury Farm & Vineyard Estate dossier; API-driven search + price/acreage/submarket/type filters; micro-market context in every listing dialog |
| Micro-market profile | `#/submarket/<slug>` | Per-jurisdiction ledger, projection chart vs corridor mean, infrastructure & constraints, active inventory |

### Domain model (summary)

**submarkets** — `slug, name, state(OR|WA), county, jurisdiction_type, regulatory_framework, total_footprint_acres, gross_vacant_acres, net_buildable_acres_min/max, baseline_price_2026, price_per_sqft_min/max, days_on_market_min/max, projected_cagr, projected_price_2046_min/max, water_purveyor, wastewater_system, primary_constraints, summary_narrative, depletion_year, map_x/y`

**property_listings** — `submarket_id → submarkets, title, property_type, price, acreage, bedrooms, bathrooms, square_feet, zoning_code, description, image_url, featured, status, created_at`

## Code standards

- TypeScript strict interfaces for submarket records, listings, and projection parameters (`src/lib/gorge.ts`)
- Server/client separation: data fetching in RSCs with the server Prisma client; `"use client"` reserved for interactive tables, sliders, dialogs, and Recharts
- Editorial-financial aesthetic: slate/zinc palette, emerald appreciation accents, tabular numerals, subtle borders, responsive tables
- Dark/light mode via next-themes

## Disclaimer

Analytical illustrations compiled from public CRGNSA land-use records and corridor market surveys. Projections apply FV = PV·(1+r)ⁿ to baseline bands and are not investment advice. Verify entitlements, water rights, and tax positions with counsel before transacting.

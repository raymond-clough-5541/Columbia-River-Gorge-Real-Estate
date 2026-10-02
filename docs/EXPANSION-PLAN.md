# Expansion Plan — Gorge Capital Intelligence → PNW → USA → Canada

> **The question:** duplicate this platform across the Pacific Northwest,
> then across the United States and Canada. Should it be **one site**, or
> **multiple sites per location**?
>
> **The recommendation in one line:** **ONE codebase and ONE analytics
> platform, presented as ONE canonical site per market region — never one
> codebase per city, and never one undifferentiated national page.**
> Concretely: a single repo (this one) with a region-registry data model,
> path-scoped regions first (`/regions/<slug>` + hash workspaces), and
> per-region **subdomains** (same deployment, host-based rewrite) once a
> market's SEO/branding justifies the split. Details, trade-offs, and the
> phased rollout below.

---

## 1. The architecture decision: single site vs. multiple sites

### The three viable shapes

| Shape | What it means | SEO | Ops cost | Drift risk | Time-to-market (per market) | Data isolation |
|---|---|---|---|---|---|---|
| **A. One national site** (path params only) | `fsbo.app/hood-river`, `fsbo.app/bend` — one domain, no per-market partitioning | Weak for local intent ("land for sale Hood River" competes with national pages) | 1× | None | Days | Shared DB, region column |
| **B. One site per region** (same codebase, per-region deployment) | `columbiagorge.fsbo.app`, `pugetsound.fsbo.app` … same repo, `REGION` env, edge cache per region | Strong (dedicated hostname + local content per market) | ~1.2× (one deploy pipeline, N instances) | Low (shared components, config-driven) | 1–2 weeks | Shared DB w/ RLS per region (or DB per region at the top end) |
| **C. Forked repos per location** | A copy of this repo per metro | Strong | N× (N pipelines, N audits, N everything) | **Fatal** — every bug fixed N times; the audits/hook kit re-instantiated N times | Weeks–months | Full isolation |

### The recommendation: **B, reached through A**

1. **Phase now → A**: the platform is already region-shaped (the 11
   submarkets ARE the first region). Add a `Region` registry, move the
   corridor under a region slug, keep one deployment. Perfect for proving
   the model in 2–4 more PNW markets with zero infra work.
2. **Phase at traction → B**: when a market earns real organic traffic,
   give it a subdomain via **host-based rewrite in middleware** (same
   Next.js app reads the `Host` header → sets the active region context →
   identical code renders that region's ledger). No code fork, no second
   repo, one deploy (or one deployment per subdomain of the SAME image
   with `REGION=<slug>` baked as an env override — the simpler variant).
3. **Never C**: the whole value of this repo — the regulatory-framework
   explorer, depletion model, projection engine, compare sheet, audit kit,
   hook/auto-push pipeline — compounds only if it stays shared. Forking
   per location resets the platform to round zero per city.

### Why NOT one national mega-page

Real-estate demand is **hyper-local search intent** ("buildable land
Underwood WA", "UGA acreage Stevenson"). One national domain dilutes that:
every market competes for the same domain authority, titles, and internal
links. The analytics is the moat; **local findability is the customer
acquisition**. Subdomains + locally-authored narratives per market is the
compromise that keeps ONE platform and N local front doors.

### The precedent for the data model

The current schema is already region-agnostic — `Submarket` and
`PropertyListing` contain nothing Columbia-Gorge-specific except the rows
themselves. The 20-year FV engine, depletion ledger, tax-arbitrage
calculator, and framework explorer all operate on generic fields. That is
the architectural bet that makes N-markets cheap: **each new market is a
seed migration + content, not a code change.**

---

## 2. The data + code architecture for multi-region

```
Region (new registry table)
  slug, name, states/provinces, country, narrative,
  regulatory_context (the region's statute story for the framework explorer),
  tax_arbitrage_pairs (JSON), depletion_model_params, launched_at

Submarket        → gains regionId FK (backfill: CRGNSA)
PropertyListing  → inherits region via submarket (no change)
```

- **Postgres/Supabase at multi-region scale** (the `supabase/migration.sql`
  path): add `region_id` + RLS policies `region_id = active_region()` for
  per-region isolation; `service_role` for ingestion.
- **Supabase branch-per-region** for staging new markets (isolated seed
  QA before merge to the shared prod project).
- **Content**: each region needs its own framework-explorer copy (1986
  CRGNSA Act → e.g. GMA for Puget Sound, ALR for BC) — model as
  `RegulatoryFramework` rows keyed by region rather than hardcoded tabs.
- **Units + currency**: a region-level `currency` (USD/CAD) + `units`
  (imperial/metric toggle) field, defaulted by country, user-overridable.

---

## 3. Phase 1 — the PNW wave (months 0–6)

The corridor methodology ports to every Western growth-boundary market.
Each market = region row + submarkets/listings seed + framework content +
depletion calibration + audits green + launch.

| Market region | The scarcity story | Tax-arbitrage hook |
|---|---|---|
| **Hood Canal / Kitsap** (WA) | GMA UGA squeeze + shoreline act | Kitsap residency ↔ Seattle wages (WA 0% income tax) |
| **Olympic Peninsula** (Sequim/Port Angeles) | GMA + water availability | Retiree inflow vs CA/OR pensions |
| **Puget Sound I-5 corridor** (Snohomish–King–Pierce UGAs) | The original UGB scarcity market | WA 0% vs OR 9.9% (mirror of the Gorge story) |
| **Willamette Valley** (Portland metro UGB reserves, Salem, Corvallis, Eugene) | Oregon Goal 14 — the Gorge's big sibling | OR no-sales-tax ↔ WA income-tax-free (the two-state shuffle) |
| **Bend / Redmond** (OR) | UGB + state land + water rights | CA equity exodus economics |
| **Vancouver WA ↔ Portland OR** | The border arbitrage classic, quantified | Live WA (0% income tax), shop OR (0% sales tax) |
| **Spokane ↔ Coeur d'Alene** (WA ↔ ID) | GMA UGA vs ID county planning | WA 0% income ↔ ID flat — the new corridor pair |

**Launch gate per market (unchanged, from this repo's own kit):** CI green
→ `ui-audit` + `security-audit` workflows green → LIVE agent-browser QA of
the new region's ledger → worklog entry → subdomain (only when the market
proves traction on the shared domain first).

## 4. Phase 2 — the USA wave (months 6–18)

Expansion criterion: a candidate market needs (a) a **binding growth
boundary or land-protection regime** (the scarcity premise), (b) public
land-use records sufficient to build the ledger, (c) a search-worthy
buyer narrative. The strongest candidates:

- **Boulder County, CO** — 75-acre UGB + open-space ring (the hardest
  urban growth boundary in the US)
- **Lexington, KY** — rural service area (famous PDR farmland protection)
- **Knoxville, TN** — statutory UGB (the Growth Policy Act)
- **O'ahu, HI** — State Land Use Urban District / UDB (island land
  exhaustion in its purest form)
- **Montgomery County, MD** — Agricultural Reserve (93,000-acre TDR zone)
- **New Jersey Pinelands** — comprehensive management plan (the East's
  CRGNSA analog)
- **Tahoe basin** — TRPA: bi-state (CA/NV) regulatory scarcity + the
  NV/CA tax arbitrage
- **Cape Cod / Martha's Vineyard** — Cape Cod Commission + APA
- **Adirondacks, NY** — APA land-use control at park scale

**Tax-arbitrage corridors to feature (the calculator generalizes):**
WA↔OR (done), NV↔CA (Reno/Tahoe), TN↔NC, NH↔MA, FL↔GA, TX↔NM/OK,
PA↔NJ/DE. Each pair gets the cross-border commuting + compounding widget
the Gorge built.

**Compliance watch (USA):** fair-housing language review per market
(AI-generated narratives must avoid steering language); state real-estate
advertising statutes if listings carry brokerage attribution; data
licensing if MLS feeds replace curated listings.

## 5. Phase 3 — Canada (months 18–30)

Canada is a **greenbelt country** — the scarcity premise is native, but
the compliance surface changes:

| Market region | The scarcity story | Canada-specific |
|---|---|---|
| **Metro Vancouver / Fraser Valley, BC** | Agricultural Land Reserve (ALR) + Urban Containment Boundary — the Gorge story at metro scale | CAD pricing, BC PTT transfer tax, Foreign Buyer Tax band, REALTOR® trademark rules |
| **GTA / Golden Horseshoe, ON** | Greenbelt + Oak Ridges Moraine + Growth Plan density targets | Ontario LTT + NRST, CREA/MLS data licensing (a listing feed needs board permission) |
| **Montréal CMA, QC** | Agricultural zone protection (CPTAQ) | **Bill 96 French-language compliance** — the regional site needs a French edition (route-level locale, not just copy) |
| **Calgary / Edmonton corridors, AB** | No greenbelt — city-limit + fragmentation story instead (the control case that proves the model) | No provincial land registry friction; AB property transfer fee |

**Structural additions for Canada:** bilingual routing (QC law), metric
units toggle, CAD formatting + provincial tax calculators, and a per-country
disclaimer layer. Data isolation stays region-scoped (RLS).

## 6. Site topology at national scale (the end-state)

```
fsbo.app                      → the national index + methodology
columbiagorge.fsbo.app        → the original corridor (this platform)
pugetsound.fsbo.app           → Phase 1 market
willamette.fsbo.app           → Phase 1 market
boulder.fsbo.app              → Phase 2 market
...
vancouver.fsbo.ca             → Phase 3 (the .ca ccTLD for Canada)
gta.fsbo.ca
```

All pointing at ONE deployment (host-rewrite) or a small set of regional
deployments of the SAME image. The platform, audit kit, hook pipeline,
and analytics engine stay single — only content and data partition.

## 7. The per-market launch runbook (repeatable, from this repo's own kit)

1. **Region registry row** + schema migration (no code changes).
2. **Ledger research** — the market's submarkets, net-buildable bands,
   depletion-year estimates (the same public-records methodology the
   corridor used; documented in the methodology dialog).
3. **Seed migration** — submarkets + curated listings (image pipeline:
   AI-generated or licensed, per market).
4. **Framework explorer content** — the region's statutes (each entry
   cites the act/plan, like the 1986 Act tabs do).
5. **Depletion + arbitrage calibration** — absorption rates, tax bands,
   commuting pairs.
6. **Audit gate** — CI + `ui-audit` + `security-audit` workflows green;
   LIVE agent-browser QA on the new region's hash workspaces.
7. **Launch** — path-scoped first; subdomain after traction; worklog
   entry + round commit (hooks auto-push).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| MLS/board data licensing (US + CREA in Canada) | Stay on curated/public-records listings until licensed feeds are negotiated; the analytics (not listings) is the product |
| Fair-housing / steering language | Per-market narrative review + the audit prompt's UI pass; avoid demographic descriptors |
| Provincial/state advertising statutes | Brokerage-attribution + disclaimer layer per region |
| SEO duplicate-content across subdomains | Canonical strategy: national index links to unique regional content; each subdomain's ledger/narrative is genuinely local |
| PAT-in-repo pattern at scale | Per-region repos stay private; rotate on any exposure; production deploys use scoped deploy keys, not the owner PAT |
| Content authenticity at 30+ markets | The methodology + audit kit (this repo's portable-skills) is the quality floor; each market still needs a human-reviewed narrative |

## 9. Decision summary

- **Single site or multiple?** **Multiple sites (one per market region) —
  from a single codebase and a single repo.** Not one national page (loses
  local search), not forked codebases (loses the platform).
- **Where does region data live?** One database, region-scoped (RLS when
  on Supabase Postgres).
- **When does a market get its own subdomain?** At proven organic
  traction — path-scoped first, subdomain second, never a code fork.
- **What gates every launch?** The repo's own CI + audit workflows +
  LIVE agent-browser QA — the same standard that built the corridor.

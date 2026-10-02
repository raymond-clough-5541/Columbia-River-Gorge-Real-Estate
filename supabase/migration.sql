-- =====================================================================
-- CRGNSA Real Estate & Land Supply Analytics — Supabase migration
-- Generated from the canonical seed set (11 submarkets, 16 listings).
-- Includes tables, indexes, Row Level Security, and seed data.
-- Apply with: supabase db reset (or psql $DATABASE_URL -f migration.sql)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Table: regions
-- Expansion registry (EXPANSION-PLAN.md §2) — one row per market region.
-- The corridor is the live region; PNW/USA/Canada waves ship as
-- scaffold/planned/research rows so market expansion is a data problem.
-- ---------------------------------------------------------------------
create table if not exists public.regions (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  country            text not null check (country in ('USA','Canada')),
  states_provinces   text not null,
  wave               text not null check (wave in ('core','pnw','usa','canada')),
  status             text not null check (status in ('live','scaffold','planned','research')),
  scarcity_hook      text not null,
  regulatory_context text not null,
  tax_arbitrage_note text not null,
  target_submarkets  integer not null check (target_submarkets > 0),
  launch_order       integer not unique,
  launched_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists regions_wave_idx on public.regions (wave);
create index if not exists regions_status_idx on public.regions (status);

-- ---------------------------------------------------------------------
-- Table: submarkets
-- One row per micro-market jurisdiction inside a region (first region:
-- the CRGNSA corridor).
-- ---------------------------------------------------------------------
create table if not exists public.submarkets (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  state                 text not null check (state in ('OR','WA')),
  county                text not null,
  jurisdiction_type     text not null check (jurisdiction_type in ('Incorporated City','Unincorporated Urban Area')),
  regulatory_framework  text not null check (regulatory_framework in ('Goal 14 UGB','GMA UGA / Partial Planning','GMA UGA / Full Planning')),
  total_footprint_acres numeric not null,
  gross_vacant_acres    numeric not null,
  net_buildable_acres_min numeric not null,
  net_buildable_acres_max numeric not null,
  baseline_price_2026   numeric not null,
  price_per_sqft_min    numeric not null,
  price_per_sqft_max    numeric not null,
  days_on_market_min    integer not null,
  days_on_market_max    integer not null,
  projected_cagr        numeric not null,
  projected_price_2046_min numeric not null,
  projected_price_2046_max numeric not null,
  water_purveyor        text not null,
  wastewater_system     text not null,
  primary_constraints   text not null,
  summary_narrative     text not null,
  depletion_year        integer not null,
  map_x                 numeric not null default 50,
  map_y                 numeric not null default 50,
  region_id             uuid references public.regions (id),
  created_at            timestamptz not null default now()
);

create index if not exists submarkets_state_idx on public.submarkets (state);
create index if not exists submarkets_jurisdiction_idx on public.submarkets (jurisdiction_type);
create index if not exists submarkets_region_idx on public.submarkets (region_id);

-- ---------------------------------------------------------------------
-- Table: property_listings
-- Curated listings across the corridor (flagship GMA estate, infill,
-- land parcels) keyed to their submarket.
-- ---------------------------------------------------------------------
create table if not exists public.property_listings (
  id            uuid primary key default gen_random_uuid(),
  submarket_id  uuid not null references public.submarkets (id) on delete cascade,
  title         text not null,
  property_type text not null check (property_type in ('Single-Family','Luxury Agricultural/Farm Estate','Infill Multi-Family','Land Parcel')),
  price         numeric not null check (price >= 0),
  acreage       numeric not null check (acreage >= 0),
  bedrooms      integer not null default 0,
  bathrooms     numeric not null default 0,
  square_feet   integer not null default 0,
  zoning_code   text not null,
  description   text not null,
  image_url     text not null,
  featured      boolean not null default false,
  status        text not null default 'Active' check (status in ('Active','Pending','New')),
  created_at    timestamptz not null default now()
);

create index if not exists property_listings_submarket_idx on public.property_listings (submarket_id);
create index if not exists property_listings_type_idx on public.property_listings (property_type);

-- ---------------------------------------------------------------------
-- Row Level Security — analytics are public-read; writes are
-- restricted to the service role (server-side only).
-- ---------------------------------------------------------------------
alter table public.regions enable row level security;
alter table public.submarkets enable row level security;
alter table public.property_listings enable row level security;

drop policy if exists "Public read access on regions" on public.regions;
create policy "Public read access on regions"
  on public.regions for select
  to anon, authenticated
  using (true);

drop policy if exists "Service write access on regions" on public.regions;
create policy "Service write access on regions"
  on public.regions for all
  to service_role
  using (true) with check (true);

drop policy if exists "Public read access on submarkets" on public.submarkets;
create policy "Public read access on submarkets"
  on public.submarkets for select
  to anon, authenticated
  using (true);

drop policy if exists "Service write access on submarkets" on public.submarkets;
create policy "Service write access on submarkets"
  on public.submarkets for all
  to service_role
  using (true) with check (true);

drop policy if exists "Public read access on property_listings" on public.property_listings;
create policy "Public read access on property_listings"
  on public.property_listings for select
  to anon, authenticated
  using (true);

drop policy if exists "Service write access on property_listings" on public.property_listings;
create policy "Service write access on property_listings"
  on public.property_listings for all
  to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------
truncate public.property_listings cascade;
truncate public.submarkets cascade;
truncate public.regions cascade;

insert into public.regions (
  slug, name, country, states_provinces, wave, status, scarcity_hook,
  regulatory_context, tax_arbitrage_note, target_submarkets, launch_order, launched_at
) values
  ('columbia-river-gorge', 'Columbia River Gorge National Scenic Area', 'USA', 'OR + WA', 'core', 'live',
   '1986 CRGNSA Act + SMA/GMA overlays + Goal 14 UGBs — six statutory layers stacked on 292,600 protected acres.',
   'The proving ground. The Columbia River Gorge National Scenic Area Act of 1986 created the country''s first national-scenic-area land-use regime: a federally-appointed Commission reviewing development across 292,600 acres, layered over Oregon''s Goal 14 urban growth boundaries on the south bank and Washington''s Growth Management Act urban growth areas on the north bank.',
   'Oregon''s progressive income tax (to 9.9%) vs Washington''s zero personal income tax — cross-river commuting pairs quantify the spread.',
   11, 0, '2026-01-15T00:00:00Z'),
  ('puget-sound', 'Puget Sound I-5 Corridor', 'USA', 'WA', 'pnw', 'scaffold',
   'The original UGB scarcity market: Snohomish–King–Pierce urban growth areas pressed against the GMA''s firmest lines.',
   'The Growth Management Act''s flagship theater — king-county UGAs, forestland-of-statewide-significance buffers, and shoreline designations squeezing the I-5 corridor''s buildable envelopes.',
   'WA 0% income tax vs OR 9.9% — the mirror image of the Gorge story for Seattle-wage earners choosing residency.',
   14, 1, null),
  ('willamette-valley', 'Willamette Valley', 'USA', 'OR', 'pnw', 'scaffold',
   'Oregon Goal 14 at metro scale — Portland UGB reserves, Salem, Corvallis, Eugene inside the nation''s oldest statewide growth boundary system.',
   'The Gorge''s big sibling. Senate Bill 100 (1973) gave every Oregon city an urban growth boundary and rural lands exclusive-farm-use zoning.',
   'OR zero sales tax ↔ WA zero income tax — the two-state shuffle, quantified per commuting pair.',
   12, 2, null),
  ('vancouver-portland', 'Vancouver ↔ Portland Border', 'USA', 'WA + OR', 'pnw', 'scaffold',
   'The border arbitrage classic: Vancouver''s UGA absorbing demand that Portland''s UGB wall deflects north.',
   'Two growth-boundary systems meet at the Columbia''s widest bridge gap — the cleanest natural experiment in North America for how boundary asymmetry prices land.',
   'Live in WA (0% income tax), shop in OR (0% sales tax) — the classic quantified.',
   9, 3, null),
  ('bend-redmond', 'Bend / Redmond', 'USA', 'OR', 'pnw', 'scaffold',
   'UGB + state land + water rights — Central Oregon''s tri-layer scarcity at the Cascades'' foot.',
   'Bend''s Goal 14 boundary against publicly-owned state and federal land, with groundwater mitigation requirements in the Deschutes basin adding a hydraulic constraint on top of the legal one.',
   'CA equity exodus economics — the arbitrage is against California''s top bracket, not a neighboring state.',
   10, 4, null),
  ('hood-canal-kitsap', 'Hood Canal / Kitsap', 'USA', 'WA', 'pnw', 'scaffold',
   'GMA UGA squeeze + the Shoreline Management Act along the canal''s shellfish-sensitive shorelines.',
   'Kitsap County''s UGAs are hemmed by Puget Sound on three sides; shoreline designations, salmon-critical-areas ordinances, and naval reservation buffers make the buildable band measurably thin.',
   'Kitsap residency against Seattle wages — WA''s 0% income tax captured at ferry-commute distance.',
   8, 5, null),
  ('olympic-peninsula', 'Olympic Peninsula', 'USA', 'WA', 'pnw', 'scaffold',
   'GMA boundaries + water availability — Sequim and Port Angeles constrained by both ordinance and hydrology.',
   'The rain-shadow side of the Olympics: retiree inflow into Clallam and Jefferson county UGAs where municipal water firm yield, not zoning, is the binding constraint in half the buildable bands.',
   'Retiree inflow vs CA/OR pension taxation — WA taxes neither pensions nor income.',
   8, 6, null),
  ('spokane-cda', 'Spokane ↔ Coeur d''Alene', 'USA', 'WA + ID', 'pnw', 'scaffold',
   'GMA UGA on the Washington side vs Idaho county planning across the state line — boundary asymmetry at the Inland Empire scale.',
   'The new corridor pair: Spokane''s growth-management urban growth areas press against Post Falls and Coeur d''Alene''s looser county-review regimes.',
   'WA 0% income ↔ ID flat-rate income — the newest quantifiable border spread.',
   9, 7, null),
  ('boulder-county', 'Boulder County, CO', 'USA', 'CO', 'usa', 'planned',
   'The hardest urban growth boundary in the US — a 75,000-acre service-area cap ringed by a sales-tax-funded open-space belt.',
   'Boulder''s 1970s-era growth cap plus decades of open-space acquisition created the most acute boundary premium in the country.',
   'CO flat income tax — no border spread; the scarcity premium itself is the story.',
   10, 8, null),
  ('tahoe-basin', 'Lake Tahoe Basin', 'USA', 'CA + NV', 'usa', 'planned',
   'TRPA bi-state regional planning — scenic-threshold and coverage caps freeze development basin-wide.',
   'The Tahoe Regional Planning Agency governs both states under a compact with Congress: impervious-coverage allocations, scenic-quality thresholds, and a development-rights marketplace.',
   'NV 0% income tax vs CA top bracket — the Incline Village residency shuffle, quantified.',
   7, 9, null),
  ('lexington-bluegrass', 'Lexington Bluegrass, KY', 'USA', 'KY', 'usa', 'planned',
   'Rural Service Area boundary + the nation''s oldest PDR farmland-preservation program.',
   'Fayette County''s 1958 urban service boundary — the country''s first — plus a purchase-of-development-rights program that has permanently protected the Inner Bluegrass horse farms.',
   'KY flat income tax — the play is land, not tax.',
   8, 10, null),
  ('montgomery-reserve', 'Montgomery County Ag Reserve, MD', 'USA', 'MD', 'usa', 'planned',
   'A 93,000-acre Agricultural Reserve ring around DC, held by transferable development rights since 1980.',
   'The nation''s most successful TDR program: downzoned farmland sells development rights into the county''s down-county density receiving areas.',
   'MD progressive brackets + DC/VA cross-border commuting pairs.',
   9, 11, null),
  ('pinelands', 'New Jersey Pinelands', 'USA', 'NJ', 'usa', 'planned',
   'A comprehensive management plan across a million-acre biosphere reserve — the East''s CRGNSA analog.',
   'Federal legislation (1978) + an interstate compact + the Pinelands Comprehensive Management Plan govern a million acres of sandy pine barrens with strict growth-area allocation.',
   'NJ property-tax pressure vs PA just across the Delaware — a cost-of-carry arbitrage rather than income-tax.',
   10, 12, null),
  ('oahu', 'O''ahu, Hawai''i', 'USA', 'HI', 'usa', 'planned',
   'State Land Use Urban District — island land exhaustion in its purest form.',
   'Hawai''i''s State Land Use Commission classifies every acre into four districts; the Urban district on O''ahu is finite by geography.',
   'High-bracket state income tax — scarcity is geographic, not fiscal.',
   6, 13, null),
  ('metro-vancouver', 'Metro Vancouver / Fraser Valley, BC', 'Canada', 'BC', 'canada', 'research',
   'Agricultural Land Reserve + Urban Containment Boundary — the Gorge story at metro scale, in Canadian dollars.',
   'British Columbia''s ALR (1973) fences the Fraser Valley''s farmland while Metro Vancouver''s regional growth strategy draws a hard urban containment boundary.',
   'CAD pricing, BC PTT transfer tax + foreign-buyer band — a different carry calculus to model.',
   14, 14, null),
  ('gta-greenbelt', 'GTA / Golden Horseshoe, ON', 'Canada', 'ON', 'canada', 'research',
   'Greenbelt + Oak Ridges Moraine + Growth Plan density targets — the most litigated land collar in Canada.',
   'Ontario''s 2005 Greenbelt Act and the Growth Plan for the Greater Golden Horseshoe bound the largest urban region in Canada.',
   'Ontario LTT + NRST layers; CREA/MLS data licensing required before any listing feed.',
   16, 15, null),
  ('montreal-cptaq', 'Montréal CMA, QC', 'Canada', 'QC', 'canada', 'research',
   'CPTAQ agricultural-zone protection — Québec''s provincial commission gates every non-farm use of zoned farmland.',
   'The Commission de protection du territoire agricole du Québec has held the metropolitan agricultural belt since 1978. Structural additions: bilingual routing (Bill 96), metric units, CAD formatting.',
   'Québec''s marginal-bracket stack — with Bill 96 language compliance as the gating deliverable.',
   10, 16, null),
  ('calgary-edmonton', 'Calgary–Edmonton Corridor, AB', 'Canada', 'AB', 'canada', 'research',
   'No greenbelt — city-limit + land fragmentation, the control case that proves the model.',
   'Alberta''s unbounded prairie cities grow by annexation, not boundary statute. Including a non-greenbelt region tests the platform''s core claim: that the depletion-ledger signal is produced by regulation, not geography alone.',
   'AB property transfer fee only; no land-registry friction — the frictionless baseline.',
   10, 17, null);

insert into public.submarkets (
  id, slug, name, state, county, jurisdictionType, regulatoryFramework, totalFootprintAcres, grossVacantAcres, netBuildableAcresMin, netBuildableAcresMax, baselinePrice2026, pricePerSqftMin, pricePerSqftMax, daysOnMarketMin, daysOnMarketMax, projectedCagr, projectedPrice2046Min, projectedPrice2046Max, waterPurveyor, wastewaterSystem, primaryConstraints, summaryNarrative, depletionYear, mapX, mapY, createdAt
) values
  ('be1dd5c6-ed3d-41c6-9e7b-d69fa598a2a2', 'bingen', 'Bingen', 'WA', 'Klickitat County', 'Incorporated City', 'GMA UGA / Partial Planning', 300, 110, 35, 50, 405000, 200, 230, 50, 85, 4.5, 920000, 1040000, 'City of Bingen (well field)', 'White Salmon / Bingen joint WWTP', 'Industrial buffer around the port; BNSF rail adjacency; partial-planning review; WUI fire risk Class 4.', 'White Salmon''s working-class twin across the flat: shared sewer capacity, port employment, and 35–50 net acres priced 35% below its neighbor. The value case is infrastructure parity with a lower land basis.', 2035, 38, 32, '2026-10-02T02:13:18.690Z'),
  ('8869a5bd-39de-49ae-8ea1-dbe95d6410af', 'cascade-locks', 'Cascade Locks', 'OR', 'Hood River County', 'Incorporated City', 'Goal 14 UGB', 560, 190, 110, 135, 415000, 205, 240, 40, 70, 4.8, 1000000, 1130000, 'City of Cascade Locks (well field; firm-yield concerns)', 'Cascade Locks WWTP', 'Groundwater supply margin; Herman Creek floodplain; tribal fishing-site adjacency; WUI fire risk Class 4.', 'The west-Gorge value market on the Oregon side: 110–135 net buildable acres, a real downtown marine grid, and the lowest Oregon-side baseline after the UGB walls of Hood River push demand east. Water-system firm yield is the variable to watch.', 2037, 22, 72, '2026-10-02T02:13:18.689Z'),
  ('cf9a4253-c85a-45b5-acfd-6fea52da005e', 'dallesport', 'Dallesport', 'WA', 'Klickitat County', 'Unincorporated Urban Area', 'GMA UGA / Partial Planning', 1100, 420, 140, 180, 455000, 210, 240, 45, 75, 4.7, 1080000, 1210000, 'Klickitat County PUD No. 1 (Dallesport system)', 'Port of Klickitat / Dallesport lagoon WWTP (capacity headroom)', 'Partial-planning jurisdiction (county-level review); rail and barge freight corridors bisect the UGA; WUI fire risk Class 5; SMA shoreline overlay along the Columbia.', 'The purest cross-river tax-arbitrage play in the Gorge: zero Washington personal income tax, a bridge commute to The Dalles job base, and 140–180 acres of genuinely flat, infrastructure-served net buildable land. The 2036–2040 buildout window makes Dallesport the corridor''s most credible appreciation compounder.', 2038, 82, 26, '2026-10-02T02:13:18.682Z'),
  ('635ea1a7-6ad8-4b9d-b797-126d703f5401', 'hood-river', 'Hood River', 'OR', 'Hood River County', 'Incorporated City', 'Goal 14 UGB', 780, 210, 125, 145, 685000, 340, 385, 18, 35, 5.8, 1980000, 2250000, 'City of Hood River Water Dept. (Buck Creek watershed + wells)', 'City of Hood River WWTP (river outfall, near capacity)', 'GMA/SMA scenic overlay; steep-slope hazard zones on the west heights; effectively flat developable land nearly exhausted; WUI fire risk Class 4.', 'The corridor''s appreciation leader. Wind-sport tourism, orchard heritage and Portland-metro spillover demand collide with a nearly built-out Goal 14 UGB. Inventory turnover is the fastest in the Gorge; new product is overwhelmingly infill and redevelopment.', 2037, 54, 74, '2026-10-02T02:13:18.679Z'),
  ('c86983e5-4c4e-4085-b3f6-9e9e614dd301', 'lyle', 'Lyle', 'WA', 'Klickitat County', 'Unincorporated Urban Area', 'GMA UGA / Partial Planning', 460, 150, 55, 70, 395000, 195, 225, 55, 90, 5.4, 1050000, 1220000, 'Klickitat County PUD No. 1 (Lyle system)', 'Community septic; clustered treatment proposed but unfunded', 'Septic-limited buildout; Klickitat River flood fringe; partial-planning review; WUI fire risk Class 5; rail corridor adjacency.', 'A small UGA whose 5.4% projected CAGR outruns its infrastructure: appreciation is driven by scarcity (55–70 net acres), Klickitat River recreation access and White Salmon spillover — not by utility capacity. Buyers are underwriting land, not entitlement velocity.', 2035, 62, 30, '2026-10-02T02:13:18.683Z'),
  ('e8f04ca1-bd73-42b0-8bad-e406b8102433', 'mosier', 'Mosier', 'OR', 'Wasco County', 'Incorporated City', 'Goal 14 UGB', 180, 45, 15, 25, 545000, 285, 330, 35, 60, 5.2, 1410000, 1590000, 'City of Mosier (two-well field; seasonal nitrate pressure)', 'Community drainfield / septic management district', 'Smallest UGB in the corridor; well capacity and nitrate margins; I-84 noise shed; WUI fire risk Class 5.', 'The corridor''s scarcity singularity: 15–25 net acres inside a 180-acre UGB. Mosier prices like a boutique market because it is one — every listing is effectively the last listing. First projected to reach terminal raw-land depletion (2032).', 2032, 46, 70, '2026-10-02T02:13:18.689Z'),
  ('cd20e083-c062-45b8-86e0-87b2038d41ec', 'north-bonneville', 'North Bonneville', 'WA', 'Skamania County', 'Incorporated City', 'GMA UGA / Partial Planning', 390, 120, 30, 40, 465000, 225, 255, 45, 80, 4.9, 1140000, 1280000, 'Skamania County PUD No. 1', 'City of North Bonneville WWTP', 'Hamilton Creek floodplain; deed-restricted platted lots from the 1930s relocation grid; WUI fire risk Class 4.', 'A planned town born of the Bonneville Dam relocation, with municipal sewer and water already in the ground. Only 30–40 net acres remain; the story here is small-lot efficiency and zero-income-tax residency within minutes of Cascade Locks employment.', 2036, 6, 30, '2026-10-02T02:13:18.687Z'),
  ('155a08f1-745c-45f8-8de1-9007cae42d03', 'stevenson', 'Stevenson', 'WA', 'Skamania County', 'Incorporated City', 'GMA UGA / Partial Planning', 640, 200, 90, 110, 545000, 260, 300, 40, 70, 5.1, 1380000, 1560000, 'City of Stevenson (Rock Creek surface + wells)', 'Stevenson WWTP (Rock Creek discharge)', 'Steep terrain and landslide hazard zones; Rock Creek floodplain; partial-planning county overlay; WUI fire risk Class 4.', 'The west-Gorge lifestyle anchor: full municipal utilities, a genuine walkable main street, and Portland-weekend demand. Buildable land is constrained by slope more than by ordinance, which keeps 90–110 net acres trickling onto the market slowly and prices compounding near 5.1%.', 2036, 14, 28, '2026-10-02T02:13:18.686Z'),
  ('ab5f4465-69fb-48ce-b65d-8d2f550b40b9', 'the-dalles', 'The Dalles', 'OR', 'Wasco County', 'Incorporated City', 'Goal 14 UGB', 1850, 360, 175, 205, 545000, 235, 265, 30, 55, 4.6, 1260000, 1420000, 'City of The Dalles (South Fork Mill Creek watershed + auxiliary wells)', 'City of The Dalles WWTP (mid-river outfall)', 'UGB largely committed; data-center and light-industrial demand competes for residential land; WUI fire risk Class 4 on south hills.', 'The largest land bank in the corridor, anchored by data-center payrolls and port industrial employment. Residential absorption is steady rather than spectacular, but the scale of net buildable acreage gives The Dalles the longest raw-land runway east of Bonneville.', 2038, 80, 72, '2026-10-02T02:13:18.680Z'),
  ('558dfd77-1ae2-488a-a7a4-0e29c23757da', 'white-salmon', 'White Salmon', 'WA', 'Klickitat County', 'Incorporated City', 'GMA UGA / Full Planning', 520, 140, 45, 60, 635000, 320, 360, 25, 45, 5.6, 1770000, 2000000, 'City of White Salmon (Buck Creek + spring sources)', 'White Salmon / Bingen joint WWTP', 'Buildable bench nearly exhausted; steep slopes above and below town; view premiums inflate land basis; WUI fire risk Class 4.', 'The second-fastest compounder in the corridor and the only full-planning GMA city in Klickitat County. White Salmon pairs Hood River views without Oregon income tax — a structural demand magnet. Net buildable land is the binding constraint: 45–60 acres against 5.6% projected CAGR.', 2033, 34, 26, '2026-10-02T02:13:18.688Z'),
  ('2ba7c5a1-6289-48f5-8ddd-ac9618c995cb', 'wishram', 'Wishram', 'WA', 'Klickitat County', 'Unincorporated Urban Area', 'GMA UGA / Partial Planning', 310, 95, 25, 35, 305000, 150, 175, 60, 100, 4.3, 665000, 755000, 'Klickitat County PUD No. 1 (Wishram system)', 'Individual septic systems only', 'BNSF mainline adjacency; zero municipal sewer; remoteness from employment centers; WUI fire risk Class 5.', 'The corridor''s entry-price market. Wishram trades at the lowest baseline in the Gorge on the strength of river access and rail-town character; with no sewer and only 25–35 net acres, its ceiling is a lifestyle market rather than a growth market.', 2034, 92, 32, '2026-10-02T02:13:18.685Z');

-- Attach every corridor micro-market to the live CRGNSA region.
update public.submarkets
set region_id = (select id from public.regions where slug = 'columbia-river-gorge');

insert into public.property_listings (
  id, submarket_id, title, property_type, price, acreage, bedrooms, bathrooms,
  square_feet, zoning_code, description, image_url, featured, status, created_at
) values
  ('ceb71357-553d-4f26-b319-d1fd4e2cff50', 'ab5f4465-69fb-48ce-b65d-8d2f550b40b9', 'Baker Creek City-View Contemporary', 'Single-Family', 625000, 0.31, 3, 2.5, 2180, 'R-1', 'Terraced hillside contemporary above Baker Creek with protected river-view corridor. Positioned inside The Dalles'' slowest-appreciating but deepest land bank — 175–205 net acres of remaining UGB capacity backs long-hold value.', '/images/contemporary-view.png', FALSE, 'Active', '2026-10-02T02:13:18.694Z'),
  ('6aa5d9e3-e395-408f-a23d-69ea6646f6a6', '558dfd77-1ae2-488a-a7a4-0e29c23757da', 'Cliffside View Home Above the River', 'Single-Family', 1150000, 0.62, 4, 3.5, 3050, 'Suburban Residential (SR)', 'Cantilevered residence on the basalt bench with a 180-degree Columbia Gorge view corridor. Inside the corridor''s second-fastest compounder (5.6% CAGR) and its most land-constrained full-planning city — 45–60 net acres remain.', '/images/contemporary-view.png', FALSE, 'Active', '2026-10-02T02:13:18.698Z'),
  ('15d285eb-b7d1-4155-b85a-32af2c37477c', '2ba7c5a1-6289-48f5-8ddd-ac9618c995cb', 'Columbia Riverfront Cabin Retreat', 'Single-Family', 345000, 0.4, 2, 1, 1120, 'R-1', 'Water-proximate cabin on the corridor''s lowest rung of the price ladder. Septic-only, rail-adjacent, and remote — but the 4.3% projected CAGR still compounds from a $305k baseline.', '/images/riverside-cabin.png', FALSE, 'Active', '2026-10-02T02:13:18.703Z'),
  ('6cd2c122-2d46-475f-ae66-66569644fa1a', 'ab5f4465-69fb-48ce-b65d-8d2f550b40b9', 'Downtown Mixed-Use Redevelopment Parcel', 'Infill Multi-Family', 780000, 0.34, 0, 0, 0, 'C-2 Downtown Commercial', 'Assemblage opportunity across two street-front lots in the certified historic downtown. Zoned C-2 with vertical mixed-use by right — the corridor''s cleanest workforce-housing underwrite with port and data-center payroll demand within two miles.', '/images/downtown-parcel.png', FALSE, 'Active', '2026-10-02T02:13:18.695Z'),
  ('c96ca5ad-8544-4f3a-9af7-6e2772fe5e02', '558dfd77-1ae2-488a-a7a4-0e29c23757da', 'GMA Luxury Farm & Vineyard Estate with High-Value Residence', 'Luxury Agricultural/Farm Estate', 4850000, 38.5, 4, 4.5, 5800, 'GMA Agriculture', 'Flagship corridor asset: 38.5 deed acres under GMA Agriculture with certified water rights and south-facing Mt. Hood and Columbia views. The 5,800 sq ft custom residence is sited for visual subordinance under CRGNSA review — non-reflective finishes, earth-tone palette, and a low-profile roofline screened by retained oak grove. Established vineyard blocks (11 acres), climate-controlled farm shop, and a fully entitled second homesite make this the benchmark agricultural compound in the National Scenic Area.', '/images/vineyard-estate.png', TRUE, 'New', '2026-10-02T02:13:18.691Z'),
  ('006819d5-f49e-47e9-b172-cdab54c76f7e', 'cd20e083-c062-45b8-86e0-87b2038d41ec', 'Hamilton Creek Infill Lot', 'Land Parcel', 155000, 0.4, 0, 0, 0, 'R-1', 'Buildable lot on the historic relocation grid with Skamania PUD water and city sewer at the line. Entry ticket to zero-income-tax Washington inside a 30–40-acre net-buildable envelope.', '/images/infill-parcel.png', FALSE, 'Pending', '2026-10-02T02:13:18.704Z'),
  ('14b640ae-8133-4d25-b9d2-d402881ad963', '635ea1a7-6ad8-4b9d-b797-126d703f5401', 'Heights Infill Craftsman — New Construction', 'Single-Family', 895000, 0.18, 4, 3, 2650, 'R-2', 'One of the last buildable interior lots on the Heights. New-construction craftsman with ADI-ready utility stubs, two blocks to schools and the Heights business district. Walk-score positioning inside a nearly exhausted Goal 14 UGB.', '/images/craftsman-home.png', FALSE, 'New', '2026-10-02T02:13:18.692Z'),
  ('4c6d3280-3135-4820-aa65-e64b1998cb2d', '558dfd77-1ae2-488a-a7a4-0e29c23757da', 'Jewett Infill Duplex Development Site', 'Infill Multi-Family', 420000, 0.29, 0, 0, 0, 'R-3 Multi-Family', 'Shovel-ready R-3 site with joint WWTP allocation from the White Salmon/Bingen plant. Duplex-by-right entitlement within walking distance of the full-planning city''s commercial core.', '/images/infill-parcel.png', FALSE, 'Active', '2026-10-02T02:13:18.698Z'),
  ('68f612ee-1816-493b-9767-7553867bb10d', 'c86983e5-4c4e-4085-b3f6-9e9e614dd301', 'Klickitat River Acreage with Water Right', 'Land Parcel', 525000, 12.6, 0, 0, 0, 'Small-Tract Agriculture (STA)', '12.6 acres at the Klickitat confluence with a senior irrigation right and SMA-review building envelope. Inside Lyle''s 55–70-acre net-buildable band — the highest CAGR per acre of infrastructure in the corridor, if septic capacity holds.', '/images/acreage-land.png', FALSE, 'Active', '2026-10-02T02:13:18.701Z'),
  ('4e94c220-8d39-4f9b-bb73-99f1ca62e2d9', '8869a5bd-39de-49ae-8ea1-dbe95d6410af', 'Marina District Buildable Lot', 'Land Parcel', 189000, 0.52, 0, 0, 0, 'Marine Commercial / Residential', 'Half-acre lot steps from the marina grid inside a 110–135-acre net-buildable UGB. City water and sewer connected; well-documented firm-yield margin is the only diligence item.', '/images/infill-parcel.png', FALSE, 'Active', '2026-10-02T02:13:18.700Z'),
  ('26e42a94-7d6c-4bc4-9862-6fbab3aef831', 'cf9a4253-c85a-45b5-acfd-6fea52da005e', 'New Construction w/ WA Tax Arbitrage', 'Single-Family', 495000, 0.28, 4, 2.5, 2350, 'Dallesport UGA Residential', 'Builder-spec residence completed inside the UGA''s 140–180-acre buildable reserve. Priced $60k under the Oregon-side median while its owner keeps 100% of personal income — the purest illustration of the cross-river spread.', '/images/craftsman-home.png', FALSE, 'Active', '2026-10-02T02:13:18.697Z'),
  ('69355715-a0c9-4873-8739-3b5f4d3a8025', '635ea1a7-6ad8-4b9d-b797-126d703f5401', 'Orchard District Farmhouse on Irrigated Acreage', 'Luxury Agricultural/Farm Estate', 1650000, 8.2, 4, 3, 3400, 'Exclusive Farm Use (EFU) Transition', 'Historic farmhouse surrounded by producing pear and cherry blocks with district irrigation water rights. Classic Hood River agricultural land-bank play: hold the orchard income while the UGB infill premium migrates outward.', '/images/orchard-farmhouse.png', FALSE, 'Active', '2026-10-02T02:13:18.693Z'),
  ('143eeb8c-9967-4e09-922f-3390bd90bfc5', 'e8f04ca1-bd73-42b0-8bad-e406b8102433', 'Pocket-UGB Cottage Remodel', 'Single-Family', 510000, 0.16, 3, 2, 1540, 'R-1', 'A rare turnover inside the smallest UGB in the Gorge — 15–25 net acres total. The 2032 depletion projection makes every Mosier listing a terminal-supply asset; remodel already completed to systems level.', '/images/cottage.png', FALSE, 'Pending', '2026-10-02T02:13:18.701Z'),
  ('2ff63cc8-5ef8-4032-89a9-506ee1bd0551', 'be1dd5c6-ed3d-41c6-9e7b-d69fa598a2a2', 'Port-Adjacent Light Industrial Flex Site', 'Land Parcel', 350000, 1.1, 0, 0, 0, 'GI General Industrial', 'Graded 1.1-acre GI site with rail-served adjacency and joint WWTP allocation. The value pairing to White Salmon: identical infrastructure, 35% lower land basis, 35–50 net acres remaining.', '/images/flex-site.png', FALSE, 'Active', '2026-10-02T02:13:18.702Z'),
  ('6adae923-c72e-4859-b23e-df4b9bc9ba36', '155a08f1-745c-45f8-8de1-9007cae42d03', 'Rock Creek Cottage — Walk-In Condition', 'Single-Family', 465000, 0.21, 3, 2, 1780, 'R-1', 'Remodeled cottage two blocks from Stevenson''s Rock Creek main street. Full municipal utilities inside the west Gorge''s only full-service lifestyle city with 90–110 net acres of remaining buildable supply.', '/images/cottage.png', FALSE, 'Active', '2026-10-02T02:13:18.699Z'),
  ('033bcf9a-f9b5-4bc8-bc00-f6e268c29c2f', 'cf9a4253-c85a-45b5-acfd-6fea52da005e', 'UGA Ready-to-Build Bluff View Parcel', 'Land Parcel', 265000, 1.4, 0, 0, 0, 'Dallesport UGA Residential', 'Flat, cleared 1.4-acre parcel inside the Dallesport UGA with PUD water and Port sewer at the property line. Direct river view across to The Dalles. The textbook zero-income-tax arbitrage entry: build in Washington, commute four minutes to Oregon employment.', '/images/view-parcel.png', FALSE, 'New', '2026-10-02T02:13:18.696Z');

-- Verify:
-- select r.name, r.wave, r.status, count(s.id) as markets
-- from public.regions r left join public.submarkets s on s.region_id = r.id
-- group by r.name, r.wave, r.status order by r.launch_order;
-- select name, state, net_buildable_acres_min, net_buildable_acres_max, projected_cagr
-- from public.submarkets order by name;

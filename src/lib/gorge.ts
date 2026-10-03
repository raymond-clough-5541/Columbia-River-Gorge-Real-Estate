/**
 * CRGNSA analytics domain types + formatting + compound projection math.
 * Shared between server components, API routes, and client visualizations.
 */

export type StateCode = "OR" | "WA";
export type JurisdictionType =
  | "Incorporated City"
  | "Unincorporated Urban Area"
  | "Unincorporated Rural Area";
export type PropertyType =
  | "Single-Family"
  | "Luxury Agricultural/Farm Estate"
  | "Infill Multi-Family"
  | "Land Parcel";

export interface Submarket {
  id: string;
  slug: string;
  name: string;
  state: StateCode;
  county: string;
  jurisdictionType: JurisdictionType;
  regulatoryFramework: string;
  totalFootprintAcres: number;
  grossVacantAcres: number;
  netBuildableAcresMin: number;
  netBuildableAcresMax: number;
  baselinePrice2026: number;
  pricePerSqftMin: number;
  pricePerSqftMax: number;
  daysOnMarketMin: number;
  daysOnMarketMax: number;
  projectedCagr: number;
  projectedPrice2046Min: number;
  projectedPrice2046Max: number;
  waterPurveyor: string;
  wastewaterSystem: string;
  primaryConstraints: string;
  summaryNarrative: string;
  depletionYear: number;
  mapX: number;
  mapY: number;
  listingCount?: number;
  /** Round 13 — expansion-registry FK (nullable: unattached rows are
   *  corridor-era legacy or not yet assigned to a region). */
  regionId?: string | null;
}

export interface ListingSubmarketSummary {
  slug: string;
  name: string;
  state: StateCode;
  county: string;
  regulatoryFramework: string;
  projectedCagr: number;
  depletionYear: number;
  /** 2026 median baseline — drives the per-market rent index. */
  baselinePrice2026: number;
}

export interface PropertyListing {
  id: string;
  submarketId: string;
  title: string;
  propertyType: PropertyType;
  price: number;
  acreage: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  zoningCode: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  status: string;
  createdAt: string;
  submarket?: ListingSubmarketSummary | null;
}

export interface CorridorStats {
  submarketCount: number;
  listingCount: number;
  totalNetBuildableMin: number;
  totalNetBuildableMid: number;
  totalNetBuildableMax: number;
  totalGrossVacant: number;
  regionalMedianPrice: number;
  averageCagr: number;
  earliestDepletion: number | null;
  latestDepletion: number | null;
  orNetBuildable: number;
  waNetBuildable: number;
}

/* ------------------------------------------------------------------ */
/* Region scoping (round 15) — one ledger per registry region.         */
/* ------------------------------------------------------------------ */

/** The canonical slug of the default (round-1) region. Bare hash routes
 *  (\#/matrix, \#/submarket/dallesport, …) always resolve to it, so every
 *  share link minted before the region switch keeps working unchanged. */
export const DEFAULT_REGION_SLUG = "columbia-river-gorge";

/** Aggregate a region's submarket ledger into the platform-wide stats
 *  shape — the exact math the server component used for the corridor,
 *  extracted so the client shell can derive per-region stats on the fly. */
export function computeRegionStats(
  submarkets: Submarket[],
  listingCount: number
): CorridorStats {
  const netMid = submarkets.map(
    (s) => (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2
  );
  const baselines = submarkets
       .map((s) => s.baselinePrice2026)
    .sort((a, b) => a - b);
  const mid = Math.floor(baselines.length / 2);
  const depletionYears = submarkets
    .map((s) => s.depletionYear)
    .sort((a, b) => a - b);
  return {
    submarketCount: submarkets.length,
    listingCount,
    totalNetBuildableMin: submarkets.reduce(
      (a, s) => a + s.netBuildableAcresMin,
      0
    ),
    totalNetBuildableMid: Math.round(netMid.reduce((a, b) => a + b, 0)),
    totalNetBuildableMax: submarkets.reduce(
      (a, s) => a + s.netBuildableAcresMax,
      0
    ),
    totalGrossVacant: Math.round(
      submarkets.reduce((a, s) => a + s.grossVacantAcres, 0)
    ),
    regionalMedianPrice:
      baselines.length === 0
        ? 0
        : baselines.length % 2 === 0
          ? (baselines[mid - 1] + baselines[mid]) / 2
          : baselines[mid],
    averageCagr:
      submarkets.length > 0
        ? submarkets.reduce((a, s) => a + s.projectedCagr, 0) /
          submarkets.length
        : 0,
    earliestDepletion: depletionYears[0] ?? null,
    latestDepletion: depletionYears[depletionYears.length - 1] ?? null,
    orNetBuildable: submarkets
      .filter((s) => s.state === "OR")
      .reduce(
        (a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2,
        0
      ),
    waNetBuildable: submarkets
      .filter((s) => s.state === "WA")
      .reduce(
        (a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2,
        0
      ),
  };
}

/** Submarkets belonging to a region — rows carrying the region's FK plus
 *  the legacy corridor rows (null regionId, pre-registry seeds) which the
 *  DEFAULT region inherits so nothing falls out of the ledger. */
export function submarketsOfRegion(
  all: Submarket[],
  region: { id: string; slug: string }
): Submarket[] {
  const inheritLegacy = region.slug === DEFAULT_REGION_SLUG;
  return all.filter(
    (s) => s.regionId === region.id || (inheritLegacy && s.regionId == null)
  );
}

/* ------------------------------------------------------------------ */
/* Expansion registry (round 13) — market regions + rollout waves      */
/* ------------------------------------------------------------------ */

export type RegionStatus = "live" | "scaffold" | "planned" | "research";
export type RegionWave = "core" | "pnw" | "usa" | "canada";

/** Aggregates computed from a region's attached submarkets (live regions). */
export interface RegionAggregate {
  marketCount: number;
  listingCount: number;
  netBuildableMid: number;
  averageCagr: number;
  medianBaseline: number;
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  country: string;
  statesProvinces: string;
  wave: RegionWave;
  status: RegionStatus;
  scarcityHook: string;
  regulatoryContext: string;
  taxArbitrageNote: string;
  targetSubmarkets: number;
  launchOrder: number;
  launchedAt: string | null;
  aggregate?: RegionAggregate | null;
}

export const REGION_STATUS_STYLES: Record<
  RegionStatus,
  { label: string; className: string; dot: string }
> = {
  live: {
    label: "Live",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  scaffold: {
    label: "Scaffold",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  planned: {
    label: "Planned",
    className:
      "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    dot: "bg-zinc-500",
  },
  research: {
    label: "Research",
    className:
      "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
};

export const REGION_WAVES: {
  id: RegionWave;
  label: string;
  window: string;
  description: string;
}[] = [
  {
    id: "core",
    label: "Wave 0 · Live now",
    window: "shipping",
    description:
      "The proving ground — the corridor that built the methodology.",
  },
  {
    id: "pnw",
    label: "Wave 1 · Pacific Northwest",
    window: "months 0–6",
    description:
      "Seven boundary-driven markets sharing the corridor's statutory DNA.",
  },
  {
    id: "usa",
    label: "Wave 2 · United States",
    window: "months 6–18",
    description:
      "The strongest growth-collar regimes in the country, east and west.",
  },
  {
    id: "canada",
    label: "Wave 3 · Canada",
    window: "months 18–30",
    description:
      "Greenbelt country — the scarcity premise is native; the compliance surface changes.",
  },
];

/** Fixed deflator for the real-terms (2026$) display lenses outside the
 *  Projections workspace (compare sheet round 11 + financing lab round 13).
 *  The Projections workspace owns the adjustable slider — one knob there,
 *  a consistent fixed assumption everywhere the lens is a display toggle. */
export const REAL_TERMS_INFLATION = 2.5;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function fmtCurrency(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    if (Math.abs(value) >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${Math.round(value)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtAcres(value: number, fractionDigits = 0): string {
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })} ac`;
}

export function fmtPct(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/* ------------------------------------------------------------------ */
/* Compound capitalization math:  FV = PV · (1 + r)^n                  */
/* ------------------------------------------------------------------ */

/** Future value of a present value compounding at r% for n years. */
export function futureValue(pv: number, cagrPct: number, years: number): number {
  return pv * Math.pow(1 + cagrPct / 100, years);
}

export interface ProjectionPoint {
  year: number;
  value: number;
  /** cumulative multiple of the baseline, e.g. 2.31x */
  multiple: number;
  /** true once the submarket's raw land is projected exhausted */
  depleted: boolean;
}

/** Build the 2026 → 2026+n appreciation curve for one submarket/inputs. */
export function buildProjectionSeries(
  baseline: number,
  cagrPct: number,
  horizonYears: number,
  depletionYear: number,
  startYear = 2026
): ProjectionPoint[] {
  const series: ProjectionPoint[] = [];
  for (let n = 0; n <= horizonYears; n++) {
    const year = startYear + n;
    series.push({
      year,
      value: futureValue(baseline, cagrPct, n),
      multiple: Math.pow(1 + cagrPct / 100, n),
      depleted: year >= depletionYear,
    });
  }
  return series;
}

/** CAGR implied by a present and future value over n years (percent). */
export function impliedCagr(pv: number, fv: number, n: number): number {
  if (pv <= 0 || n <= 0) return 0;
  return (Math.pow(fv / pv, 1 / n) - 1) * 100;
}

/* ------------------------------------------------------------------ */
/* Financing math — amortized mortgages & remaining balances           */
/* ------------------------------------------------------------------ */

/**
 * Monthly payment (principal + interest) of a fully amortized loan.
 * M = P · i(1+i)^N / ((1+i)^N − 1), with i = monthly rate, N = term months.
 */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  years: number
): number {
  if (principal <= 0 || years <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  const n = Math.round(years * 12);
  if (i <= 0) return principal / n;
  const pow = Math.pow(1 + i, n);
  return (principal * i * pow) / (pow - 1);
}

/**
 * Remaining loan balance after `monthsElapsed` months of on-time payments.
 * B = P · ((1+i)^N − (1+i)^n) / ((1+i)^N − 1)
 */
export function remainingBalance(
  principal: number,
  annualRatePct: number,
  years: number,
  monthsElapsed: number
): number {
  if (principal <= 0 || years <= 0) return 0;
  const n = Math.round(monthsElapsed);
  const N = Math.round(years * 12);
  if (n >= N) return 0;
  const i = annualRatePct / 100 / 12;
  if (i <= 0) return (principal * (N - n)) / N;
  const powN = Math.pow(1 + i, N);
  const pown = Math.pow(1 + i, n);
  return (principal * (powN - pown)) / (powN - 1);
}

/** Total interest paid over the full life of the loan. */
export function totalInterest(
  principal: number,
  annualRatePct: number,
  years: number
): number {
  const N = Math.round(years * 12);
  return monthlyPayment(principal, annualRatePct, years) * N - principal;
}

/** Approximate effective annual property-tax rate by state (Gorge counties). */
export const PROPERTY_TAX_RATES: Record<StateCode, number> = {
  OR: 0.9, // Hood River / Wasco / Sherman effective averages
  WA: 0.7, // Klickitat / Skamania effective averages
};

/** County-level effective property-tax overrides (round 15 — the Puget
 *  Sound ledger runs richer levy rates than the Gorge counties). */
const PROPERTY_TAX_COUNTY_OVERRIDES: Record<string, number> = {
  "King County": 0.9,
  "Kitsap County": 0.85,
};

/** Effective annual property-tax rate for a listing's market — county
 *  override first (round 15), then the state blend. */
export function effectiveTaxRate(
  state: StateCode,
  county?: string | null
): number {
  if (county) {
    const hit = PROPERTY_TAX_COUNTY_OVERRIDES[county];
    if (hit !== undefined) return hit;
  }
  return PROPERTY_TAX_RATES[state];
}

/** Annual homeowner insurance as a share of structure value (rough heuristic). */
export const INSURANCE_RATE = 0.0032;

/** Post-depletion "infill replacement" appreciation rate used by the
 *  depletion-adjusted projection mode: once raw land is exhausted, price
 *  growth is assumed to cool to replacement-cost inflation. */
export const POST_DEPLETION_CAGR = 2.5;

/**
 * Future value with a growth-rate regime switch: compounds at `cagrPct`
 * until the depletion year, then at the lower post-depletion rate.
 * Used by the depletion-adjusted projection mode.
 */
export function futureValueDepletionAdjusted(
  pv: number,
  cagrPct: number,
  years: number,
  depletionYear: number,
  startYear = 2026
): number {
  const nPre = Math.max(0, Math.min(years, depletionYear - startYear));
  const nPost = Math.max(0, years - nPre);
  const valueAtDepletion = futureValue(pv, cagrPct, nPre);
  return futureValue(valueAtDepletion, POST_DEPLETION_CAGR, nPost);
}

/**
 * Deflates a nominal future value back into start-year (2026) dollars —
 * the "real terms" lens (round 10). A $1.14M nominal 2046 value at 4.7%
 * CAGR is only ~$686k of 2026 purchasing power at a 2.5% inflation
 * assumption; the real CAGR is (1 + r) / (1 + i) − 1 ≈ 2.2%. Composes
 * cleanly with the depletion-adjusted regime (deflation applies to
 * whatever nominal path the regime produced).
 */
export function realValue(nominal: number, inflationPct: number, years: number): number {
  if (years <= 0) return nominal;
  return nominal / Math.pow(1 + inflationPct / 100, years);
}

/** Real (inflation-adjusted) CAGR implied by a nominal rate. */
export function realCagr(cagrPct: number, inflationPct: number): number {
  return ((1 + cagrPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

export type CagrTier = "elite" | "strong" | "moderate" | "baseline";

export function cagrTier(cagr: number): CagrTier {
  if (cagr >= 5.5) return "elite";
  if (cagr >= 5.0) return "strong";
  if (cagr >= 4.7) return "moderate";
  return "baseline";
}

/* ------------------------------------------------------------------ */
/* Depletion-runway heat scale (corridor map "runway" lens)            */
/* ------------------------------------------------------------------ */

export type RunwayTier = "critical" | "tight" | "moderate" | "ample";

/** Years of raw-land runway remaining from the 2026 baseline. */
export function runwayYears(depletionYear: number, startYear = 2026): number {
  return depletionYear - startYear;
}

export function runwayTier(years: number): RunwayTier {
  if (years <= 7) return "critical";
  if (years <= 9) return "tight";
  if (years <= 11) return "moderate";
  return "ample";
}

export const RUNWAY_TIER_STYLES: Record<
  RunwayTier,
  { label: string; years: string; color: string }
> = {
  critical: { label: "Critical", years: "≤ 7 yrs", color: "#f43f5e" },
  tight: { label: "Tightening", years: "8–9 yrs", color: "#fb923c" },
  moderate: { label: "Moderate", years: "10–11 yrs", color: "#f59e0b" },
  ample: { label: "Ample", years: "12+ yrs", color: "#10b981" },
};

/* ------------------------------------------------------------------ */
/* Comparable-market matching (submarket profiles)                     */
/* ------------------------------------------------------------------ */

/** Net-buildable band midpoint of a submarket. */
export function netBuildableMid(s: Submarket): number {
  return (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
}

/**
 * Rank the corridor's other micro-markets by structural similarity to the
 * target: 45% CAGR proximity, 25% baseline-price proximity, 15% land-supply
 * proximity, 15% depletion-runway proximity — all distance-normalized so no
 * single axis dominates. Returns the top `count` matches, best first.
 */
export function findComparableMarkets(
  target: Submarket,
  all: Submarket[],
  count = 3
): Submarket[] {
  const tNet = netBuildableMid(target);
  const scored = all
    .filter((s) => s.id !== target.id)
    .map((s) => {
      const dCagr = Math.abs(s.projectedCagr - target.projectedCagr) / 1.2;
      const dPrice = Math.abs(s.baselinePrice2026 - target.baselinePrice2026) / 180_000;
      const dNet = Math.abs(netBuildableMid(s) - tNet) / 110;
      const dRunway = Math.abs(s.depletionYear - target.depletionYear) / 5;
      const distance = 0.45 * dCagr + 0.25 * dPrice + 0.15 * dNet + 0.15 * dRunway;
      return { s, score: 1 / (1 + distance) };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((x) => x.s);
}

/* ------------------------------------------------------------------ */
/* Rental-yield heuristics (Financing Lab income lens)                 */
/* ------------------------------------------------------------------ */

/**
 * Rent index for a micro-market: baseline-price-tiered multiplier on the
 * product-type base rate. Corridor median (~$450k) is the 1.00 anchor;
 * premium markets (Hood River $685k) index up to +25%, entry markets
 * (Wishram $305k) index down to −15%. Clamped so extremes stay honest.
 */
export function rentIndex(marketBaseline: number | null | undefined): number {
  if (!marketBaseline || marketBaseline <= 0) return 1;
  const raw = marketBaseline / 450_000;
  return Math.min(1.25, Math.max(0.85, raw));
}

/** Operating reserve haircut applied to gross rent for NOI: vacancy + maintenance + management. */
export const RENTAL_RESERVE_RATE = 0.08;

/* ------------------------------------------------------------------ */
/* Seasonality band for the income lens (round 8-e).                   */
/*                                                                     */
/* The Gorge rental market is strongly tourism-shaped: windsurfing,    */
/* mountain biking and harvest tourism concentrate demand Jun–Sep,     */
/* while winter tenancy discounts. The band is a corridor-wide         */
/* heuristic applied on top of the per-market price-tier index —       */
/* conservative by design and documented in the methodology dialog.    */
/* ------------------------------------------------------------------ */

export type RentSeasonality = "lean" | "annualized" | "peak";

export const SEASONAL_RENT_BANDS: Record<
  RentSeasonality,
  { label: string; mult: number; note: string }
> = {
  lean: {
    label: "Lean",
    mult: 0.88,
    note: "winter-weighted tenancy (Nov–Mar)",
  },
  annualized: {
    label: "Annual",
    mult: 1,
    note: "full-year blended lease",
  },
  peak: {
    label: "Peak",
    mult: 1.15,
    note: "summer STR premium (Jun–Sep), net of shoulder vacancy",
  },
};

/**
 * Estimated market rent for a listing, before the investor's own
 * conservative/aggro haircut. Gorge-rate heuristics by product type:
 * single-family leases carry a tourism-adjacent premium, multi-family
 * pencils thinner, and farm estates stack an agricultural ground-lease
 * on the unimproved acreage. The per-sqft base is scaled by the
 * micro-market's price tier (see rentIndex) and by the optional
 * seasonality band (see SEASONAL_RENT_BANDS) so a Hood River lease
 * pencils richer than the same floor plan in Wishram, and a
 * peak-tourism posture richer than a winter tenancy.
 */
export function estimateMarketRent(
  listing: {
    propertyType: PropertyType | string;
    squareFeet: number;
    acreage: number;
    submarket?: { baselinePrice2026: number } | null;
  },
  opts?: { seasonality?: RentSeasonality }
): { dwelling: number; agriculture: number; note: string; perSqft: number } {
  const sqft = Math.max(0, listing.squareFeet);
  if (listing.propertyType === "Land Parcel" || sqft === 0) {
    return {
      dwelling: 0,
      agriculture: 0,
      perSqft: 0,
      note: "unimproved land — no income until entitlement",
    };
  }
  const basePerSqft =
    listing.propertyType === "Infill Multi-Family"
      ? 1.05
      : listing.propertyType === "Luxury Agricultural/Farm Estate"
        ? 1.1
        : 1.35;
  const idx = rentIndex(listing.submarket?.baselinePrice2026);
  const season = SEASONAL_RENT_BANDS[opts?.seasonality ?? "annualized"];
  const perSqft = basePerSqft * idx * season.mult;
  const dwelling = sqft * perSqft;
  const agriculture =
    listing.propertyType === "Luxury Agricultural/Farm Estate" && listing.acreage > 2
      ? (listing.acreage * 150) / 12 // pasture/vineyard ground-lease at ~$150/ac/yr
      : 0;
  const idxPct = Math.round(Math.abs(idx - 1) * 100);
  const idxNote =
    idxPct === 0
      ? ""
      : ` (market ${idx > 1 ? "+" : "−"}${idxPct}% ${idx > 1 ? "premium" : "discount"})`;
  const seasonNote =
    season.mult === 1 ? "" : ` · ${season.label}: ${season.note}`;
  return {
    dwelling: Math.round(dwelling),
    agriculture: Math.round(agriculture),
    perSqft,
    note: `$${perSqft.toFixed(2)}/sqft/mo${idxNote}${seasonNote}${
      agriculture > 0 ? " + ag ground-lease" : ""
    }`,
  };
}

export const CAGR_TIER_STYLES: Record<
  CagrTier,
  { label: string; className: string }
> = {
  elite: {
    label: "Elite",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  strong: {
    label: "Strong",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  moderate: {
    label: "Moderate",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  baseline: {
    label: "Baseline",
    className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/25",
  },
};

/** Consistent chart palette (slate/zinc base, emerald accent). */
export const CHART_COLORS = {
  emerald: "#10b981",
  teal: "#14b8a6",
  slate: "#64748b",
  zinc: "#a1a1aa",
  amber: "#f59e0b",
  rose: "#f43f5e",
  series: [
    "#10b981",
    "#14b8a6",
    "#0d9488",
    "#475569",
    "#71717a",
    "#a1a1aa",
    "#f59e0b",
    "#f43f5e",
    "#18181b",
    "#5eead4",
    "#34d399",
  ],
} as const;

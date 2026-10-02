/**
 * CRGNSA analytics domain types + formatting + compound projection math.
 * Shared between server components, API routes, and client visualizations.
 */

export type StateCode = "OR" | "WA";
export type JurisdictionType =
  | "Incorporated City"
  | "Unincorporated Urban Area";
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
}

export interface ListingSubmarketSummary {
  slug: string;
  name: string;
  state: StateCode;
  county: string;
  regulatoryFramework: string;
  projectedCagr: number;
  depletionYear: number;
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

export type CagrTier = "elite" | "strong" | "moderate" | "baseline";

export function cagrTier(cagr: number): CagrTier {
  if (cagr >= 5.5) return "elite";
  if (cagr >= 5.0) return "strong";
  if (cagr >= 4.7) return "moderate";
  return "baseline";
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

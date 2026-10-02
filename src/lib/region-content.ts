/**
 * Per-region presentation content (round 15).
 *
 * The analytics engine (matrix, projections, financing, listings) is fully
 * data-driven — a region is just its submarket rows. What IS region-specific
 * is the editorial layer on the overview: the hero, the statutory framework
 * lenses, the tax-arbitrage story, and the geography map. This module keeps
 * that content with the code that renders it, keyed by region slug, and
 * defaults to the corridor so unknown slugs degrade gracefully.
 */
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Building2,
  Landmark,
  Mountain,
  Ship,
  Trees,
  Waves,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Statutory framework lenses                                          */
/* ------------------------------------------------------------------ */

export interface FrameworkLens {
  id: string;
  short: string;
  title: string;
  icon: LucideIcon;
  acres: string;
  tagline: string;
  description: string;
  supplyImpact: string;
  where: string;
}

/** Corridor lenses — the 1986 Act stack (unchanged from rounds 1–14). */
export const CORRIDOR_FRAMEWORKS: FrameworkLens[] = [
  {
    id: "act",
    short: "The 1986 Act",
    title: "Columbia River Gorge National Scenic Area Act (1986)",
    icon: Landmark,
    acres: "≈ 292,500 acres",
    tagline: "The federal overlay",
    description:
      "Congress created the CRGNSA to protect and enhance the scenic, cultural, natural, and recreational resources of the Gorge while supporting compatible economic growth. A 13-member bistate Commission (Oregon + Washington + USDA Forest Service + six counties + tribal interests) writes the Management Plan that every county in the corridor must implement through its land-use ordinances.",
    supplyImpact:
      "Every acre outside an urban area carries a federal-review layer on top of state and county rules — the single largest reason corridor land supply is structurally scarce and why entitlement inside UGB/UGA lines commands a premium.",
    where: "All 11 corridor jurisdictions sit inside the Scenic Area boundary.",
  },
  {
    id: "sma",
    short: "SMA",
    title: "Special Management Area",
    icon: Trees,
    acres: "≈ 115,000 acres",
    tagline: "The most restrictive tier",
    description:
      "The SMA hugs the immediate Columbia corridor: wetlands, streams, habitat, and the most visible riverfront benches. New residential development is heavily restricted, agricultural buildings face siting review, and any structure visible from Key Viewing Areas must meet strict color, reflectivity, and scale standards.",
    supplyImpact:
      "Effectively removes shoreline-adjacent land from the development ledger. Riverfront-parcel scarcity inside the corridor is a statutory condition, not a cyclical one.",
    where: "Riverfront benches near Cascade Locks, Stevenson, North Bonneville, Lyle, and Dallesport carry SMA overlays.",
  },
  {
    id: "gma",
    short: "GMA",
    title: "General Management Area",
    icon: BookOpenText,
    acres: "≈ 177,000 acres",
    tagline: "Resource-land emphasis",
    description:
      "The GMA governs the working landscape between towns: agriculture, forestry, and open space. New dwellings must be sited on the parcel portion least suitable for resource use and must satisfy visual-subordinance review — non-reflective materials, muted palettes, and screening from Key Viewing Areas.",
    supplyImpact:
      "Agricultural estates and vineyard compounds trade at premium multiples precisely because compliant homesites are scarce, permitted density is minimal, and each approved residence is effectively a final build-out event.",
    where: "The flagship GMA Agriculture estate listing in White Salmon is a textbook GMA review outcome.",
  },
  {
    id: "ugb",
    short: "UGB / UGA",
    title: "Urban Growth Boundaries & Urban Growth Areas",
    icon: Building2,
    acres: "11 urban enclaves",
    tagline: "Where building is actually allowed",
    description:
      "Oregon's Statewide Planning Goal 14 draws hard urban growth boundaries around Hood River, The Dalles, Cascade Locks, and Mosier — expansion requires a formal demonstration of need. Washington's GMA mirrors this with urban growth areas: White Salmon runs full city planning, while Bingen, Stevenson, and North Bonneville operate with partial-planning county overlays, and Dallesport, Lyle, and Wishram remain unincorporated UGAs.",
    supplyImpact:
      "This is the master scarcity dial: net buildable acreage is a fixed, auditable number per jurisdiction — the matrix quantifies exactly how many acres remain inside each line.",
    where: "The 11-jurisdiction Master Matrix tracks every UGB/UGA reserve in the corridor.",
  },
];

/** Puget Sound lenses — the GMA stack as it binds King + Kitsap county. */
export const PUGET_FRAMEWORKS: FrameworkLens[] = [
  {
    id: "gma-1990",
    short: "GMA 1990",
    title: "Washington Growth Management Act (1990)",
    icon: Landmark,
    acres: "36 counties · full GMA",
    tagline: "The state constitution for land",
    description:
      "The GMA forced Washington's fastest-growing counties to designate urban growth areas and protect rural and resource lands — the framework every Puget Sound jurisdiction plans under. King and Kitsap counties carry the full mandate: countywide planning policies, mandatory UGAs, and the consistency requirement that binds every city comprehensive plan to the county's growth allocation.",
    supplyImpact:
      "UGA lines can only move through a formal amendment cycle with demonstrated land-need — in a county that has repeatedly chosen not to expand them. The boundary, not the market, sets the supply ceiling.",
    where: "All six ledger markets sit inside King or Kitsap county full-GMA planning.",
  },
  {
    id: "rural",
    short: "Rural lands",
    title: "Rural & Resource Designations",
    icon: Trees,
    acres: "RA-10 / FFL density floors",
    tagline: "Where growth is forbidden",
    description:
      "Outside UGA lines, the GMA caps densities at rural levels — King County's RA-10 zoning allows roughly one dwelling per ten acres, forestry lands less. Vashon Island is the extreme case: the entire island carries rural designation with no UGA at all, so 'new supply' means lot-of-record remnants of pre-existing parcels.",
    supplyImpact:
      "Rural designation is a one-way door: converting rural land to urban requires a UGA amendment that King County's own policies presumptively deny. Vashon's 40–55 net acres are the terminal case.",
    where: "Vashon Island (whole island RA), the Issaquah Alps flanks, and everything above Snoqualmie's valley floor.",
  },
  {
    id: "cao",
    short: "CAO / SMA",
    title: "Critical Areas & Shoreline Management",
    icon: Waves,
    acres: "75% of island perimeter",
    tagline: "The ecological overlay",
    description:
      "The GMA's critical-areas ordinances (wetlands, streams, landslide and erosion hazard areas, critical aquifers) plus the Shoreline Management Act layer exclusion buffers over the remaining buildable band. On Bainbridge, SMA designations cover three-quarters of the island's shoreline; in Sammamish, the Lake Sammamish phosphorus TMDL caps impervious surface watershed-wide.",
    supplyImpact:
      "These overlays sterilize the margins of the remaining band — the net-buildable ledger is what survives the buffer math, which is exactly why the platform counts net, not gross.",
    where: "Bainbridge shorelines, Lake Sammamish watershed, Issaquah coal-mine hazard areas, Snoqualmie floodplain.",
  },
  {
    id: "tod",
    short: "Station areas",
    title: "Light-Rail Station Area Up-Zones",
    icon: Building2,
    acres: "185th · TC-4 envelope",
    tagline: "The density valve",
    description:
      "Where the GMA permits growth, it channels it: station-area subarea plans around Link light rail concentrate up-zones within a quarter mile of the platforms. Shoreline's 185th Street plan spent a decade in review before adopting the TC-4 envelope that now underwrites the TOD townhome row in this ledger.",
    supplyImpact:
      "Up-zones don't create land — they re-price it. The TOD premium is the region's one lever that works WITH the transit spine rather than against the growth collar.",
    where: "Shoreline's 185th station area; the Central Issaquah Plan's vertical envelope is the same principle without the rail.",
  },
];

/* ------------------------------------------------------------------ */
/* Region presentation config                                          */
/* ------------------------------------------------------------------ */

export interface RegionContent {
  /** Hero image (public/ path). */
  heroImage: string;
  heroAlt: string;
  /** Hero eyebrow — the statutory identity line. */
  eyebrow: string;
  /** Hero headline + highlighted tail. */
  headline: string;
  headlineAccent: string;
  /** Hero body copy. */
  heroBody: string;
  /** Primary CTA label. */
  ctaPrimary: string;
  /** Secondary CTA label. */
  ctaSecondary: string;
  /** Overview section header title. */
  metricsTitle: string;
  metricsDescription: string;
  /** Map section header. */
  mapTitle: string;
  mapDescription: string;
  /** Framework section header. */
  frameworkTitle: string;
  frameworkDescription: string;
  /** Arbitrage section header. */
  arbitrageTitle: string;
  arbitrageDescription: string;
  /** Featured-asset micro label. */
  featuredLabel: string;
  /** The lenses for the framework explorer. */
  frameworks: FrameworkLens[];
  /** Which arbitrage module: corridor OR/WA calculator vs Puget WA/CA. */
  arbitrage: "or-wa" | "wa-ca";
  /** Which geography renderer: corridor river map vs Puget Sound map. */
  map: "corridor" | "puget";
  /** Word used in-region for the market set ("corridor" / "region"). */
  scopeWord: string;
}

const CORRIDOR_CONTENT: RegionContent = {
  heroImage: "/images/hero-gorge.png",
  heroAlt: "Aerial view of the forested Columbia River Gorge at golden hour",
  eyebrow: "Columbia River Gorge National Scenic Area · Est. 1986",
  headline: "Statutory land scarcity,",
  headlineAccent: " priced in decades.",
  heroBody:
    "A full-ledger analytics platform for the 11 urban enclaves of the Gorge: regulatory land-supply scarcity, urban growth boundaries, micro-market pricing, and 20-year compound valuation projections across Oregon and Washington.",
  ctaPrimary: "Explore the Master Matrix",
  ctaSecondary: "Run 20-yr projections",
  metricsTitle: "The corridor in four numbers",
  metricsDescription:
    "Every metric below is derived from the per-jurisdiction land inventories in the Master Matrix — the auditable bottom-up view of what remains buildable inside the Scenic Area's urban lines.",
  mapTitle: "Eleven markets, one river, two tax regimes",
  mapDescription:
    "Hover any enclave for its supply band and appreciation tier; click through for the full micro-market profile.",
  frameworkTitle: "Why supply cannot respond to demand",
  frameworkDescription:
    "The 1986 Act stacks a federal scenic review over Oregon's Goal 14 and Washington's GMA. Select a lens to see what each layer does to the buildable-land ledger.",
  arbitrageTitle: "The border on the bridge",
  arbitrageDescription:
    "Washington levies no personal income tax; Oregon tops out at 9.9%. The Gorge is one of the only metropolitan-scale labor sheds where the arbitrage is a four-minute commute across a river.",
  featuredLabel: "Featured Corridor Asset",
  frameworks: CORRIDOR_FRAMEWORKS,
  arbitrage: "or-wa",
  map: "corridor",
  scopeWord: "corridor",
};

const PUGET_CONTENT: RegionContent = {
  heroImage: "/images/hero-puget.png",
  heroAlt: "Seattle skyline across Puget Sound with the Olympic Mountains behind",
  eyebrow: "Puget Sound · King & Kitsap County UGAs · GMA Est. 1990",
  headline: "The GMA's flagship scarcity theater,",
  headlineAccent: " an island and a mountain wall at a time.",
  heroBody:
    "The corridor methodology's second deployment: six boundary-trapped King and Kitsap micro-markets — from a sole-source-aquifer island city with no expansion room to a fully-platted plateau — with the same net-vs-gross buildable ledger and 20-year compounding discipline.",
  ctaPrimary: "Audit the Puget ledger",
  ctaSecondary: "Run 20-yr projections",
  metricsTitle: "The region in six numbers' worth of discipline",
  metricsDescription:
    "Same engine, new geography: every figure below is computed from the per-jurisdiction UGA residual inventories — islands, floodplains, plateaus, and mountain walls quantified to the acre.",
  mapTitle: "Six markets, two counties, one growth collar",
  mapDescription:
    "Hover any market for its supply band and appreciation tier; click through for the full micro-market profile.",
  frameworkTitle: "Why the collar cannot loosen",
  frameworkDescription:
    "The Growth Management Act draws the lines, rural designations make them one-way, and critical-areas overlays sterilize the margins. Select a lens to see what each layer does to the buildable band.",
  arbitrageTitle: "The zero-income-tax magnet",
  arbitrageDescription:
    "Washington levies no personal income tax; California tops out at 13.3%. The Puget ledger is priced by the equity exodus that spread buys — quantified below at ferry-commute and I-90 distance.",
  featuredLabel: "Featured Puget Asset",
  frameworks: PUGET_FRAMEWORKS,
  arbitrage: "wa-ca",
  map: "puget",
  scopeWord: "region",
};

const CONTENT_BY_SLUG: Record<string, RegionContent> = {
  "columbia-river-gorge": CORRIDOR_CONTENT,
  "puget-sound": PUGET_CONTENT,
};

/** Resolve region presentation content — corridor by default. */
export function regionContent(regionSlug: string | undefined): RegionContent {
  return (
    (regionSlug ? CONTENT_BY_SLUG[regionSlug] : undefined) ?? CORRIDOR_CONTENT
  );
}

/** Short display name for the region switcher + labels. */
export const REGION_SHORT_NAMES: Record<string, string> = {
  "columbia-river-gorge": "Columbia River Gorge",
  "puget-sound": "Puget Sound",
};

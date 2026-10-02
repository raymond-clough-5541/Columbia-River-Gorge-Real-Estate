/**
 * Seed script — CRGNSA Real Estate & Land Supply Analytics
 * Populates the 11 corridor micro-markets and curated property listings.
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const submarkets = [
  {
    slug: "hood-river",
    name: "Hood River",
    state: "OR",
    county: "Hood River County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "Goal 14 UGB",
    totalFootprintAcres: 780,
    grossVacantAcres: 210,
    netBuildableAcresMin: 125,
    netBuildableAcresMax: 145,
    baselinePrice2026: 685000,
    pricePerSqftMin: 340,
    pricePerSqftMax: 385,
    daysOnMarketMin: 18,
    daysOnMarketMax: 35,
    projectedCagr: 5.8,
    projectedPrice2046Min: 1980000,
    projectedPrice2046Max: 2250000,
    waterPurveyor: "City of Hood River Water Dept. (Buck Creek watershed + wells)",
    wastewaterSystem: "City of Hood River WWTP (river outfall, near capacity)",
    primaryConstraints:
      "GMA/SMA scenic overlay; steep-slope hazard zones on the west heights; effectively flat developable land nearly exhausted; WUI fire risk Class 4.",
    summaryNarrative:
      "The corridor's appreciation leader. Wind-sport tourism, orchard heritage and Portland-metro spillover demand collide with a nearly built-out Goal 14 UGB. Inventory turnover is the fastest in the Gorge; new product is overwhelmingly infill and redevelopment.",
    depletionYear: 2037,
    mapX: 54,
    mapY: 74,
  },
  {
    slug: "the-dalles",
    name: "The Dalles",
    state: "OR",
    county: "Wasco County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "Goal 14 UGB",
    totalFootprintAcres: 1850,
    grossVacantAcres: 360,
    netBuildableAcresMin: 175,
    netBuildableAcresMax: 205,
    baselinePrice2026: 545000,
    pricePerSqftMin: 235,
    pricePerSqftMax: 265,
    daysOnMarketMin: 30,
    daysOnMarketMax: 55,
    projectedCagr: 4.6,
    projectedPrice2046Min: 1260000,
    projectedPrice2046Max: 1420000,
    waterPurveyor: "City of The Dalles (South Fork Mill Creek watershed + auxiliary wells)",
    wastewaterSystem: "City of The Dalles WWTP (mid-river outfall)",
    primaryConstraints:
      "UGB largely committed; data-center and light-industrial demand competes for residential land; WUI fire risk Class 4 on south hills.",
    summaryNarrative:
      "The largest land bank in the corridor, anchored by data-center payrolls and port industrial employment. Residential absorption is steady rather than spectacular, but the scale of net buildable acreage gives The Dalles the longest raw-land runway east of Bonneville.",
    depletionYear: 2038,
    mapX: 80,
    mapY: 72,
  },
  {
    slug: "dallesport",
    name: "Dallesport",
    state: "WA",
    county: "Klickitat County",
    jurisdictionType: "Unincorporated Urban Area",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 1100,
    grossVacantAcres: 420,
    netBuildableAcresMin: 140,
    netBuildableAcresMax: 180,
    baselinePrice2026: 455000,
    pricePerSqftMin: 210,
    pricePerSqftMax: 240,
    daysOnMarketMin: 45,
    daysOnMarketMax: 75,
    projectedCagr: 4.7,
    projectedPrice2046Min: 1080000,
    projectedPrice2046Max: 1210000,
    waterPurveyor: "Klickitat County PUD No. 1 (Dallesport system)",
    wastewaterSystem: "Port of Klickitat / Dallesport lagoon WWTP (capacity headroom)",
    primaryConstraints:
      "Partial-planning jurisdiction (county-level review); rail and barge freight corridors bisect the UGA; WUI fire risk Class 5; SMA shoreline overlay along the Columbia.",
    summaryNarrative:
      "The purest cross-river tax-arbitrage play in the Gorge: zero Washington personal income tax, a bridge commute to The Dalles job base, and 140–180 acres of genuinely flat, infrastructure-served net buildable land. The 2036–2040 buildout window makes Dallesport the corridor's most credible appreciation compounder.",
    depletionYear: 2038,
    mapX: 82,
    mapY: 26,
  },
  {
    slug: "lyle",
    name: "Lyle",
    state: "WA",
    county: "Klickitat County",
    jurisdictionType: "Unincorporated Urban Area",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 460,
    grossVacantAcres: 150,
    netBuildableAcresMin: 55,
    netBuildableAcresMax: 70,
    baselinePrice2026: 395000,
    pricePerSqftMin: 195,
    pricePerSqftMax: 225,
    daysOnMarketMin: 55,
    daysOnMarketMax: 90,
    projectedCagr: 5.4,
    projectedPrice2046Min: 1050000,
    projectedPrice2046Max: 1220000,
    waterPurveyor: "Klickitat County PUD No. 1 (Lyle system)",
    wastewaterSystem: "Community septic; clustered treatment proposed but unfunded",
    primaryConstraints:
      "Septic-limited buildout; Klickitat River flood fringe; partial-planning review; WUI fire risk Class 5; rail corridor adjacency.",
    summaryNarrative:
      "A small UGA whose 5.4% projected CAGR outruns its infrastructure: appreciation is driven by scarcity (55–70 net acres), Klickitat River recreation access and White Salmon spillover — not by utility capacity. Buyers are underwriting land, not entitlement velocity.",
    depletionYear: 2035,
    mapX: 62,
    mapY: 30,
  },
  {
    slug: "wishram",
    name: "Wishram",
    state: "WA",
    county: "Klickitat County",
    jurisdictionType: "Unincorporated Urban Area",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 310,
    grossVacantAcres: 95,
    netBuildableAcresMin: 25,
    netBuildableAcresMax: 35,
    baselinePrice2026: 305000,
    pricePerSqftMin: 150,
    pricePerSqftMax: 175,
    daysOnMarketMin: 60,
    daysOnMarketMax: 100,
    projectedCagr: 4.3,
    projectedPrice2046Min: 665000,
    projectedPrice2046Max: 755000,
    waterPurveyor: "Klickitat County PUD No. 1 (Wishram system)",
    wastewaterSystem: "Individual septic systems only",
    primaryConstraints:
      "BNSF mainline adjacency; zero municipal sewer; remoteness from employment centers; WUI fire risk Class 5.",
    summaryNarrative:
      "The corridor's entry-price market. Wishram trades at the lowest baseline in the Gorge on the strength of river access and rail-town character; with no sewer and only 25–35 net acres, its ceiling is a lifestyle market rather than a growth market.",
    depletionYear: 2034,
    mapX: 92,
    mapY: 32,
  },
  {
    slug: "stevenson",
    name: "Stevenson",
    state: "WA",
    county: "Skamania County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 640,
    grossVacantAcres: 200,
    netBuildableAcresMin: 90,
    netBuildableAcresMax: 110,
    baselinePrice2026: 545000,
    pricePerSqftMin: 260,
    pricePerSqftMax: 300,
    daysOnMarketMin: 40,
    daysOnMarketMax: 70,
    projectedCagr: 5.1,
    projectedPrice2046Min: 1380000,
    projectedPrice2046Max: 1560000,
    waterPurveyor: "City of Stevenson (Rock Creek surface + wells)",
    wastewaterSystem: "Stevenson WWTP (Rock Creek discharge)",
    primaryConstraints:
      "Steep terrain and landslide hazard zones; Rock Creek floodplain; partial-planning county overlay; WUI fire risk Class 4.",
    summaryNarrative:
      "The west-Gorge lifestyle anchor: full municipal utilities, a genuine walkable main street, and Portland-weekend demand. Buildable land is constrained by slope more than by ordinance, which keeps 90–110 net acres trickling onto the market slowly and prices compounding near 5.1%.",
    depletionYear: 2036,
    mapX: 14,
    mapY: 28,
  },
  {
    slug: "north-bonneville",
    name: "North Bonneville",
    state: "WA",
    county: "Skamania County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 390,
    grossVacantAcres: 120,
    netBuildableAcresMin: 30,
    netBuildableAcresMax: 40,
    baselinePrice2026: 465000,
    pricePerSqftMin: 225,
    pricePerSqftMax: 255,
    daysOnMarketMin: 45,
    daysOnMarketMax: 80,
    projectedCagr: 4.9,
    projectedPrice2046Min: 1140000,
    projectedPrice2046Max: 1280000,
    waterPurveyor: "Skamania County PUD No. 1",
    wastewaterSystem: "City of North Bonneville WWTP",
    primaryConstraints:
      "Hamilton Creek floodplain; deed-restricted platted lots from the 1930s relocation grid; WUI fire risk Class 4.",
    summaryNarrative:
      "A planned town born of the Bonneville Dam relocation, with municipal sewer and water already in the ground. Only 30–40 net acres remain; the story here is small-lot efficiency and zero-income-tax residency within minutes of Cascade Locks employment.",
    depletionYear: 2036,
    mapX: 6,
    mapY: 30,
  },
  {
    slug: "white-salmon",
    name: "White Salmon",
    state: "WA",
    county: "Klickitat County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "GMA UGA / Full Planning",
    totalFootprintAcres: 520,
    grossVacantAcres: 140,
    netBuildableAcresMin: 45,
    netBuildableAcresMax: 60,
    baselinePrice2026: 635000,
    pricePerSqftMin: 320,
    pricePerSqftMax: 360,
    daysOnMarketMin: 25,
    daysOnMarketMax: 45,
    projectedCagr: 5.6,
    projectedPrice2046Min: 1770000,
    projectedPrice2046Max: 2000000,
    waterPurveyor: "City of White Salmon (Buck Creek + spring sources)",
    wastewaterSystem: "White Salmon / Bingen joint WWTP",
    primaryConstraints:
      "Buildable bench nearly exhausted; steep slopes above and below town; view premiums inflate land basis; WUI fire risk Class 4.",
    summaryNarrative:
      "The second-fastest compounder in the corridor and the only full-planning GMA city in Klickitat County. White Salmon pairs Hood River views without Oregon income tax — a structural demand magnet. Net buildable land is the binding constraint: 45–60 acres against 5.6% projected CAGR.",
    depletionYear: 2033,
    mapX: 34,
    mapY: 26,
  },
  {
    slug: "cascade-locks",
    name: "Cascade Locks",
    state: "OR",
    county: "Hood River County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "Goal 14 UGB",
    totalFootprintAcres: 560,
    grossVacantAcres: 190,
    netBuildableAcresMin: 110,
    netBuildableAcresMax: 135,
    baselinePrice2026: 415000,
    pricePerSqftMin: 205,
    pricePerSqftMax: 240,
    daysOnMarketMin: 40,
    daysOnMarketMax: 70,
    projectedCagr: 4.8,
    projectedPrice2046Min: 1000000,
    projectedPrice2046Max: 1130000,
    waterPurveyor: "City of Cascade Locks (well field; firm-yield concerns)",
    wastewaterSystem: "Cascade Locks WWTP",
    primaryConstraints:
      "Groundwater supply margin; Herman Creek floodplain; tribal fishing-site adjacency; WUI fire risk Class 4.",
    summaryNarrative:
      "The west-Gorge value market on the Oregon side: 110–135 net buildable acres, a real downtown marine grid, and the lowest Oregon-side baseline after the UGB walls of Hood River push demand east. Water-system firm yield is the variable to watch.",
    depletionYear: 2037,
    mapX: 22,
    mapY: 72,
  },
  {
    slug: "mosier",
    name: "Mosier",
    state: "OR",
    county: "Wasco County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "Goal 14 UGB",
    totalFootprintAcres: 180,
    grossVacantAcres: 45,
    netBuildableAcresMin: 15,
    netBuildableAcresMax: 25,
    baselinePrice2026: 545000,
    pricePerSqftMin: 285,
    pricePerSqftMax: 330,
    daysOnMarketMin: 35,
    daysOnMarketMax: 60,
    projectedCagr: 5.2,
    projectedPrice2046Min: 1410000,
    projectedPrice2046Max: 1590000,
    waterPurveyor: "City of Mosier (two-well field; seasonal nitrate pressure)",
    wastewaterSystem: "Community drainfield / septic management district",
    primaryConstraints:
      "Smallest UGB in the corridor; well capacity and nitrate margins; I-84 noise shed; WUI fire risk Class 5.",
    summaryNarrative:
      "The corridor's scarcity singularity: 15–25 net acres inside a 180-acre UGB. Mosier prices like a boutique market because it is one — every listing is effectively the last listing. First projected to reach terminal raw-land depletion (2032).",
    depletionYear: 2032,
    mapX: 46,
    mapY: 70,
  },
  {
    slug: "bingen",
    name: "Bingen",
    state: "WA",
    county: "Klickitat County",
    jurisdictionType: "Incorporated City",
    regulatoryFramework: "GMA UGA / Partial Planning",
    totalFootprintAcres: 300,
    grossVacantAcres: 110,
    netBuildableAcresMin: 35,
    netBuildableAcresMax: 50,
    baselinePrice2026: 405000,
    pricePerSqftMin: 200,
    pricePerSqftMax: 230,
    daysOnMarketMin: 50,
    daysOnMarketMax: 85,
    projectedCagr: 4.5,
    projectedPrice2046Min: 920000,
    projectedPrice2046Max: 1040000,
    waterPurveyor: "City of Bingen (well field)",
    wastewaterSystem: "White Salmon / Bingen joint WWTP",
    primaryConstraints:
      "Industrial buffer around the port; BNSF rail adjacency; partial-planning review; WUI fire risk Class 4.",
    summaryNarrative:
      "White Salmon's working-class twin across the flat: shared sewer capacity, port employment, and 35–50 net acres priced 35% below its neighbor. The value case is infrastructure parity with a lower land basis.",
    depletionYear: 2035,
    mapX: 38,
    mapY: 32,
  },
];

type ListingSeed = {
  submarketSlug: string;
  title: string;
  propertyType: string;
  price: number;
  acreage: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  zoningCode: string;
  description: string;
  imageUrl: string;
  featured?: boolean;
  status?: string;
};

const listings: ListingSeed[] = [
  {
    submarketSlug: "white-salmon",
    title: "GMA Luxury Farm & Vineyard Estate with High-Value Residence",
    propertyType: "Luxury Agricultural/Farm Estate",
    price: 4850000,
    acreage: 38.5,
    bedrooms: 4,
    bathrooms: 4.5,
    squareFeet: 5800,
    zoningCode: "GMA Agriculture",
    description:
      "Flagship corridor asset: 38.5 deed acres under GMA Agriculture with certified water rights and south-facing Mt. Hood and Columbia views. The 5,800 sq ft custom residence is sited for visual subordinance under CRGNSA review — non-reflective finishes, earth-tone palette, and a low-profile roofline screened by retained oak grove. Established vineyard blocks (11 acres), climate-controlled farm shop, and a fully entitled second homesite make this the benchmark agricultural compound in the National Scenic Area.",
    imageUrl: "/images/vineyard-estate.png",
    featured: true,
    status: "New",
  },
  {
    submarketSlug: "hood-river",
    title: "Heights Infill Craftsman — New Construction",
    propertyType: "Single-Family",
    price: 895000,
    acreage: 0.18,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2650,
    zoningCode: "R-2",
    description:
      "One of the last buildable interior lots on the Heights. New-construction craftsman with ADI-ready utility stubs, two blocks to schools and the Heights business district. Walk-score positioning inside a nearly exhausted Goal 14 UGB.",
    imageUrl: "/images/craftsman-home.png",
    status: "New",
  },
  {
    submarketSlug: "hood-river",
    title: "Orchard District Farmhouse on Irrigated Acreage",
    propertyType: "Luxury Agricultural/Farm Estate",
    price: 1650000,
    acreage: 8.2,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 3400,
    zoningCode: "Exclusive Farm Use (EFU) Transition",
    description:
      "Historic farmhouse surrounded by producing pear and cherry blocks with district irrigation water rights. Classic Hood River agricultural land-bank play: hold the orchard income while the UGB infill premium migrates outward.",
    imageUrl: "/images/orchard-farmhouse.png",
  },
  {
    submarketSlug: "the-dalles",
    title: "Baker Creek City-View Contemporary",
    propertyType: "Single-Family",
    price: 625000,
    acreage: 0.31,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 2180,
    zoningCode: "R-1",
    description:
      "Terraced hillside contemporary above Baker Creek with protected river-view corridor. Positioned inside The Dalles' slowest-appreciating but deepest land bank — 175–205 net acres of remaining UGB capacity backs long-hold value.",
    imageUrl: "/images/contemporary-view.png",
  },
  {
    submarketSlug: "the-dalles",
    title: "Downtown Mixed-Use Redevelopment Parcel",
    propertyType: "Infill Multi-Family",
    price: 780000,
    acreage: 0.34,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "C-2 Downtown Commercial",
    description:
      "Assemblage opportunity across two street-front lots in the certified historic downtown. Zoned C-2 with vertical mixed-use by right — the corridor's cleanest workforce-housing underwrite with port and data-center payroll demand within two miles.",
    imageUrl: "/images/downtown-parcel.png",
  },
  {
    submarketSlug: "dallesport",
    title: "UGA Ready-to-Build Bluff View Parcel",
    propertyType: "Land Parcel",
    price: 265000,
    acreage: 1.4,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "Dallesport UGA Residential",
    description:
      "Flat, cleared 1.4-acre parcel inside the Dallesport UGA with PUD water and Port sewer at the property line. Direct river view across to The Dalles. The textbook zero-income-tax arbitrage entry: build in Washington, commute four minutes to Oregon employment.",
    imageUrl: "/images/view-parcel.png",
    status: "New",
  },
  {
    submarketSlug: "dallesport",
    title: "New Construction w/ WA Tax Arbitrage",
    propertyType: "Single-Family",
    price: 495000,
    acreage: 0.28,
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2350,
    zoningCode: "Dallesport UGA Residential",
    description:
      "Builder-spec residence completed inside the UGA's 140–180-acre buildable reserve. Priced $60k under the Oregon-side median while its owner keeps 100% of personal income — the purest illustration of the cross-river spread.",
    imageUrl: "/images/craftsman-home.png",
  },
  {
    submarketSlug: "white-salmon",
    title: "Cliffside View Home Above the River",
    propertyType: "Single-Family",
    price: 1150000,
    acreage: 0.62,
    bedrooms: 4,
    bathrooms: 3.5,
    squareFeet: 3050,
    zoningCode: "Suburban Residential (SR)",
    description:
      "Cantilevered residence on the basalt bench with a 180-degree Columbia Gorge view corridor. Inside the corridor's second-fastest compounder (5.6% CAGR) and its most land-constrained full-planning city — 45–60 net acres remain.",
    imageUrl: "/images/contemporary-view.png",
  },
  {
    submarketSlug: "white-salmon",
    title: "Jewett Infill Duplex Development Site",
    propertyType: "Infill Multi-Family",
    price: 420000,
    acreage: 0.29,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "R-3 Multi-Family",
    description:
      "Shovel-ready R-3 site with joint WWTP allocation from the White Salmon/Bingen plant. Duplex-by-right entitlement within walking distance of the full-planning city's commercial core.",
    imageUrl: "/images/infill-parcel.png",
  },
  {
    submarketSlug: "stevenson",
    title: "Rock Creek Cottage — Walk-In Condition",
    propertyType: "Single-Family",
    price: 465000,
    acreage: 0.21,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1780,
    zoningCode: "R-1",
    description:
      "Remodeled cottage two blocks from Stevenson's Rock Creek main street. Full municipal utilities inside the west Gorge's only full-service lifestyle city with 90–110 net acres of remaining buildable supply.",
    imageUrl: "/images/cottage.png",
  },
  {
    submarketSlug: "cascade-locks",
    title: "Marina District Buildable Lot",
    propertyType: "Land Parcel",
    price: 189000,
    acreage: 0.52,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "Marine Commercial / Residential",
    description:
      "Half-acre lot steps from the marina grid inside a 110–135-acre net-buildable UGB. City water and sewer connected; well-documented firm-yield margin is the only diligence item.",
    imageUrl: "/images/infill-parcel.png",
  },
  {
    submarketSlug: "lyle",
    title: "Klickitat River Acreage with Water Right",
    propertyType: "Land Parcel",
    price: 525000,
    acreage: 12.6,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "Small-Tract Agriculture (STA)",
    description:
      "12.6 acres at the Klickitat confluence with a senior irrigation right and SMA-review building envelope. Inside Lyle's 55–70-acre net-buildable band — the highest CAGR per acre of infrastructure in the corridor, if septic capacity holds.",
    imageUrl: "/images/acreage-land.png",
  },
  {
    submarketSlug: "mosier",
    title: "Pocket-UGB Cottage Remodel",
    propertyType: "Single-Family",
    price: 510000,
    acreage: 0.16,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1540,
    zoningCode: "R-1",
    description:
      "A rare turnover inside the smallest UGB in the Gorge — 15–25 net acres total. The 2032 depletion projection makes every Mosier listing a terminal-supply asset; remodel already completed to systems level.",
    imageUrl: "/images/cottage.png",
    status: "Pending",
  },
  {
    submarketSlug: "bingen",
    title: "Port-Adjacent Light Industrial Flex Site",
    propertyType: "Land Parcel",
    price: 350000,
    acreage: 1.1,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "GI General Industrial",
    description:
      "Graded 1.1-acre GI site with rail-served adjacency and joint WWTP allocation. The value pairing to White Salmon: identical infrastructure, 35% lower land basis, 35–50 net acres remaining.",
    imageUrl: "/images/flex-site.png",
  },
  {
    submarketSlug: "wishram",
    title: "Columbia Riverfront Cabin Retreat",
    propertyType: "Single-Family",
    price: 345000,
    acreage: 0.4,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1120,
    zoningCode: "R-1",
    description:
      "Water-proximate cabin on the corridor's lowest rung of the price ladder. Septic-only, rail-adjacent, and remote — but the 4.3% projected CAGR still compounds from a $305k baseline.",
    imageUrl: "/images/riverside-cabin.png",
  },
  {
    submarketSlug: "north-bonneville",
    title: "Hamilton Creek Infill Lot",
    propertyType: "Land Parcel",
    price: 155000,
    acreage: 0.4,
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    zoningCode: "R-1",
    description:
      "Buildable lot on the historic relocation grid with Skamania PUD water and city sewer at the line. Entry ticket to zero-income-tax Washington inside a 30–40-acre net-buildable envelope.",
    imageUrl: "/images/infill-parcel.png",
    status: "Pending",
  },
];

async function main() {
  console.log("Seeding CRGNSA analytics database…");

  // Wipe in dependency order.
  await db.propertyListing.deleteMany();
  await db.submarket.deleteMany();

  const slugToId = new Map<string, string>();
  for (const s of submarkets) {
    const created = await db.submarket.create({ data: s });
    slugToId.set(s.slug, created.id);
    console.log(`  ✓ submarket: ${s.name} (${s.state})`);
  }

  for (const l of listings) {
    const submarketId = slugToId.get(l.submarketSlug);
    if (!submarketId) throw new Error(`Unknown submarket slug: ${l.submarketSlug}`);
    const { submarketSlug, ...rest } = l;
    await db.propertyListing.create({
      data: { ...rest, submarketId },
    });
    console.log(`  ✓ listing: ${l.title}`);
  }

  console.log(
    `Seeded ${submarkets.length} submarkets and ${listings.length} listings.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

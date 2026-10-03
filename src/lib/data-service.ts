import { db } from "@/lib/db";
import seedData from "@/lib/seed-data.json";
import { DEFAULT_REGION_SLUG, computeRegionStats, type StateCode, type JurisdictionType, type Submarket } from "@/lib/gorge";

export interface RawRegionRow {
  id: string;
  slug: string;
  name: string;
  country: string;
  statesProvinces: string;
  wave: string;
  status: string;
  scarcityHook: string;
  regulatoryContext: string;
  taxArbitrageNote: string;
  targetSubmarkets: number;
  launchOrder: number;
  launchedAt: Date | string | null;
  createdAt: Date | string;
}

export interface RawSubmarketRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  county: string;
  jurisdictionType: string;
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
  regionId: string | null;
  createdAt: Date | string;
  listings?: { id: string }[];
}

export interface RawListingRow {
  id: string;
  submarketId: string;
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
  featured: boolean;
  status: string;
  createdAt: Date | string;
  submarket?: {
    slug: string;
    name: string;
    state: string;
    county: string;
    regulatoryFramework: string;
    projectedCagr: number;
    depletionYear: number;
    baselinePrice2026: number;
  } | null;
}

export async function fetchLedgerData(): Promise<{
  regions: RawRegionRow[];
  submarkets: (RawSubmarketRow & { listings: { id: string }[] })[];
  listings: RawListingRow[];
}> {
  try {
    const regionRows = await db.region.findMany({
      orderBy: { launchOrder: "asc" },
    });

    const submarketRows = await db.submarket.findMany({
      orderBy: [{ state: "asc" }, { name: "asc" }],
      include: { listings: { select: { id: true } } },
    });

    const listingRows = await db.propertyListing.findMany({
      orderBy: [{ featured: "desc" }, { price: "desc" }],
      include: {
        submarket: {
          select: {
            slug: true,
            name: true,
            state: true,
            county: true,
            regulatoryFramework: true,
            projectedCagr: true,
            depletionYear: true,
            baselinePrice2026: true,
          },
        },
      },
    });

    if (regionRows && regionRows.length > 0) {
      return {
        regions: regionRows,
        submarkets: submarketRows,
        listings: listingRows,
      };
    }
  } catch (err) {
    console.warn(
      "[DataService] Database query unavailable or failed, falling back to static ledger snapshot:",
      err instanceof Error ? err.message : err
    );
  }

  // Fallback to static seed data
  const submarketMap = new Map(seedData.submarkets.map((s) => [s.id, s]));
  const listingIdsBySubmarket = new Map<string, { id: string }[]>();

  for (const l of seedData.listings) {
    const arr = listingIdsBySubmarket.get(l.submarketId) ?? [];
    arr.push({ id: l.id });
    listingIdsBySubmarket.set(l.submarketId, arr);
  }

  const fallbackSubmarkets = seedData.submarkets.map((s) => ({
    ...s,
    listings: listingIdsBySubmarket.get(s.id) ?? [],
  }));

  const fallbackListings = seedData.listings.map((l) => {
    const sm = submarketMap.get(l.submarketId);
    return {
      ...l,
      submarket: sm
        ? {
            slug: sm.slug,
            name: sm.name,
            state: sm.state,
            county: sm.county,
            regulatoryFramework: sm.regulatoryFramework,
            projectedCagr: sm.projectedCagr,
            depletionYear: sm.depletionYear,
            baselinePrice2026: sm.baselinePrice2026,
          }
        : null,
    };
  });

  return {
    regions: seedData.regions,
    submarkets: fallbackSubmarkets,
    listings: fallbackListings,
  };
}

export async function getRegionsData(wave?: string | null, status?: string | null) {
  try {
    const where: Record<string, string> = {};
    if (wave && ["core", "pnw", "usa", "canada"].includes(wave)) where.wave = wave;
    if (status && ["live", "scaffold", "planned", "research"].includes(status)) where.status = status;

    const regions = await db.region.findMany({
      where,
      orderBy: { launchOrder: "asc" },
      include: {
        submarkets: {
          select: {
            id: true,
            netBuildableAcresMin: true,
            netBuildableAcresMax: true,
            projectedCagr: true,
            baselinePrice2026: true,
            listings: { select: { id: true } },
          },
        },
      },
    });

    if (regions && regions.length > 0) {
      return formatRegionsResponse(regions);
    }
  } catch (err) {
    console.warn("[DataService] getRegionsData DB failed, using fallback:", err);
  }

  // Fallback
  let filtered = seedData.regions;
  if (wave && ["core", "pnw", "usa", "canada"].includes(wave)) {
    filtered = filtered.filter((r) => r.wave === wave);
  }
  if (status && ["live", "scaffold", "planned", "research"].includes(status)) {
    filtered = filtered.filter((r) => r.status === status);
  }

  const submarketMap = new Map<string, typeof seedData.submarkets>();
  for (const s of seedData.submarkets) {
    if (!s.regionId) continue;
    const arr = submarketMap.get(s.regionId) ?? [];
    arr.push(s);
    submarketMap.set(s.regionId, arr);
  }

  const listingCountsBySubmarket = new Map<string, number>();
  for (const l of seedData.listings) {
    listingCountsBySubmarket.set(l.submarketId, (listingCountsBySubmarket.get(l.submarketId) ?? 0) + 1);
  }

  const regionsWithSubmarkets = filtered.map((r) => {
    const subs = submarketMap.get(r.id) ?? [];
    return {
      ...r,
      submarkets: subs.map((s) => ({
        id: s.id,
        netBuildableAcresMin: s.netBuildableAcresMin,
        netBuildableAcresMax: s.netBuildableAcresMax,
        projectedCagr: s.projectedCagr,
        baselinePrice2026: s.baselinePrice2026,
        listings: Array.from({ length: listingCountsBySubmarket.get(s.id) ?? 0 }).map((_, i) => ({ id: `${s.id}-${i}` })),
      })),
    };
  });

  return formatRegionsResponse(regionsWithSubmarkets);
}

function formatRegionsResponse(regions: any[]) {
  return regions.map((r) => {
    const markets = r.submarkets || [];
    const baselines = markets
      .map((s: any) => s.baselinePrice2026)
      .sort((a: number, b: number) => a - b);
    const mid = Math.floor(baselines.length / 2);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      country: r.country,
      statesProvinces: r.statesProvinces,
      wave: r.wave,
      status: r.status,
      scarcityHook: r.scarcityHook,
      regulatoryContext: r.regulatoryContext,
      taxArbitrageNote: r.taxArbitrageNote,
      targetSubmarkets: r.targetSubmarkets,
      launchOrder: r.launchOrder,
      launchedAt: r.launchedAt
        ? typeof r.launchedAt === "string"
          ? r.launchedAt
          : r.launchedAt.toISOString()
        : null,
      aggregate:
        markets.length > 0
          ? {
              marketCount: markets.length,
              listingCount: markets.reduce((a: number, s: any) => a + (s.listings?.length ?? 0), 0),
              netBuildableMid: Math.round(
                markets.reduce((a: number, s: any) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2, 0)
              ),
              averageCagr: markets.reduce((a: number, s: any) => a + s.projectedCagr, 0) / markets.length,
              medianBaseline:
                baselines.length % 2 === 0
                  ? (baselines[mid - 1] + baselines[mid]) / 2
                  : baselines[mid],
            }
          : null,
    };
  });
}

export async function getSubmarketsData(region?: string | null, state?: string | null, jurisdiction?: string | null) {
  try {
    const where: Record<string, unknown> = {};
    if (region) {
      where.OR =
        region === DEFAULT_REGION_SLUG
          ? [{ region: { slug: region } }, { regionId: null }]
          : [{ region: { slug: region } }];
    }
    if (state === "OR" || state === "WA") where.state = state;
    if (
      jurisdiction === "Incorporated City" ||
      jurisdiction === "Unincorporated Urban Area" ||
      jurisdiction === "Unincorporated Rural Area"
    )
      where.jurisdictionType = jurisdiction;

    const submarkets = await db.submarket.findMany({
      where,
      orderBy: { name: "asc" },
      include: { listings: { select: { id: true } } },
    });

    if (submarkets && submarkets.length > 0) {
      return submarkets.map((s) => ({
        ...s,
        listingCount: s.listings.length,
        listings: undefined,
      }));
    }
  } catch (err) {
    console.warn("[DataService] getSubmarketsData DB failed, using fallback:", err);
  }

  // Fallback
  const regionRow = region ? seedData.regions.find((r) => r.slug === region) : null;
  const regionId = regionRow ? regionRow.id : null;

  const listingCountsBySubmarket = new Map<string, number>();
  for (const l of seedData.listings) {
    listingCountsBySubmarket.set(l.submarketId, (listingCountsBySubmarket.get(l.submarketId) ?? 0) + 1);
  }

  let list = seedData.submarkets;
  if (region) {
    if (region === DEFAULT_REGION_SLUG) {
      list = list.filter((s) => s.regionId === regionId || s.regionId === null);
    } else {
      list = list.filter((s) => s.regionId === regionId);
    }
  }
  if (state === "OR" || state === "WA") {
    list = list.filter((s) => s.state === state);
  }
  if (
    jurisdiction === "Incorporated City" ||
    jurisdiction === "Unincorporated Urban Area" ||
    jurisdiction === "Unincorporated Rural Area"
  ) {
    list = list.filter((s) => s.jurisdictionType === jurisdiction);
  }

  return list.map((s) => ({
    ...s,
    listingCount: listingCountsBySubmarket.get(s.id) ?? 0,
    listings: undefined,
  }));
}

export async function getSubmarketBySlug(slug: string) {
  try {
    const submarket = await db.submarket.findUnique({
      where: { slug },
      include: {
        listings: { orderBy: { price: "desc" } },
      },
    });
    if (submarket) return submarket;
  } catch (err) {
    console.warn("[DataService] getSubmarketBySlug DB failed, using fallback:", err);
  }

  // Fallback
  const submarket = seedData.submarkets.find((s) => s.slug === slug);
  if (!submarket) return null;

  const listings = seedData.listings
    .filter((l) => l.submarketId === submarket.id)
    .sort((a, b) => b.price - a.price);

  return {
    ...submarket,
    listings,
  };
}

export async function getListingsData(filters: {
  region?: string | null;
  submarket?: string | null;
  type?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  minAcreage?: string | null;
  featured?: string | null;
  q?: string | null;
  sort?: string | null;
}) {
  try {
    const where: any = {};
    const submarketWhere: any = {};
    if (filters.region) {
      if (filters.region === DEFAULT_REGION_SLUG) {
        submarketWhere.OR = [{ region: { slug: filters.region } }, { regionId: null }];
      } else {
        submarketWhere.region = { slug: filters.region };
      }
    }
    if (filters.submarket) submarketWhere.slug = filters.submarket;
    if (Object.keys(submarketWhere).length > 0) where.submarket = submarketWhere;
    if (filters.type) where.propertyType = filters.type;
    if (filters.featured === "true") where.featured = true;

    const priceFilter: any = {};
    if (filters.minPrice && !Number.isNaN(Number(filters.minPrice)))
      priceFilter.gte = Number(filters.minPrice);
    if (filters.maxPrice && !Number.isNaN(Number(filters.maxPrice)))
      priceFilter.lte = Number(filters.maxPrice);
    if (priceFilter.gte !== undefined || priceFilter.lte !== undefined)
      where.price = priceFilter;

    if (filters.minAcreage && !Number.isNaN(Number(filters.minAcreage)))
      where.acreage = { gte: Number(filters.minAcreage) };
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q } },
        { description: { contains: filters.q } },
        { zoningCode: { contains: filters.q } },
        { submarket: { name: { contains: filters.q } } },
      ];
    }

    let orderBy: any = [{ price: "desc" }];
    if (filters.sort === "price-asc") orderBy = [{ price: "asc" }];
    else if (filters.sort === "acreage-desc") orderBy = [{ acreage: "desc" }];
    else if (filters.sort === "newest") orderBy = [{ createdAt: "desc" }];

    const listings = await db.propertyListing.findMany({
      where,
      orderBy,
      include: {
        submarket: {
          select: {
            slug: true,
            name: true,
            state: true,
            county: true,
            regulatoryFramework: true,
            projectedCagr: true,
            depletionYear: true,
            baselinePrice2026: true,
          },
        },
      },
    });

    if (listings && listings.length > 0) return listings;
  } catch (err) {
    console.warn("[DataService] getListingsData DB failed, using fallback:", err);
  }

  // Fallback
  const submarketMap = new Map(seedData.submarkets.map((s) => [s.id, s]));
  const regionSlugMap = new Map(seedData.regions.map((r) => [r.id, r.slug]));

  let list = seedData.listings.map((l) => {
    const sm = submarketMap.get(l.submarketId);
    const regSlug = sm && sm.regionId ? regionSlugMap.get(sm.regionId) : DEFAULT_REGION_SLUG;
    return {
      ...l,
      regionSlug: regSlug ?? DEFAULT_REGION_SLUG,
      submarket: sm
        ? {
            slug: sm.slug,
            name: sm.name,
            state: sm.state,
            county: sm.county,
            regulatoryFramework: sm.regulatoryFramework,
            projectedCagr: sm.projectedCagr,
            depletionYear: sm.depletionYear,
            baselinePrice2026: sm.baselinePrice2026,
          }
        : null,
    };
  });

  if (filters.region) {
    list = list.filter((l) => l.regionSlug === filters.region);
  }
  if (filters.submarket) {
    list = list.filter((l) => l.submarket?.slug === filters.submarket);
  }
  if (filters.type) {
    list = list.filter((l) => l.propertyType === filters.type);
  }
  if (filters.featured === "true") {
    list = list.filter((l) => l.featured);
  }
  if (filters.minPrice && !Number.isNaN(Number(filters.minPrice))) {
    list = list.filter((l) => l.price >= Number(filters.minPrice));
  }
  if (filters.maxPrice && !Number.isNaN(Number(filters.maxPrice))) {
    list = list.filter((l) => l.price <= Number(filters.maxPrice));
  }
  if (filters.minAcreage && !Number.isNaN(Number(filters.minAcreage))) {
    list = list.filter((l) => l.acreage >= Number(filters.minAcreage));
  }
  if (filters.q) {
    const term = filters.q.toLowerCase();
    list = list.filter(
      (l) =>
        l.title.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        l.zoningCode.toLowerCase().includes(term) ||
        (l.submarket && l.submarket.name.toLowerCase().includes(term))
    );
  }

  if (filters.sort === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (filters.sort === "acreage-desc") {
    list.sort((a, b) => b.acreage - a.acreage);
  } else if (filters.sort === "newest") {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    list.sort((a, b) => b.price - a.price);
  }

  return list;
}

export async function getStatsData(regionSlug: string = DEFAULT_REGION_SLUG) {
  try {
    const regionRow = await db.region.findUnique({
      where: { slug: regionSlug },
      select: { id: true, slug: true },
    });

    if (regionRow) {
      const submarketRows = await db.submarket.findMany({
        where:
          regionSlug === DEFAULT_REGION_SLUG
            ? { OR: [{ regionId: regionRow.id }, { regionId: null }] }
            : { regionId: regionRow.id },
      });
      const submarkets: Submarket[] = submarketRows.map((s) => ({
        ...s,
        state: s.state as StateCode,
        jurisdictionType: s.jurisdictionType as JurisdictionType,
      }));

      const listingCount = await db.propertyListing.count({
        where:
          regionSlug === DEFAULT_REGION_SLUG
            ? {
                submarket: {
                  OR: [{ regionId: regionRow.id }, { regionId: null }],
                },
              }
            : { submarket: { regionId: regionRow.id } },
      });

      return computeRegionStats(submarkets, listingCount);
    }
  } catch (err) {
    console.warn("[DataService] getStatsData DB failed, using fallback:", err);
  }

  // Fallback
  const reg = seedData.regions.find((r) => r.slug === regionSlug);
  const regId = reg ? reg.id : null;
  const submarketRows = seedData.submarkets.filter((s) =>
    regionSlug === DEFAULT_REGION_SLUG
      ? s.regionId === regId || s.regionId === null
      : s.regionId === regId
  );
  const submarkets: Submarket[] = submarketRows.map((s) => ({
    ...s,
    state: s.state as StateCode,
    jurisdictionType: s.jurisdictionType as JurisdictionType,
  }));
  const submarketIds = new Set(submarketRows.map((s) => s.id));
  const listingCount = seedData.listings.filter((l) => submarketIds.has(l.submarketId)).length;

  return computeRegionStats(submarkets, listingCount);
}

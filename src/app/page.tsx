import { db } from "@/lib/db";
import { GorgeApp } from "@/components/gorge/gorge-app";
import {
  DEFAULT_REGION_SLUG,
  type PropertyListing,
  type PropertyType,
  type StateCode,
  type JurisdictionType,
  type Region,
  type RegionStatus,
  type RegionWave,
  type RegionAggregate,
  type Submarket,
} from "@/lib/gorge";

export const dynamic = "force-dynamic";

/**
 * Server Component entry — fetches the full region-registry ledger from
 * SQLite via Prisma on the server and hands it to the client analytics
 * shell. Round 15: ALL regions ship to the client; the shell scopes each
 * workspace to the active region in the hash route (#/r/<slug>/matrix …).
 * The SSR stats snapshot stays scoped to the DEFAULT region so the
 * server-rendered overview matches the post-hydration corridor view.
 */
export default async function Page() {
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

  const submarkets: Submarket[] = submarketRows.map((s) => ({
    ...s,
    state: s.state as StateCode,
    jurisdictionType: s.jurisdictionType as JurisdictionType,
    listingCount: s.listings.length,
  }));

  // Per-region aggregates from the attached submarkets (live regions only).
  interface RegionAcc {
    marketCount: number;
    listingCount: number;
    netBuildableMid: number;
    cagrSum: number;
    baselines: number[];
  }
  const aggByRegion = new Map<string, RegionAcc>();
  for (const s of submarketRows) {
    if (!s.regionId) continue;
    const prev: RegionAcc = aggByRegion.get(s.regionId) ?? {
      marketCount: 0,
      listingCount: 0,
      netBuildableMid: 0,
      cagrSum: 0,
      baselines: [],
    };
    prev.marketCount += 1;
    prev.listingCount += s.listings.length;
    prev.netBuildableMid += (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2;
    prev.cagrSum += s.projectedCagr;
    prev.baselines.push(s.baselinePrice2026);
    aggByRegion.set(s.regionId, prev);
  }

  const regions: Region[] = regionRows.map((r) => {
    const agg = aggByRegion.get(r.id);
    let aggregate: RegionAggregate | null = null;
    if (agg && agg.marketCount > 0) {
      const sorted = [...agg.baselines].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      aggregate = {
        marketCount: agg.marketCount,
        listingCount: agg.listingCount,
        netBuildableMid: Math.round(agg.netBuildableMid),
        averageCagr: agg.cagrSum / agg.marketCount,
        medianBaseline:
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid],
      };
    }
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      country: r.country,
      statesProvinces: r.statesProvinces,
      wave: r.wave as RegionWave,
      status: r.status as RegionStatus,
      scarcityHook: r.scarcityHook,
      regulatoryContext: r.regulatoryContext,
      taxArbitrageNote: r.taxArbitrageNote,
      targetSubmarkets: r.targetSubmarkets,
      launchOrder: r.launchOrder,
      launchedAt: r.launchedAt ? r.launchedAt.toISOString() : null,
      aggregate,
    };
  });

  const listings: PropertyListing[] = listingRows.map((l) => ({
    ...l,
    propertyType: l.propertyType as PropertyType,
    createdAt: l.createdAt.toISOString(),
    submarket: l.submarket
      ? { ...l.submarket, state: l.submarket.state as StateCode }
      : null,
  }));

  // Default-region (corridor) row — the client shell derives ALL per-region
  // stats client-side from the full registry (same math, shared helper), so
  // no server stats need to ship (round 15). The row exists as a guard so a
  // re-seed that drops the region table surfaces loudly in QA instead of
  // silently rendering an empty ledger.
  const defaultRegionRow = regionRows.find(
    (r) => r.slug === DEFAULT_REGION_SLUG
  );
  if (!defaultRegionRow) {
    throw new Error(
      `Seed integrity: default region "${DEFAULT_REGION_SLUG}" missing — re-run bun prisma/seed.ts`
    );
  }

  return (
    <GorgeApp
      submarkets={submarkets}
      listings={listings}
      regions={regions}
    />
  );
}

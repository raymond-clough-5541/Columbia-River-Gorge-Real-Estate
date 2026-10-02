import { db } from "@/lib/db";
import { GorgeApp } from "@/components/gorge/gorge-app";
import type {
  CorridorStats,
  PropertyListing,
  StateCode,
  JurisdictionType,
  Submarket,
} from "@/lib/gorge";

export const dynamic = "force-dynamic";

/**
 * Server Component entry — fetches the full corridor ledger from SQLite via
 * Prisma on the server and hands it to the client analytics shell.
 */
export default async function Page() {
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

  const listings: PropertyListing[] = listingRows.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    submarket: l.submarket
      ? { ...l.submarket, state: l.submarket.state as StateCode }
      : null,
  }));

  // Corridor-level aggregates for the executive dashboard.
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

  const stats: CorridorStats = {
    submarketCount: submarkets.length,
    listingCount: listings.length,
    totalNetBuildableMin: submarkets.reduce((a, s) => a + s.netBuildableAcresMin, 0),
    totalNetBuildableMid: Math.round(netMid.reduce((a, b) => a + b, 0)),
    totalNetBuildableMax: submarkets.reduce((a, s) => a + s.netBuildableAcresMax, 0),
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
        ? submarkets.reduce((a, s) => a + s.projectedCagr, 0) / submarkets.length
        : 0,
    earliestDepletion: depletionYears[0] ?? null,
    latestDepletion: depletionYears[depletionYears.length - 1] ?? null,
    orNetBuildable: submarkets
      .filter((s) => s.state === "OR")
      .reduce((a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2, 0),
    waNetBuildable: submarkets
      .filter((s) => s.state === "WA")
      .reduce((a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2, 0),
  };

  return <GorgeApp submarkets={submarkets} listings={listings} stats={stats} />;
}

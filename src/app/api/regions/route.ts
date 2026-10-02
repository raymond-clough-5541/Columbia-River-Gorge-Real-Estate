import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/regions
// Optional query params: wave=core|pnw|usa|canada, status=live|scaffold|planned|research
// Returns the expansion registry with per-region submarket aggregates.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wave = searchParams.get("wave");
    const status = searchParams.get("status");

    const where: Record<string, string> = {};
    if (wave === "core" || wave === "pnw" || wave === "usa" || wave === "canada")
      where.wave = wave;
    if (
      status === "live" ||
      status === "scaffold" ||
      status === "planned" ||
      status === "research"
    )
      where.status = status;

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

    return NextResponse.json({
      count: regions.length,
      data: regions.map((r) => {
        const markets = r.submarkets;
        const baselines = markets
          .map((s) => s.baselinePrice2026)
          .sort((a, b) => a - b);
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
          launchedAt: r.launchedAt ? r.launchedAt.toISOString() : null,
          aggregate:
            markets.length > 0
              ? {
                  marketCount: markets.length,
                  listingCount: markets.reduce(
                    (a, s) => a + s.listings.length,
                    0
                  ),
                  netBuildableMid: Math.round(
                    markets.reduce(
                      (a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2,
                      0
                    )
                  ),
                  averageCagr:
                    markets.reduce((a, s) => a + s.projectedCagr, 0) /
                    markets.length,
                  medianBaseline:
                    baselines.length % 2 === 0
                      ? (baselines[mid - 1] + baselines[mid]) / 2
                      : baselines[mid],
                }
              : null,
        };
      }),
    });
  } catch (err) {
    console.error("GET /api/regions failed:", err);
    return NextResponse.json(
      { error: "Failed to load regions" },
      { status: 500 }
    );
  }
}

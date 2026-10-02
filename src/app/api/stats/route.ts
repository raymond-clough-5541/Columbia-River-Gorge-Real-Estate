import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stats — corridor-level aggregates for the executive dashboard
export async function GET() {
  try {
    const submarkets = await db.submarket.findMany();
    const listingCount = await db.propertyListing.count();

    if (submarkets.length === 0) {
      return NextResponse.json({
        data: {
          submarketCount: 0,
          listingCount: 0,
          totalNetBuildableMid: 0,
          totalGrossVacant: 0,
          regionalMedianPrice: 0,
          averageCagr: 0,
          earliestDepletion: null,
          latestDepletion: null,
        },
      });
    }

    const netMid = submarkets.map(
      (s) => (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2
    );
    const totalNetBuildableMid = netMid.reduce((a, b) => a + b, 0);
    const totalGrossVacant = submarkets.reduce(
      (a, s) => a + s.grossVacantAcres,
      0
    );

    const baselines = submarkets
      .map((s) => s.baselinePrice2026)
      .sort((a, b) => a - b);
    const mid = Math.floor(baselines.length / 2);
    const regionalMedianPrice =
      baselines.length % 2 === 0
        ? (baselines[mid - 1] + baselines[mid]) / 2
        : baselines[mid];

    const averageCagr =
      submarkets.reduce((a, s) => a + s.projectedCagr, 0) / submarkets.length;

    const depletionYears = submarkets
      .map((s) => s.depletionYear)
      .sort((a, b) => a - b);

    return NextResponse.json({
      data: {
        submarketCount: submarkets.length,
        listingCount,
        totalNetBuildableMid: Math.round(totalNetBuildableMid),
        totalNetBuildableMin: submarkets.reduce(
          (a, s) => a + s.netBuildableAcresMin,
          0
        ),
        totalNetBuildableMax: submarkets.reduce(
          (a, s) => a + s.netBuildableAcresMax,
          0
        ),
        totalGrossVacant: Math.round(totalGrossVacant),
        regionalMedianPrice,
        averageCagr,
        earliestDepletion: depletionYears[0],
        latestDepletion: depletionYears[depletionYears.length - 1],
        orNetBuildable: submarkets
          .filter((s) => s.state === "OR")
          .reduce((a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2, 0),
        waNetBuildable: submarkets
          .filter((s) => s.state === "WA")
          .reduce((a, s) => a + (s.netBuildableAcresMin + s.netBuildableAcresMax) / 2, 0),
      },
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json(
      { error: "Failed to load corridor stats" },
      { status: 500 }
    );
  }
}

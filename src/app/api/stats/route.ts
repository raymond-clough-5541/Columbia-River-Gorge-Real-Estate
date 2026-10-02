import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  computeRegionStats,
  DEFAULT_REGION_SLUG,
  type JurisdictionType,
  type StateCode,
  type Submarket,
} from "@/lib/gorge";

export const dynamic = "force-dynamic";

// GET /api/stats — regional aggregates for the executive dashboard.
// Query params: region (slug — scopes to a registry region; default the
// corridor, which also inherits legacy unattached rows).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region") ?? DEFAULT_REGION_SLUG;

    const regionRow = await db.region.findUnique({
      where: { slug: region },
      select: { id: true, slug: true },
    });

    // Unknown region slug → empty ledger, not a blended one.
    const submarketRows = regionRow
      ? await db.submarket.findMany({
          where:
            region === DEFAULT_REGION_SLUG
              ? { OR: [{ regionId: regionRow.id }, { regionId: null }] }
              : { regionId: regionRow.id },
        })
      : [];
    const submarkets: Submarket[] = submarketRows.map((s) => ({
      ...s,
      state: s.state as StateCode,
      jurisdictionType: s.jurisdictionType as JurisdictionType,
    }));

    const listingCount = regionRow
      ? await db.propertyListing.count({
          where:
            region === DEFAULT_REGION_SLUG
              ? {
                  submarket: {
                    OR: [{ regionId: regionRow.id }, { regionId: null }],
                  },
                }
              : { submarket: { regionId: regionRow.id } },
        })
      : 0;

    return NextResponse.json({
      data: computeRegionStats(submarkets, listingCount),
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json(
      { error: "Failed to load regional stats" },
      { status: 500 }
    );
  }
}

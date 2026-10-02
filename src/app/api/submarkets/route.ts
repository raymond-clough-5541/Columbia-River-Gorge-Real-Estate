import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_REGION_SLUG } from "@/lib/gorge";

export const dynamic = "force-dynamic";

// GET /api/submarkets
// Optional query params: region (slug — registry region scope, default
// corridor incl. legacy unattached rows), state=OR|WA, jurisdiction=
// Incorporated City|Unincorporated Urban Area|Unincorporated Rural Area
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const state = searchParams.get("state");
    const jurisdiction = searchParams.get("jurisdiction");

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

    return NextResponse.json({
      count: submarkets.length,
      data: submarkets.map((s) => ({
        ...s,
        listingCount: s.listings.length,
        listings: undefined,
      })),
    });
  } catch (err) {
    console.error("GET /api/submarkets failed:", err);
    return NextResponse.json(
      { error: "Failed to load submarkets" },
      { status: 500 }
    );
  }
}

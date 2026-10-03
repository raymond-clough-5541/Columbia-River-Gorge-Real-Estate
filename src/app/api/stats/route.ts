import { NextRequest, NextResponse } from "next/server";
import { getStatsData } from "@/lib/data-service";
import { DEFAULT_REGION_SLUG } from "@/lib/gorge";

export const dynamic = "force-dynamic";

// GET /api/stats — regional aggregates for the executive dashboard.
// Query params: region (slug — scopes to a registry region; default the
// corridor, which also inherits legacy unattached rows).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region") ?? DEFAULT_REGION_SLUG;

    const data = await getStatsData(region);

    return NextResponse.json({
      data,
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json(
      { error: "Failed to load regional stats" },
      { status: 500 }
    );
  }
}

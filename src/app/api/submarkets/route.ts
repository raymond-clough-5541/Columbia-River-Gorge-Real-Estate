import { NextRequest, NextResponse } from "next/server";
import { getSubmarketsData } from "@/lib/data-service";

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

    const data = await getSubmarketsData(region, state, jurisdiction);

    return NextResponse.json({
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("GET /api/submarkets failed:", err);
    return NextResponse.json(
      { error: "Failed to load submarkets" },
      { status: 500 }
    );
  }
}

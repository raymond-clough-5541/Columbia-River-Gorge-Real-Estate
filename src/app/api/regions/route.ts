import { NextRequest, NextResponse } from "next/server";
import { getRegionsData } from "@/lib/data-service";

export const dynamic = "force-dynamic";

// GET /api/regions
// Optional query params: wave=core|pnw|usa|canada, status=live|scaffold|planned|research
// Returns the expansion registry with per-region submarket aggregates.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wave = searchParams.get("wave");
    const status = searchParams.get("status");

    const data = await getRegionsData(wave, status);

    return NextResponse.json({
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("GET /api/regions failed:", err);
    return NextResponse.json(
      { error: "Failed to load regions" },
      { status: 500 }
    );
  }
}

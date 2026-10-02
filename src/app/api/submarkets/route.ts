import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/submarkets
// Optional query params: state=OR|WA, jurisdiction=Incorporated City|Unincorporated Urban Area
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");
    const jurisdiction = searchParams.get("jurisdiction");

    const where: Record<string, string> = {};
    if (state === "OR" || state === "WA") where.state = state;
    if (
      jurisdiction === "Incorporated City" ||
      jurisdiction === "Unincorporated Urban Area"
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

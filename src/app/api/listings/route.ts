import { NextRequest, NextResponse } from "next/server";
import { getListingsData } from "@/lib/data-service";

export const dynamic = "force-dynamic";

// GET /api/listings
// Query params: region (slug — scopes to a registry region, default the
// corridor incl. legacy unattached rows), submarket (slug), type, minPrice,
// maxPrice, minAcreage, featured, q (search), sort
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const submarket = searchParams.get("submarket");
    const type = searchParams.get("type");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minAcreage = searchParams.get("minAcreage");
    const featured = searchParams.get("featured");
    const q = searchParams.get("q");
    const sort = searchParams.get("sort") ?? "price-desc";

    const listings = await getListingsData({
      region,
      submarket,
      type,
      minPrice,
      maxPrice,
      minAcreage,
      featured,
      q,
      sort,
    });

    return NextResponse.json({ count: listings.length, data: listings });
  } catch (err) {
    console.error("GET /api/listings failed:", err);
    return NextResponse.json(
      { error: "Failed to load listings" },
      { status: 500 }
    );
  }
}

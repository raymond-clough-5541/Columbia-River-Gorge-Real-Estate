import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_REGION_SLUG } from "@/lib/gorge";
import type { Prisma } from "@prisma/client";

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

    const where: Prisma.PropertyListingWhereInput = {};
    // Submarket-scope filter — composes the region scope (round 15) with an
    // optional explicit slug. For the DEFAULT region the scope also inherits
    // legacy unattached rows (regionId null) so pre-registry data never
    // falls out of the API's contract.
    const submarketWhere: Prisma.SubmarketWhereInput = {};
    if (region) {
      if (region === DEFAULT_REGION_SLUG) {
        submarketWhere.OR = [{ region: { slug: region } }, { regionId: null }];
      } else {
        submarketWhere.region = { slug: region };
      }
    }
    if (submarket) submarketWhere.slug = submarket;
    if (Object.keys(submarketWhere).length > 0) where.submarket = submarketWhere;
    if (type) where.propertyType = type;
    if (featured === "true") where.featured = true;

    const priceFilter: Prisma.FloatFilter = {};
    if (minPrice && !Number.isNaN(Number(minPrice)))
      priceFilter.gte = Number(minPrice);
    if (maxPrice && !Number.isNaN(Number(maxPrice)))
      priceFilter.lte = Number(maxPrice);
    if (priceFilter.gte !== undefined || priceFilter.lte !== undefined)
      where.price = priceFilter;

    if (minAcreage && !Number.isNaN(Number(minAcreage)))
      where.acreage = { gte: Number(minAcreage) };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { zoningCode: { contains: q } },
        { submarket: { name: { contains: q } } },
      ];
    }

    const orderBy: Prisma.PropertyListingOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "acreage-desc"
          ? { acreage: "desc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : { createdAt: "desc" };

    const listings = await db.propertyListing.findMany({
      where,
      orderBy,
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
            baselinePrice2026: true,
          },
        },
      },
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

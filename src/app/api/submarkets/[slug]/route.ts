import { NextRequest, NextResponse } from "next/server";
import { getSubmarketBySlug } from "@/lib/data-service";

export const dynamic = "force-dynamic";

// GET /api/submarkets/[slug] — one micro-market with its listings
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const submarket = await getSubmarketBySlug(slug);

    if (!submarket) {
      return NextResponse.json(
        { error: `No submarket found for slug '${slug}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: submarket });
  } catch (err) {
    console.error("GET /api/submarkets/[slug] failed:", err);
    return NextResponse.json(
      { error: "Failed to load submarket" },
      { status: 500 }
    );
  }
}

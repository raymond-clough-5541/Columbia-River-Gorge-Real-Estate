import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/submarkets/[slug] — one micro-market with its listings
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const submarket = await db.submarket.findUnique({
      where: { slug },
      include: {
        listings: { orderBy: { price: "desc" } },
      },
    });

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

import { NextResponse } from "next/server";
import { fetchMarketOverview } from "@/lib/marketOverview";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchMarketOverview();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Market overview error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch market overview" },
      { status: 500 }
    );
  }
}

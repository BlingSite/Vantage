import { getTickerOverview } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/ticker?symbol=AAPL
 *
 * Returns Massive.com ticker overview — company name, description, market cap,
 * branding URLs, industry classification, etc.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (!symbol) {
      return NextResponse.json(
        { error: "Missing symbol query parameter" },
        { status: 400 }
      );
    }

    const overview = await getTickerOverview(symbol);

    return NextResponse.json({
      symbol: overview.ticker ?? symbol,
      name: overview.name ?? null,
      description: overview.description ?? null,
      market_cap: overview.market_cap ?? null,
      homepage_url: overview.homepage_url ?? null,
      total_employees: overview.total_employees ?? null,
      sic_description: overview.sic_description ?? null,
      primary_exchange: overview.primary_exchange ?? null,
      list_date: overview.list_date ?? null,
      branding: overview.branding ?? null,
      active: overview.active ?? null,
    });
  } catch (err) {
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 }
      );
    }
    console.error("Massive ticker overview error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch ticker overview" },
      { status: 500 }
    );
  }
}

import { searchTickers } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/search?q=apple&limit=10
 *
 * Searches Massive.com tickers by name or symbol.
 * Returns matching tickers with name, market, and active status.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json(
        { error: "Missing q query parameter" },
        { status: 400 }
      );
    }
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "10", 10) || 10,
      50
    );
    const market = searchParams.get("market") || "stocks";

    const data = await searchTickers({
      search: q,
      market,
      active: true,
      limit,
    });

    const results = (data?.results ?? []).map((t) => ({
      symbol: t.ticker,
      name: t.name,
      market: t.market,
      type: t.type,
      primary_exchange: t.primary_exchange,
      active: t.active,
    }));

    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 }
      );
    }
    console.error("Massive search error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to search tickers" },
      { status: 500 }
    );
  }
}

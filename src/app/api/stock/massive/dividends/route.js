import { getDividends, getDividendYield, getSnapshot } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/dividends?symbols=AAPL,MSFT
 *
 * Returns dividend yield (%) for each symbol, computed from Massive.com
 * dividend history and current snapshot price.
 *
 * Response: { "AAPL": 0.52, "MSFT": 0.71, ... }
 *
 * Also supports single ticker with full dividend history:
 * GET /api/stock/massive/dividends?symbol=AAPL&detail=true
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const detail = searchParams.get("detail") === "true";
    const singleSymbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (detail && singleSymbol) {
      const data = await getDividends(singleSymbol, {
        limit: 50,
        sort: "ex_dividend_date",
        order: "desc",
      });
      return NextResponse.json(data);
    }

    const symbolsParam =
      searchParams.get("symbols") ?? searchParams.get("symbol");
    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Missing symbols query parameter (comma-separated)" },
        { status: 400 }
      );
    }
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 30);

    if (symbols.length === 0) {
      return NextResponse.json({});
    }

    const snapResults = await Promise.allSettled(
      symbols.map((s) => getSnapshot(s))
    );
    const prices = {};
    symbols.forEach((s, i) => {
      const r = snapResults[i];
      if (r.status === "fulfilled" && r.value) {
        prices[s] = r.value.day?.c ?? r.value.lastTrade?.p ?? null;
      } else if (r.status === "rejected") {
        console.error(`[MassiveDiv] snapshot failed for ${s}:`, r.reason?.message);
      }
    });
    console.log("[MassiveDiv] prices:", JSON.stringify(prices));

    const yieldResults = await Promise.allSettled(
      symbols.map((s) =>
        prices[s] != null
          ? getDividendYield(s, prices[s])
          : Promise.resolve(null)
      )
    );

    const payload = {};
    symbols.forEach((s, i) => {
      const r = yieldResults[i];
      payload[s] =
        r.status === "fulfilled" && r.value != null
          ? Number(r.value.toFixed(4))
          : null;
    });

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 }
      );
    }
    console.error("Massive dividends error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch dividends" },
      { status: 500 }
    );
  }
}

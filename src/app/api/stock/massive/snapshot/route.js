import { getSnapshot } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/snapshot?symbols=AAPL,MSFT,GOOG
 *
 * Returns Massive.com snapshot data for multiple symbols.
 * Each symbol includes current price, today's change, volume, and prev-day bar.
 *
 * Response shape (keyed by symbol):
 * {
 *   "AAPL": {
 *     c: 185.50,        // current price (day close so far)
 *     d: 1.25,          // today's change ($)
 *     dp: 0.68,         // today's change (%)
 *     v: 52340000,      // today's volume
 *     h: 186.10,        // day high
 *     l: 183.90,        // day low
 *     o: 184.20,        // day open
 *     pc: 184.25,       // previous close
 *   }
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");
    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Missing symbols query parameter (comma-separated)" },
        { status: 400 }
      );
    }
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (symbols.length === 0) {
      return NextResponse.json({});
    }

    const limited = symbols.slice(0, 30);
    const results = await Promise.allSettled(
      limited.map((symbol) => getSnapshot(symbol))
    );

    const payload = {};
    limited.forEach((symbol, i) => {
      const r = results[i];
      if (r.status !== "fulfilled" || !r.value) return;
      const snap = r.value;
      const day = snap.day ?? {};
      const prevDay = snap.prevDay ?? {};
      const prevClose = prevDay.c ?? null;
      const currentPrice = day.c ?? snap.lastTrade?.p ?? null;

      const change = currentPrice != null && prevClose != null ? currentPrice - prevClose : null;
      const changePerc = change != null && prevClose ? (change / prevClose) * 100 : null;

      payload[symbol] = {
        c: currentPrice,
        d: change,
        dp: changePerc,
        v: day.v ?? snap.min?.av ?? prevDay.v ?? null,
        h: day.h ?? null,
        l: day.l ?? null,
        o: day.o ?? null,
        pc: prevClose,
      };
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
    console.error("Massive snapshot error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}

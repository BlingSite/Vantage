import { getAverageVolume } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/avg-volume?symbols=AAPL,MSFT,GOOG
 *
 * Returns 30-day average daily volume for each symbol.
 * Response: { "AAPL": 52340000, "MSFT": 28100000, ... }
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
      .filter(Boolean)
      .slice(0, 30);

    if (symbols.length === 0) {
      return NextResponse.json({});
    }

    const results = await Promise.allSettled(
      symbols.map((s) => getAverageVolume(s))
    );

    const payload = {};
    symbols.forEach((s, i) => {
      const r = results[i];
      payload[s] =
        r.status === "fulfilled" && r.value != null ? r.value : null;
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
    console.error("Massive avg-volume error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch average volume" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCustomBars, getTickerOverview } from "@/lib/massive";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/technicals?symbols=AAPL,MSFT
 *
 * Per-symbol technicals from Massive.com bars + ticker overview (no third-party APIs).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");
    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Missing symbols query parameter" },
        { status: 400 }
      );
    }

    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20);

    if (symbols.length === 0) {
      return NextResponse.json({});
    }

    const today = new Date().toISOString().slice(0, 10);
    const oneYearAgo = new Date(Date.now() - 400 * 86400000)
      .toISOString()
      .slice(0, 10);

    const perSymbol = await Promise.all(
      symbols.map(async (symbol) => {
        const [barsResult, overviewResult] = await Promise.allSettled([
          getCustomBars(symbol, {
            timespan: "day",
            from: oneYearAgo,
            to: today,
            limit: 300,
            sort: "asc",
          }),
          getTickerOverview(symbol),
        ]);

        const bars =
          barsResult.status === "fulfilled"
            ? barsResult.value?.results ?? []
            : [];
        const overview =
          overviewResult.status === "fulfilled"
            ? overviewResult.value ?? {}
            : {};

        const closes = bars.map((b) => b.c).filter((c) => c != null);
        const highs = bars.map((b) => b.h).filter((h) => h != null);
        const lows = bars.map((b) => b.l).filter((l) => l != null);

        const slice = highs.length >= 5 ? 252 : highs.length;
        const week52High =
          highs.length > 0 ? Math.max(...highs.slice(-slice)) : null;
        const week52Low =
          lows.length > 0 ? Math.min(...lows.slice(-slice)) : null;

        const rsi = computeRSI(closes, 14);
        const sma50 = computeSMA(closes, 50);
        const sma200 = computeSMA(closes, 200);

        const currentPrice =
          closes.length > 0 ? closes[closes.length - 1] : null;

        const marketCap =
          overview.market_cap != null ? overview.market_cap / 1e6 : null;

        const peRatio =
          overview.pe_ratio ??
          overview.price_earnings_ratio ??
          overview.pe ??
          null;

        const beta = overview.beta ?? null;

        const { support, resistance } = computeSupportResistance(
          bars.slice(-60),
          currentPrice
        );

        return [
          symbol,
          {
            currentPrice,
            week52High,
            week52Low,
            rsi,
            sma50,
            sma200,
            marketCap,
            peRatio,
            beta,
            support,
            resistance,
          },
        ];
      })
    );

    const payload = Object.fromEntries(perSymbol);
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("Technicals error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch technicals" },
      { status: 500 }
    );
  }
}

function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const idx = closes.length - period - 1 + i;
    const delta = closes[idx] - closes[idx - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

function computeSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / period).toFixed(2));
}

function computeSupportResistance(bars, currentPrice) {
  if (!bars || bars.length < 5 || currentPrice == null) {
    return { support: null, resistance: null };
  }
  const pivots = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const h = bars[i].h;
    const l = bars[i].l;
    if (
      h != null &&
      h >= (bars[i - 1].h ?? 0) &&
      h >= (bars[i - 2].h ?? 0) &&
      h >= (bars[i + 1].h ?? 0) &&
      h >= (bars[i + 2].h ?? 0)
    ) {
      pivots.push({ type: "high", value: h });
    }
    if (
      l != null &&
      l <= (bars[i - 1].l ?? Infinity) &&
      l <= (bars[i - 2].l ?? Infinity) &&
      l <= (bars[i + 1].l ?? Infinity) &&
      l <= (bars[i + 2].l ?? Infinity)
    ) {
      pivots.push({ type: "low", value: l });
    }
  }
  const supportLevels = pivots
    .filter((p) => p.value < currentPrice)
    .sort((a, b) => b.value - a.value);
  const resistanceLevels = pivots
    .filter((p) => p.value > currentPrice)
    .sort((a, b) => a.value - b.value);
  return {
    support:
      supportLevels.length > 0
        ? Number(supportLevels[0].value.toFixed(2))
        : null,
    resistance:
      resistanceLevels.length > 0
        ? Number(resistanceLevels[0].value.toFixed(2))
        : null,
  };
}

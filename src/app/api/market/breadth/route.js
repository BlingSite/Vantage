import { getFullMarketSnapshot } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function buildBreadth(tickers, { usePrevDay = false } = {}) {
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let totalVolume = 0;
  let advancerVolume = 0;
  let declinerVolume = 0;

  const topAdvancers = [];
  const topDecliners = [];

  for (const t of tickers) {
    let change, vol, price;

    if (usePrevDay) {
      const pd = t.prevDay;
      if (!pd || pd.o == null || pd.c == null || pd.o === 0) continue;
      change = ((pd.c - pd.o) / pd.o) * 100;
      vol = pd.v ?? 0;
      price = pd.c;
    } else {
      change = t.todaysChangePerc ?? 0;
      vol = t.day?.v ?? 0;
      price = t.day?.c ?? t.lastTrade?.p ?? null;
    }

    totalVolume += vol;

    if (change > 0) {
      advancers++;
      advancerVolume += vol;
      topAdvancers.push({ symbol: t.ticker, changePercent: change, price, volume: vol });
    } else if (change < 0) {
      decliners++;
      declinerVolume += vol;
      topDecliners.push({ symbol: t.ticker, changePercent: change, price, volume: vol });
    } else {
      unchanged++;
    }
  }

  topAdvancers.sort((a, b) => b.changePercent - a.changePercent);
  topDecliners.sort((a, b) => a.changePercent - b.changePercent);

  const total = advancers + decliners + unchanged;
  const adRatio =
    decliners > 0 ? Number((advancers / decliners).toFixed(2)) : null;

  return {
    advancers,
    decliners,
    unchanged,
    total,
    adRatio,
    advancerVolume,
    declinerVolume,
    totalVolume,
    topAdvancers: topAdvancers.slice(0, 5),
    topDecliners: topDecliners.slice(0, 5),
  };
}

export async function GET() {
  try {
    const data = await getFullMarketSnapshot();
    const tickers = data?.tickers ?? [];

    let result = buildBreadth(tickers);
    let prevDay = false;

    if (result.advancers === 0 && result.decliners === 0 && tickers.length > 0) {
      result = buildBreadth(tickers, { usePrevDay: true });
      prevDay = true;
    }

    return NextResponse.json({
      ...result,
      prevDay,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Market breadth error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch market breadth" },
      { status: 500 },
    );
  }
}

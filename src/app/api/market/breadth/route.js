import { getFullMarketSnapshot } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFullMarketSnapshot();
    const tickers = data?.tickers ?? [];

    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let totalVolume = 0;
    let advancerVolume = 0;
    let declinerVolume = 0;

    const topAdvancers = [];
    const topDecliners = [];

    for (const t of tickers) {
      const change = t.todaysChangePerc ?? 0;
      const vol = t.day?.v ?? 0;
      totalVolume += vol;

      if (change > 0) {
        advancers++;
        advancerVolume += vol;
        topAdvancers.push({
          symbol: t.ticker,
          changePercent: t.todaysChangePerc,
          price: t.day?.c ?? t.lastTrade?.p ?? null,
          volume: vol,
        });
      } else if (change < 0) {
        decliners++;
        declinerVolume += vol;
        topDecliners.push({
          symbol: t.ticker,
          changePercent: t.todaysChangePerc,
          price: t.day?.c ?? t.lastTrade?.p ?? null,
          volume: vol,
        });
      } else {
        unchanged++;
      }
    }

    topAdvancers.sort((a, b) => b.changePercent - a.changePercent);
    topDecliners.sort((a, b) => a.changePercent - b.changePercent);

    const total = advancers + decliners + unchanged;
    const adRatio =
      decliners > 0 ? Number((advancers / decliners).toFixed(2)) : null;

    return NextResponse.json({
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

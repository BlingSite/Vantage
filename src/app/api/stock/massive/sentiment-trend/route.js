import { getMarketNews, getCustomBars } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Paginate through Massive news API using next_url cursor.
 * Returns all articles from the given date range.
 */
async function fetchAllNewsForPeriod(fromDate) {
  const allArticles = [];

  const firstPage = await getMarketNews({
    limit: 1000,
    published_utc_gte: fromDate,
    order: "desc",
    sort: "published_utc",
  });

  allArticles.push(...(firstPage?.results ?? []));

  let nextUrl = firstPage?.next_url;
  let pages = 0;

  while (nextUrl && pages < 5) {
    pages++;
    try {
      const url = new URL(nextUrl);
      if (!url.searchParams.has("apiKey")) {
        url.searchParams.set("apiKey", process.env.MASSIVE_API_KEY);
      }
      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) break;
      const data = await res.json();
      allArticles.push(...(data?.results ?? []));
      nextUrl = data?.next_url || null;
    } catch {
      break;
    }
  }

  return allArticles;
}

function scoreSentiment(sentiment) {
  const s = sentiment?.toLowerCase();
  if (s === "positive" || s === "bullish") return 1;
  if (s === "negative" || s === "bearish") return -1;
  return 0;
}

function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);
  const sumY2 = ys.reduce((s, v) => s + v * v, 0);
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  return den !== 0 ? (n * sumXY - sumX * sumY) / den : 0;
}

/**
 * GET /api/stock/massive/sentiment-trend
 *
 * Computes a 30-day sentiment trend from U.S. stock market news:
 *  - Fetches all news articles from the last 30 days
 *  - Scores each article's sentiment insights (-1 to +1)
 *  - Aggregates daily average sentiment
 *  - Identifies spikes (>2 standard deviations from mean)
 *  - Cross-references with SPY daily returns and volume
 *  - Computes Pearson correlation between sentiment and SPY returns
 */
export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const toDate = now.toISOString().slice(0, 10);

    const [rawArticles, spyData] = await Promise.all([
      fetchAllNewsForPeriod(fromDate),
      getCustomBars("SPY", {
        timespan: "day",
        from: fromDate,
        to: toDate,
        sort: "asc",
        limit: 50,
      }),
    ]);

    // Score each article based on its sentiment insights
    const scored = rawArticles.map((a) => {
      const insights = a.insights ?? [];
      const scores = insights.map((i) => scoreSentiment(i.sentiment));
      const avg =
        scores.length > 0
          ? scores.reduce((s, v) => s + v, 0) / scores.length
          : 0;
      return { date: a.published_utc?.slice(0, 10), score: avg };
    });

    // Aggregate by date
    const dailyMap = {};
    for (const a of scored) {
      if (!a.date) continue;
      if (!dailyMap[a.date]) dailyMap[a.date] = { scores: [], count: 0 };
      dailyMap[a.date].scores.push(a.score);
      dailyMap[a.date].count++;
    }

    const dailySentiment = Object.entries(dailyMap)
      .map(([date, { scores, count }]) => ({
        date,
        avgSentiment: scores.reduce((s, v) => s + v, 0) / scores.length,
        articleCount: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Statistics
    const vals = dailySentiment.map((d) => d.avgSentiment);
    const mean = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const variance =
      vals.length > 0
        ? vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
        : 0;
    const stdDev = Math.sqrt(variance);

    // Process SPY bars
    const spyBars = (spyData?.results ?? []).map((bar) => ({
      date: new Date(bar.t).toISOString().slice(0, 10),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));

    const spyReturns = spyBars.map((bar, i) => ({
      ...bar,
      dailyReturn:
        i > 0
          ? ((bar.close - spyBars[i - 1].close) / spyBars[i - 1].close) * 100
          : 0,
    }));

    const spyByDate = {};
    for (const bar of spyReturns) {
      spyByDate[bar.date] = bar;
    }

    // Merge datasets
    const combined = dailySentiment.map((d) => {
      const spy = spyByDate[d.date];
      const isSpike = stdDev > 0 && Math.abs(d.avgSentiment - mean) > 2 * stdDev;
      return {
        date: d.date,
        avgSentiment: Number(d.avgSentiment.toFixed(4)),
        articleCount: d.articleCount,
        spyClose: spy?.close ?? null,
        spyReturn: spy?.dailyReturn != null ? Number(spy.dailyReturn.toFixed(4)) : null,
        spyVolume: spy?.volume ?? null,
        isSpike,
        spikeDirection: isSpike
          ? d.avgSentiment > mean
            ? "positive"
            : "negative"
          : null,
      };
    });

    // Spikes
    const spikes = combined
      .filter((d) => d.isSpike)
      .map((d) => ({
        date: d.date,
        avgSentiment: d.avgSentiment,
        deviation: stdDev > 0 ? Number(((d.avgSentiment - mean) / stdDev).toFixed(2)) : 0,
        direction: d.spikeDirection,
        spyReturn: d.spyReturn,
        articleCount: d.articleCount,
      }));

    // Correlation
    const paired = combined.filter((d) => d.spyReturn != null);
    const correlation =
      paired.length > 2
        ? pearsonCorrelation(
            paired.map((d) => d.avgSentiment),
            paired.map((d) => d.spyReturn)
          )
        : null;

    const res = NextResponse.json({
      combined,
      stats: {
        mean: Number(mean.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        totalArticles: scored.length,
        daysAnalyzed: dailySentiment.length,
        spikeCount: spikes.length,
        upperBound: Number((mean + 2 * stdDev).toFixed(4)),
        lowerBound: Number((mean - 2 * stdDev).toFixed(4)),
        correlation: correlation != null ? Number(correlation.toFixed(4)) : null,
      },
      spikes,
      dateRange: { from: fromDate, to: toDate },
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 },
      );
    }
    console.error("Sentiment trend error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compute sentiment trend" },
      { status: 500 },
    );
  }
}

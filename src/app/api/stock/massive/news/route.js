import { getMarketNews } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/news?limit=50
 *
 * Returns recent U.S. market news articles from the past 7 days.
 * Each article includes tickers, headline, publisher, published timestamp,
 * and per-ticker sentiment insights.
 *
 * Also computes:
 *  - overallTone: "bullish" | "bearish" | "neutral"
 *  - topTickers: most frequently mentioned tickers (with counts)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10) || 50,
      100
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

    const data = await getMarketNews({
      limit,
      published_utc_gte: fromDate,
      order: "desc",
      sort: "published_utc",
    });

    const articles = (data?.results ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      publisher: a.publisher?.name ?? null,
      publisherLogo: a.publisher?.logo_url ?? null,
      publishedUtc: a.published_utc,
      articleUrl: a.article_url,
      imageUrl: a.image_url ?? null,
      tickers: a.tickers ?? [],
      description: a.description ?? null,
      insights: (a.insights ?? []).map((ins) => ({
        ticker: ins.ticker,
        sentiment: ins.sentiment,
        sentimentReasoning: ins.sentiment_reasoning,
      })),
    }));

    // --- Compute overall market tone from sentiment insights ---
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    for (const a of articles) {
      for (const ins of a.insights) {
        const s = ins.sentiment?.toLowerCase();
        if (s === "positive" || s === "bullish") positive++;
        else if (s === "negative" || s === "bearish") negative++;
        else neutral++;
      }
    }
    const total = positive + negative + neutral;
    let overallTone = "neutral";
    if (total > 0) {
      if (positive > negative * 1.3) overallTone = "bullish";
      else if (negative > positive * 1.3) overallTone = "bearish";
    }

    // --- Top tickers by mention frequency ---
    const tickerCounts = {};
    for (const a of articles) {
      for (const t of a.tickers) {
        tickerCounts[t] = (tickerCounts[t] || 0) + 1;
      }
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker, count]) => ({ ticker, count }));

    const res = NextResponse.json({
      count: articles.length,
      articles,
      overallTone,
      sentimentBreakdown: { positive, negative, neutral, total },
      topTickers,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 }
      );
    }
    console.error("Massive news error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch news" },
      { status: 500 }
    );
  }
}

import { getMarketNews } from "@/lib/massive";
import { chat } from "@/lib/openai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Task description embedded in the model instructions */
const SUMMARIZER_PROMPT =
  "Fetches headlines and returns a bullish/bearish sentiment score + summary per ticker or sector, with citations.";

export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

    const data = await getMarketNews({
      limit: 45,
      published_utc_gte: fromDate,
      order: "desc",
      sort: "published_utc",
    });

    const articles = (data?.results ?? []).map((a) => ({
      title: a.title,
      publisher: a.publisher?.name ?? null,
      publishedUtc: a.published_utc,
      url: a.article_url,
      tickers: a.tickers ?? [],
      insights: (a.insights ?? []).map((ins) => ({
        ticker: ins.ticker,
        sentiment: ins.sentiment,
      })),
    }));

    if (articles.length === 0) {
      return NextResponse.json({
        prompt: SUMMARIZER_PROMPT,
        headlineCount: 0,
        items: [],
        rawNote: "No headlines available in the selected window.",
      });
    }

    const headlinesPayload = articles.map((a) => ({
      title: a.title,
      url: a.url,
      publisher: a.publisher,
      publishedUtc: a.publishedUtc,
      tickers: a.tickers,
      tickerSentiments: a.insights,
    }));

    const system = `You are a financial news analyst. You receive a JSON array of real market headlines with URLs and tickers.

Your job: ${SUMMARIZER_PROMPT}

Output ONLY valid JSON (no markdown fences, no commentary) with this exact structure:
{"items":[{"kind":"ticker"|"sector","label":"string (ticker symbol like AAPL, or sector name like Technology)","sentiment":"bullish"|"bearish"|"neutral","score":number from -1 (very bearish) to 1 (very bullish),"summary":"1-3 sentences","citations":[{"title":"string (must match a headline title from the input exactly)","url":"string (must match the input url for that headline)"}]}]}

Rules:
- Every citation title and url MUST come from the provided headlines only.
- Prefer tickers mentioned in multiple stories; add sector-level rows when several headlines imply the same industry theme.
- At most 12 items; order by importance (mention volume / market impact).
- score must be consistent with sentiment (bullish > 0, bearish < 0, neutral near 0).`;

    const user = `Task: ${SUMMARIZER_PROMPT}

Headlines (JSON):
${JSON.stringify(headlinesPayload)}`;

    const raw = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      {
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      }
    );

    let items = [];
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed.items)) items = parsed.items;
    } catch (e) {
      console.error("News sentiment JSON parse error:", e, raw?.slice?.(0, 500));
    }

    const res = NextResponse.json({
      prompt: SUMMARIZER_PROMPT,
      headlineCount: articles.length,
      items,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    if (err.message?.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "OpenAI is not configured" },
        { status: 503 }
      );
    }
    if (err.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured with Massive API key" },
        { status: 503 }
      );
    }
    console.error("News sentiment summarizer error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to summarize news sentiment" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getTickerNews, getDividends } from "@/lib/massive";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/news-intel?symbols=AAPL,MSFT
 *
 * Per-symbol intelligence from Massive.com only (headlines + dividend dates).
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
      .slice(0, 20);

    if (symbols.length === 0) {
      return NextResponse.json({});
    }

    const today = new Date().toISOString().slice(0, 10);

    const perSymbol = await Promise.all(
      symbols.map(async (symbol) => {
        const [news, dividends] = await Promise.allSettled([
          getTickerNews(symbol, { limit: 5 }),
          getDividends(symbol, {
            limit: 5,
            sort: "ex_dividend_date",
            order: "desc",
          }),
        ]);

        return [
          symbol,
          {
            news: formatMassiveNews(news),
            earningsDate: null,
            upcomingDividend: formatDividend(dividends, today),
            upgrades: [],
            insiderTrades: [],
          },
        ];
      })
    );

    const payload = Object.fromEntries(perSymbol);
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("News intel error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch news intel" },
      { status: 500 }
    );
  }
}

function formatMassiveNews(result) {
  if (result.status !== "fulfilled") return [];
  const articles = result.value?.results ?? [];
  if (!Array.isArray(articles)) return [];
  return articles.slice(0, 5).map((a) => ({
    title: a.title || a.headline || "",
    url: a.article_url || a.url || "",
    source: a.publisher?.name || a.source || "",
    date: a.published_utc || "",
  }));
}

function formatDividend(result, today) {
  if (result.status !== "fulfilled") return null;
  const divs = result.value?.results ?? result.value ?? [];
  if (!Array.isArray(divs)) return null;
  const upcoming = divs
    .filter((d) => {
      const exDate = d.ex_dividend_date || d.exDate;
      return exDate && exDate >= today;
    })
    .sort((a, b) =>
      (a.ex_dividend_date || a.exDate || "").localeCompare(
        b.ex_dividend_date || b.exDate || ""
      )
    );
  if (upcoming.length === 0) {
    const latest = divs[0];
    if (!latest) return null;
    return {
      exDate: latest.ex_dividend_date || latest.exDate || null,
      payDate: latest.pay_date || latest.payDate || null,
      amount: latest.cash_amount ?? latest.amount ?? null,
      upcoming: false,
    };
  }
  const next = upcoming[0];
  return {
    exDate: next.ex_dividend_date || next.exDate || null,
    payDate: next.pay_date || next.payDate || null,
    amount: next.cash_amount ?? next.amount ?? null,
    upcoming: true,
  };
}

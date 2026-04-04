import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSnapshot, getMarketNews } from "@/lib/massive";
import { chat } from "@/lib/openai";

export const dynamic = "force-dynamic";

const MAX_SYMBOLS = 30;

function snapshotToQuote(symbol, snap) {
  if (!snap) return { symbol, c: null, d: null, dp: null };
  const day = snap.day ?? {};
  const prevDay = snap.prevDay ?? {};
  const prevClose = prevDay.c ?? null;
  const currentPrice = day.c ?? snap.lastTrade?.p ?? null;
  const d =
    snap.todaysChange ??
    (currentPrice != null && prevClose != null
      ? currentPrice - prevClose
      : null);
  const dp = snap.todaysChangePerc ?? null;
  return { symbol, c: currentPrice, d, dp };
}

function buildContext(symbols, quotes, newsBySymbol) {
  const total = symbols.length;
  let up = 0;
  let down = 0;
  let flat = 0;
  let unknown = 0;
  const withDp = [];

  for (const sym of symbols) {
    const q = quotes[sym];
    const dp = q?.dp;
    if (dp == null || Number.isNaN(Number(dp))) {
      unknown++;
      continue;
    }
    const n = Number(dp);
    if (n > 0) up++;
    else if (n < 0) down++;
    else flat++;
    withDp.push({ symbol: sym, dp: n });
  }

  withDp.sort((a, b) => b.dp - a.dp);
  const topPerformer = withDp[0] ?? null;
  const worstPerformer = withDp.length ? withDp[withDp.length - 1] : null;

  const newsMentions = Object.entries(newsBySymbol)
    .map(([symbol, headline]) => ({ symbol, headline }))
    .slice(0, 5);

  return {
    total,
    up,
    down,
    flat,
    unknown,
    topPerformer,
    worstPerformer,
    newsMentions,
    quotes: symbols.map((s) => ({
      symbol: s,
      dp: quotes[s]?.dp ?? null,
    })),
  };
}

function buildFallbackSummary(ctx) {
  const { total, up, down, flat, unknown, topPerformer, newsMentions } = ctx;
  if (total === 0) return null;

  if (unknown === total && total > 0) {
    let s =
      "Live quote data for your watchlist is still loading or unavailable.";
    if (newsMentions.length > 0) {
      const names = newsMentions.slice(0, 3).map((n) => n.symbol);
      if (names.length === 1) {
        s += ` ${names[0]} still appears in recent headlines.`;
      } else {
        s += ` ${names.slice(0, 2).join(" and ")} appear in recent headlines.`;
      }
    }
    return s;
  }

  const stockWord = total === 1 ? "stock" : "stocks";
  let s = `${up} of your ${total} watched ${stockWord} ${up === 1 ? "is" : "are"} up today`;
  if (down > 0) {
    s += ` (${down} ${down === 1 ? "is" : "are"} down)`;
  }
  s += ".";

  if (topPerformer && topPerformer.dp != null) {
    const sign = topPerformer.dp >= 0 ? "+" : "";
    s += ` ${topPerformer.symbol} is your top performer at ${sign}${topPerformer.dp.toFixed(1)}%.`;
  }

  if (newsMentions.length > 0) {
    const names = newsMentions.slice(0, 3).map((n) => n.symbol);
    if (names.length === 1) {
      s += ` ${names[0]} is flagged in today's news.`;
    } else if (names.length === 2) {
      s += ` ${names[0]} and ${names[1]} are flagged in today's news.`;
    } else {
      s += ` ${names.slice(0, -1).join(", ")}, and ${
        names[names.length - 1]
      } are flagged in today's news.`;
    }
  }

  return s.trim();
}

async function generateAiSummary(ctx) {
  const system = `You are a concise investing assistant. You receive JSON with the user's watchlist stats (how many symbols are up/down today, best and worst performers by % change, and which tickers appear in recent headlines).

Write 2–4 short sentences of plain prose for "Today's highlights for your watchlist." Sound natural and direct, like the examples below.

Rules:
- Use ONLY tickers, counts, and percentages from the JSON. Never invent symbols or numbers.
- If many symbols lack percentage data, acknowledge uncertainty briefly rather than guessing.
- Mention at most two headline-related tickers; prefer those in newsMentions.
- No bullet points, no markdown, no greeting.`;

  const user = `Watchlist context (JSON):\n${JSON.stringify(ctx, null, 2)}`;

  const text = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 220,
    }
  );

  return text?.trim() || null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: watchlistsData, error: wlError } = await supabase
      .from("watchlists")
      .select("id, is_default, name")
      .order("created_at", { ascending: true });

    if (wlError) {
      console.error("watchlist-insight-summary watchlists:", wlError);
      return NextResponse.json(
        { status: "error", summary: null, message: "Could not load watchlists." },
        { status: 500 }
      );
    }

    if (!watchlistsData?.length) {
      const res = NextResponse.json({
        status: "empty",
        summary: null,
        message:
          "Create a watchlist to see personalized highlights based on your tickers.",
        authenticated: !!user,
      });
      res.headers.set("Cache-Control", "no-store, max-age=0");
      return res;
    }

    const active =
      watchlistsData.find((w) => w.is_default) ?? watchlistsData[0];

    const { data: itemsResult, error: itemsError } = await supabase
      .from("watchlist_items")
      .select("*, stocks(*)")
      .eq("watchlist_id", active.id);

    if (itemsError) {
      console.error("watchlist-insight-summary items:", itemsError);
      return NextResponse.json(
        { status: "error", summary: null, message: "Could not load watchlist symbols." },
        { status: 500 }
      );
    }

    const seen = new Set();
    const symbols = [];
    for (const item of itemsResult ?? []) {
      const sym = item.stocks?.symbol?.toUpperCase();
      if (!sym || seen.has(sym)) continue;
      seen.add(sym);
      symbols.push(sym);
      if (symbols.length >= MAX_SYMBOLS) break;
    }

    if (symbols.length === 0) {
      const res = NextResponse.json({
        status: "empty",
        summary: null,
        message: "Add tickers to your watchlist to see today's personalized highlights.",
        authenticated: !!user,
      });
      res.headers.set("Cache-Control", "no-store, max-age=0");
      return res;
    }

    const limited = symbols;
    const results = await Promise.allSettled(
      limited.map((symbol) => getSnapshot(symbol))
    );

    const quotes = {};
    limited.forEach((symbol, i) => {
      const r = results[i];
      if (r.status !== "fulfilled" || !r.value) return;
      const q = snapshotToQuote(symbol, r.value);
      quotes[symbol] = q;
    });

    const watchSet = new Set(limited);
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fromDate = twoDaysAgo.toISOString().slice(0, 10);

    let newsBySymbol = {};
    try {
      const newsData = await getMarketNews({
        limit: 80,
        published_utc_gte: fromDate,
        order: "desc",
        sort: "published_utc",
      });
      const articles = newsData?.results ?? [];
      const scored = [];
      for (const a of articles) {
        const tickers = a.tickers ?? [];
        for (const t of tickers) {
          const u = String(t).toUpperCase();
          if (!watchSet.has(u)) continue;
          scored.push({
            symbol: u,
            title: a.title,
            published: a.published_utc,
          });
        }
      }
      scored.sort(
        (a, b) =>
          new Date(b.published).getTime() - new Date(a.published).getTime()
      );
      const used = new Set();
      for (const row of scored) {
        if (used.has(row.symbol)) continue;
        used.add(row.symbol);
        newsBySymbol[row.symbol] = row.title;
        if (used.size >= 5) break;
      }
    } catch (e) {
      console.warn("watchlist-insight-summary news:", e?.message ?? e);
    }

    const ctx = buildContext(limited, quotes, newsBySymbol);
    const watchlistLabel = active.name ?? "Watchlist";

    const payloadCtx = {
      watchlistName: watchlistLabel,
      ...ctx,
    };

    let summary = null;
    let usedAi = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        summary = await generateAiSummary(payloadCtx);
        usedAi = !!summary;
      } catch (e) {
        console.error("watchlist-insight-summary AI:", e);
      }
    }

    if (!summary) {
      summary = buildFallbackSummary(ctx);
    }

    const res = NextResponse.json({
      status: "ok",
      summary,
      watchlistName: watchlistLabel,
      usedAi,
      authenticated: !!user,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    if (err?.message?.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { status: "error", summary: null, message: "AI is not configured." },
        { status: 503 }
      );
    }
    if (err?.message?.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        {
          status: "error",
          summary: null,
          message: "Market data is not available.",
        },
        { status: 503 }
      );
    }
    console.error("watchlist-insight-summary:", err);
    return NextResponse.json(
      { status: "error", summary: null, message: err?.message ?? "Failed to build summary." },
      { status: 500 }
    );
  }
}

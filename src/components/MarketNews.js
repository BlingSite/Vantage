"use client";

import { useState, useEffect } from "react";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function SentimentBadge({ sentiment }) {
  if (sentiment == null || sentiment === "") return null;
  const s = String(sentiment).toLowerCase();
  const cls =
    s === "positive" || s === "bullish"
      ? "bg-green-50 text-green-700 border-green-200"
      : s === "negative" || s === "bearish"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {s === "positive" || s === "bullish" ? "Bullish" : s === "negative" || s === "bearish" ? "Bearish" : "Neutral"}
    </span>
  );
}

function ToneIndicator({ tone, breakdown }) {
  const colors = {
    bullish: { bg: "bg-green-500", text: "text-green-700", label: "Bullish" },
    bearish: { bg: "bg-red-500", text: "text-red-700", label: "Bearish" },
    neutral: { bg: "bg-gray-400", text: "text-gray-600", label: "Neutral" },
  };
  const c = colors[tone] || colors.neutral;
  const total = breakdown?.total || 1;
  const pctPos = Math.round((breakdown?.positive / total) * 100);
  const pctNeg = Math.round((breakdown?.negative / total) * 100);
  const pctNeu = 100 - pctPos - pctNeg;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${c.bg}`} />
        <span className={`text-sm font-semibold ${c.text}`}>{c.label}</span>
        <span className="text-[11px] text-gray-400">overall tone</span>
      </div>
      {breakdown && breakdown.total > 0 && (
        <>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            {pctPos > 0 && (
              <div className="bg-green-400 transition-all" style={{ width: `${pctPos}%` }} />
            )}
            {pctNeu > 0 && (
              <div className="bg-gray-300 transition-all" style={{ width: `${pctNeu}%` }} />
            )}
            {pctNeg > 0 && (
              <div className="bg-red-400 transition-all" style={{ width: `${pctNeg}%` }} />
            )}
          </div>
          <div className="flex gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Positive {pctPos}%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              Neutral {pctNeu}%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Negative {pctNeg}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function timeAgo(utcStr) {
  if (utcStr == null || utcStr === "") return "—";
  const t = new Date(utcStr).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MarketNews() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/stock/massive/news?limit=50", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleArticles = expanded
    ? data?.articles ?? []
    : (data?.articles ?? []).slice(0, 8);

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Market News</h2>
        <span className="text-[11px] text-gray-400">Past 7 days</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <Shimmer className="h-16 w-32" />
            <Shimmer className="h-16 flex-1" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Shimmer className="h-5 flex-1" />
              <Shimmer className="h-5 w-24" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Unable to load market news
        </div>
      ) : (
        <div>
          {/* Tone + Top Tickers bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <ToneIndicator
              tone={data.overallTone}
              breakdown={data.sentimentBreakdown}
            />
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
                Top Mentioned Tickers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(data.topTickers) ? data.topTickers : []).map((t) => (
                  <span
                    key={t.ticker}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700"
                  >
                    {t.ticker}
                    <span className="text-gray-400">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Article list */}
          <div className="divide-y divide-gray-100">
            {visibleArticles.map((article) => {
              const tickers = Array.isArray(article.tickers) ? article.tickers : [];
              const mainSentiment = article.insights?.[0]?.sentiment;
              return (
                <a
                  key={article.id}
                  href={article.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors group"
                >
                  {article.imageUrl && (
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="hidden sm:block h-14 w-20 rounded-lg object-cover shrink-0 bg-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      {article.publisher && <span>{article.publisher}</span>}
                      <span>{timeAgo(article.publishedUtc)}</span>
                      {tickers.length > 0 && (
                        <span className="text-gray-500 font-medium">
                          {tickers.slice(0, 4).join(", ")}
                          {tickers.length > 4 && ` +${tickers.length - 4}`}
                        </span>
                      )}
                      <SentimentBadge sentiment={mainSentiment} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Show more / less */}
          {(data.articles?.length ?? 0) > 8 && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
              >
                {expanded
                  ? "Show less"
                  : `Show all ${data.articles.length} articles`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

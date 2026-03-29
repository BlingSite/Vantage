"use client";

import { useState, useEffect } from "react";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function SentimentPill({ sentiment }) {
  const raw =
    sentiment == null || sentiment === ""
      ? "neutral"
      : typeof sentiment === "string"
        ? sentiment
        : String(sentiment);
  const s = raw.toLowerCase();
  const cls =
    s === "bullish"
      ? "bg-green-50 text-green-700 border-green-200"
      : s === "bearish"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-600 border-gray-200";
  const label =
    s === "bullish" ? "Bullish" : s === "bearish" ? "Bearish" : "Neutral";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function ScoreBar({ score }) {
  const n = typeof score === "number" && !Number.isNaN(score) ? score : 0;
  const clamped = Math.max(-1, Math.min(1, n));
  const pct = ((clamped + 1) / 2) * 100;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-[10px] text-gray-400 w-7 tabular-nums">-1</span>
      <div className="flex-1 h-1.5 rounded-full bg-linear-to-r from-red-200 via-gray-200 to-green-200 relative">
        <span
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-gray-800 border-2 border-white shadow-sm"
          style={{ left: `calc(${pct}% - 5px)` }}
          title={`Score: ${clamped.toFixed(2)}`}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-7 text-right tabular-nums">
        +1
      </span>
      <span className="text-[11px] font-medium text-gray-600 tabular-nums w-10 text-right">
        {clamped.toFixed(2)}
      </span>
    </div>
  );
}

export default function NewsSentimentSummarizer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/news-sentiment-summarizer", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((err) => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const items = data?.items ?? [];

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4 pb-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            News Sentiment Summarizer
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500 max-w-2xl">
            &ldquo;Fetches headlines and returns a bullish/bearish sentiment
            score + summary per ticker or sector, with citations.&rdquo;
          </p>
        </div>
        {!loading && data?.headlineCount != null && (
          <span className="text-[11px] text-gray-400 shrink-0">
            {data.headlineCount} headlines analyzed
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2">
                <Shimmer className="h-5 w-16" />
                <Shimmer className="h-5 w-24" />
              </div>
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="py-8 text-center text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && data?.rawNote && (
        <p className="text-sm text-gray-500 py-4">{data.rawNote}</p>
      )}

      {!loading && !error && items.length === 0 && !data?.rawNote && (
        <p className="text-sm text-gray-500 py-4">
          No sentiment breakdown returned. Try again in a moment.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-5">
          {items.map((item, idx) => (
            <li
              key={`${item.label}-${idx}`}
              className="rounded-xl border border-gray-100 bg-gray-50/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {item.kind === "sector" ? "Sector" : "Ticker"}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {item.label}
                </span>
                <SentimentPill sentiment={item.sentiment} />
                <ScoreBar score={item.score} />
              </div>
              {item.summary && (
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {item.summary}
                </p>
              )}
              {Array.isArray(item.citations) && item.citations.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-1.5">
                    Citations
                  </p>
                  <ul className="space-y-1.5">
                    {item.citations.map((c, j) => (
                      <li key={j} className="text-[12px]">
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {c.title || c.url}
                          </a>
                        ) : (
                          <span className="text-gray-600">
                            {c.title || "—"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

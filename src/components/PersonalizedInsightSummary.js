"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function PersonalizedInsightSummary() {
  const [summary, setSummary] = useState(null);
  const [watchlistName, setWatchlistName] = useState(null);
  const [usedAi, setUsedAi] = useState(false);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/watchlist-insight-summary", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.status === "empty") {
          setStatus("empty");
          setMessage(d.message ?? null);
          return;
        }
        if (d.status === "error" || d.error) {
          setStatus("error");
          setMessage(d.message || d.error || "Something went wrong.");
          return;
        }
        setSummary(d.summary);
        setWatchlistName(d.watchlistName ?? null);
        setUsedAi(!!d.usedAi);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load your insight summary.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Personalized Insight Summary
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Today&apos;s highlights for your watchlist
            {watchlistName ? (
              <span className="text-gray-400"> · {watchlistName}</span>
            ) : null}
          </p>
        </div>
        <Link
          href="/watchlist_dashboard"
          className="shrink-0 text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Edit watchlist →
        </Link>
      </div>

      {status === "loading" && (
        <div className="space-y-2.5 py-1">
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-[92%]" />
          <Shimmer className="h-3 w-[70%]" />
        </div>
      )}

      {status === "empty" && (
        <p className="text-sm leading-relaxed text-gray-600">
          {message ??
            "Add symbols to your default watchlist to see a tailored summary here."}
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600">{message}</p>
      )}

      {status === "ready" && summary && (
        <div>
          <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
          <p className="mt-3 text-[10px] text-gray-400">
            {usedAi
              ? "AI-generated from your watchlist, quotes, and recent headlines."
              : "From your watchlist quotes and recent headlines."}
          </p>
        </div>
      )}

      {status === "ready" && !summary && (
        <p className="text-sm text-gray-600">
          No summary available right now. Try again in a moment.
        </p>
      )}
    </section>
  );
}

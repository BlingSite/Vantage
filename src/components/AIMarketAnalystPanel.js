"use client";

import { useState, useEffect } from "react";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function AIMarketAnalystPanel() {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/ai-market-analyst", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setText(d.text);
      })
      .catch((err) => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 pb-2.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          AI Market Analyst Panel
        </h2>
        <p className="mt-0.5 text-[11px] text-gray-500">
          &ldquo;What&apos;s the market telling us today?&rdquo;
        </p>
      </div>

      {loading && (
        <div className="space-y-3 py-2">
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-4/5" />
        </div>
      )}

      {error && !loading && (
        <div className="py-6 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {text && !loading && !error && (
        <div className="prose prose-sm max-w-none text-gray-700">
          {text.split(/\n\n+/).map((para, i) => (
            <p key={i} className="mb-3 last:mb-0 text-sm leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

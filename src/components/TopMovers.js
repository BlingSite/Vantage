"use client";

import { useState, useEffect } from "react";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function pctFmt(p) {
  if (p == null || Number.isNaN(Number(p))) return "—";
  const n = Number(p);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function MoversTable({ title, accentClass, rows }) {
  return (
    <div className="min-w-0">
      <p
        className={`text-[10px] font-semibold tracking-wider uppercase mb-2 ${accentClass}`}
      >
        {title}
      </p>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] text-gray-400">
            <th className="pb-1.5 font-medium">Symbol</th>
            <th className="pb-1.5 font-medium text-right">% day</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows?.length ? (
            rows.map((m, i, arr) => {
              const up = m.changePercent >= 0;
              return (
                <tr
                  key={m.symbol}
                  className={
                    i < arr.length - 1 ? "border-b border-gray-50" : ""
                  }
                >
                  <td className="py-1.5 pr-2 font-semibold text-gray-900 tabular-nums">
                    {m.symbol}
                  </td>
                  <td
                    className={`py-1.5 text-right font-medium tabular-nums ${up ? "text-green-600" : "text-red-600"}`}
                  >
                    {pctFmt(m.changePercent)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={2} className="py-3 text-xs text-gray-400">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function TopMovers({ className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/breadth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gainers = data?.topAdvancers ?? [];
  const losers = data?.topDecliners ?? [];

  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Top Movers</h2>
          <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">
            Biggest % gainers and losers today — quick context for headlines.
          </p>
        </div>
        {data?.updatedAt && (
          <span className="shrink-0 text-[10px] text-gray-400 tabular-nums">
            {new Date(data.updatedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-3 w-20" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <Shimmer className="h-5 w-full" />
              <Shimmer className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="py-10 px-5 text-center text-sm text-gray-400">
          Unable to load top movers
        </div>
      ) : (
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <MoversTable
              title="Gainers"
              accentClass="text-green-600"
              rows={gainers}
            />
            <MoversTable
              title="Losers"
              accentClass="text-red-600"
              rows={losers}
            />
          </div>
        </div>
      )}
    </div>
  );
}

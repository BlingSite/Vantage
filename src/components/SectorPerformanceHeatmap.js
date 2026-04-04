"use client";

import { useState, useEffect, useMemo } from "react";

/** SPDR sector ETFs — GICS order */
const SECTORS = [
  { symbol: "XLC", label: "Communication Services", short: "Comm. Services" },
  { symbol: "XLY", label: "Consumer Discretionary", short: "Cons. Disc." },
  { symbol: "XLP", label: "Consumer Staples", short: "Cons. Staples" },
  { symbol: "XLE", label: "Energy", short: "Energy" },
  { symbol: "XLF", label: "Financials", short: "Financials" },
  { symbol: "XLV", label: "Health Care", short: "Health Care" },
  { symbol: "XLI", label: "Industrials", short: "Industrials" },
  { symbol: "XLB", label: "Materials", short: "Materials" },
  { symbol: "XLRE", label: "Real Estate", short: "Real Estate" },
  { symbol: "XLK", label: "Technology", short: "Technology" },
  { symbol: "XLU", label: "Utilities", short: "Utilities" },
];

const SYMBOL_PARAM = SECTORS.map((s) => s.symbol).join(",");

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />;
}

function formatPct(dp) {
  if (dp == null || Number.isNaN(dp)) return "—";
  const n = Number(dp);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function cellStyle(dp) {
  if (dp == null || Number.isNaN(dp)) {
    return {
      backgroundColor: "#f3f4f6",
      color: "#4b5563",
    };
  }
  const cap = 2.5;
  const t = Math.max(-1, Math.min(1, Number(dp) / cap));
  if (t >= 0) {
    const alpha = 0.14 + t * 0.62;
    return {
      backgroundColor: `rgba(22, 163, 74, ${alpha})`,
      color: t > 0.42 ? "#f0fdf4" : "#14532d",
    };
  }
  const alpha = 0.14 + -t * 0.62;
  return {
    backgroundColor: `rgba(220, 38, 38, ${alpha})`,
    color: -t > 0.42 ? "#fef2f2" : "#7f1d1d",
  };
}

export default function SectorPerformanceHeatmap({ className = "" }) {
  const [snapshots, setSnapshots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock/massive/snapshot?symbols=${encodeURIComponent(SYMBOL_PARAM)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setSnapshots(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    return SECTORS.map((s) => {
      const snap = snapshots?.[s.symbol];
      return {
        ...s,
        dp: snap?.dp != null ? Number(snap.dp) : null,
      };
    });
  }, [snapshots]);

  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="mb-4 pb-2.5 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Sector performance
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500 max-w-xl">
            S&amp;P 500 sector ETFs (SPDR) — daily % change. Greens indicate
            strength, reds weakness.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 tabular-nums">-2.5%</span>
          <div
            className="h-2 w-28 sm:w-36 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(220,38,38,0.75) 0%, #f3f4f6 50%, rgba(22,163,74,0.85) 100%)",
            }}
            aria-hidden
          />
          <span className="text-[10px] text-gray-400 tabular-nums">+2.5%</span>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTORS.map((s) => (
            <Shimmer key={s.symbol} className="h-[4.5rem]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="py-10 text-center text-sm text-gray-400">
          Unable to load sector data
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {rows.map((row) => {
            const style = cellStyle(row.dp);
            return (
              <div
                key={row.symbol}
                className="rounded-xl px-3 py-2.5 min-h-[4.5rem] flex flex-col justify-center border border-black/5 transition-transform hover:scale-[1.02] hover:shadow-sm cursor-default"
                style={{ ...style }}
                title={`${row.label} (${row.symbol})`}
              >
                <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                  {row.short}
                </span>
                <span className="text-xs font-bold tabular-nums mt-1 tracking-tight">
                  {formatPct(row.dp)}
                </span>
                <span className="text-[9px] opacity-80 font-medium mt-0.5 tabular-nums">
                  {row.symbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function pctFmt(p) {
  if (p == null || Number.isNaN(Number(p))) return null;
  const n = Number(p);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function priceFmt(p) {
  if (p == null || Number.isNaN(Number(p))) return "—";
  return `$${Number(p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TIMING_STYLES = {
  BMO: "bg-sky-50 text-sky-700 ring-sky-200",
  AMC: "bg-violet-50 text-violet-700 ring-violet-200",
  DMH: "bg-gray-50 text-gray-600 ring-gray-200",
};

const TIMING_LABELS = {
  BMO: "Pre",
  AMC: "Post",
  DMH: "Intra",
};

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isNextWeek(fromStr) {
  const now = new Date();
  const day = now.getDay();
  return day === 0 || day === 6;
}

function formatWeekLabel(from, to) {
  const f = new Date(from + "T12:00:00");
  const t = new Date(to + "T12:00:00");
  const fmtOpts = { month: "short", day: "numeric" };
  return `${f.toLocaleDateString("en-US", fmtOpts)} – ${t.toLocaleDateString("en-US", fmtOpts)}`;
}

function groupByDate(stocks) {
  const groups = new Map();
  for (const s of stocks) {
    if (!groups.has(s.date)) groups.set(s.date, []);
    groups.get(s.date).push(s);
  }
  return [...groups.entries()];
}

export default function EarningsThisWeek({ className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home/earnings-week", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stocks = data?.stocks ?? [];
  const grouped = groupByDate(stocks);

  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {data?.week && isNextWeek()
              ? "Earnings Next Week"
              : "Earnings This Week"}
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">
            {data?.week
              ? `Top stocks reporting ${formatWeekLabel(data.week.from, data.week.to)}.`
              : "Notable companies reporting earnings this week."}
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
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-5 w-12" />
              <Shimmer className="h-5 w-32 flex-1" />
              <Shimmer className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="py-10 px-5 text-center text-sm text-gray-400">
          No earnings data available this week
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2">
                {formatDayHeader(date)}
              </p>
              <div className="space-y-1">
                {items.map((s) => {
                  const pct = pctFmt(s.changePercent);
                  const up = s.changePercent >= 0;
                  return (
                    <Link
                      key={s.symbol}
                      href={`/stock/${s.symbol}`}
                      className="flex items-center gap-3 rounded-lg px-2.5 py-2 -mx-0.5 hover:bg-gray-50 transition-colors group"
                    >
                      <span className="w-14 shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                        {s.symbol}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                        {s.name}
                      </span>
                      {s.timing && (
                        <span
                          className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TIMING_STYLES[s.timing] ?? TIMING_STYLES.DMH}`}
                        >
                          {TIMING_LABELS[s.timing] ?? s.timing}
                        </span>
                      )}
                      {s.epsForecast && (
                        <span className="shrink-0 text-[10px] text-gray-400 tabular-nums w-16 text-right" title="Consensus EPS forecast">
                          Est {s.epsForecast}
                        </span>
                      )}
                      {s.price != null && (
                        <span className="hidden sm:inline shrink-0 text-xs text-gray-700 tabular-nums w-16 text-right">
                          {priceFmt(s.price)}
                        </span>
                      )}
                      {pct && (
                        <span
                          className={`shrink-0 text-xs font-medium tabular-nums w-14 text-right ${up ? "text-green-600" : "text-red-600"}`}
                        >
                          {pct}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

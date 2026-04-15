"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtPrice(v) {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtLarge(v) {
  if (v == null) return "—";
  const n = Math.abs(Number(v));
  if (n >= 1e12) return `${(Number(v) / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(Number(v) / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(Number(v) / 1e6).toFixed(2)}M`;
  return Number(v).toLocaleString("en-US");
}

function fmtVolume(v) {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-US");
}

function fmtPct(v) {
  if (v == null) return null;
  const n = Number(v);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtChange(v) {
  if (v == null) return null;
  const n = Number(v);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Shimmer / Loading                                                  */
/* ------------------------------------------------------------------ */

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10 animate-fade-in">
      <Shimmer className="h-7 w-72 mb-2" />
      <Shimmer className="h-4 w-48 mb-6" />
      <Shimmer className="h-10 w-56 mb-2" />
      <Shimmer className="h-4 w-40 mb-8" />
      <Shimmer className="h-px w-full mb-6" />
      <div className="flex gap-10">
        <div className="space-y-3 w-80">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-4 w-20" />
            </div>
          ))}
        </div>
        <Shimmer className="flex-1 h-64 rounded-xl" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart helpers                                                      */
/* ------------------------------------------------------------------ */

const RANGES = [
  { key: "1D", label: "1D" },
  { key: "5D", label: "5D" },
  { key: "1M", label: "1M" },
  { key: "YTD", label: "YTD" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
];

function filterChartData(chart, range) {
  if (!chart) return [];
  if (range === "1D") return chart.intraday ?? [];

  const daily = chart.daily ?? [];
  if (daily.length === 0) return [];
  const now = Date.now();
  let cutoff = 0;
  switch (range) {
    case "5D":
      cutoff = now - 7 * 86400000;
      break;
    case "1M":
      cutoff = now - 31 * 86400000;
      break;
    case "3M":
      cutoff = now - 92 * 86400000;
      break;
    case "6M":
      cutoff = now - 183 * 86400000;
      break;
    case "1Y":
      cutoff = now - 366 * 86400000;
      break;
    case "YTD": {
      const jan1 = new Date(new Date().getFullYear(), 0, 1).getTime();
      cutoff = jan1;
      break;
    }
    default:
      cutoff = 0;
  }
  return daily.filter((d) => d.t >= cutoff);
}

function formatXTick(range) {
  return (ts) => {
    const d = new Date(ts);
    if (range === "1D") {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    if (range === "5D") {
      return d.toLocaleDateString("en-US", { weekday: "short" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
}

function ChartTooltipContent({ active, payload, range }) {
  if (!active || !payload?.[0]) return null;
  const d = new Date(payload[0].payload.t);
  const label =
    range === "1D"
      ? d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">${fmtPrice(payload[0].value)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat row                                                           */
/* ------------------------------------------------------------------ */

function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 tabular-nums text-right">
        {value ?? "—"}
        {sub && (
          <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  "Overview",
  "Financials",
  "Forecast",
  "Statistics",
  "Metrics",
  "Dividends",
  "History",
  "Profile",
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params.symbol?.toUpperCase();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [range, setRange] = useState("1D");

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/stock/detail?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  const chartData = useMemo(
    () => filterChartData(data?.chart, range),
    [data?.chart, range]
  );

  const chartChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].c;
    const last = chartData[chartData.length - 1].c;
    if (!first || !last) return null;
    const pct = ((last - first) / first) * 100;
    return pct;
  }, [chartData]);

  const chartColor =
    chartChange == null || chartChange >= 0 ? "#16a34a" : "#dc2626";

  if (loading) return <LoadingSkeleton />;
  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-20 text-center">
        <p className="text-lg text-gray-400">
          Could not load data for {symbol}
        </p>
      </div>
    );
  }

  const p = data.price ?? {};
  const up = (p.change ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10 animate-fade-in">
      {/* ── Header ── */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900">
          {data.name ?? symbol}{" "}
          <span className="font-semibold text-gray-500">({symbol})</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {[data.exchange, symbol, "Real-Time Price", data.currency]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {/* ── Price ── */}
      <div className="mt-4 mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">
            {fmtPrice(p.current)}
          </span>
          {p.change != null && (
            <span
              className={`text-lg font-semibold tabular-nums ${up ? "text-green-600" : "text-red-600"}`}
            >
              {fmtChange(p.change)} ({fmtPct(p.changePercent)})
            </span>
          )}
        </div>
        {data.updatedAt && (
          <p className="text-[11px] text-gray-400 mt-1">
            As of{" "}
            {new Date(data.updatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 mb-6 -mx-1 overflow-x-auto">
        <div className="flex gap-0.5 px-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content: Stats + Chart ── */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-8 shrink-0 lg:w-[420px]">
          {/* Left column */}
          <div>
            <StatRow
              label="Market Cap"
              value={fmtLarge(data.overview?.marketCap)}
            />
            <StatRow
              label="Revenue (ttm)"
              value={fmtLarge(data.financials?.revenue)}
            />
            <StatRow
              label="Net Income"
              value={fmtLarge(data.financials?.netIncome)}
            />
            <StatRow
              label="EPS"
              value={
                data.financials?.eps != null
                  ? fmtPrice(data.financials.eps)
                  : "—"
              }
            />
            <StatRow
              label="Shares Out"
              value={fmtLarge(data.overview?.sharesOutstanding)}
            />
            <StatRow
              label="PE Ratio"
              value={
                data.financials?.peRatio != null
                  ? data.financials.peRatio.toFixed(2)
                  : "—"
              }
            />
            <StatRow
              label="Dividend"
              value={
                data.dividend?.annualDividend != null
                  ? `$${fmtPrice(data.dividend.annualDividend)}`
                  : "—"
              }
              sub={
                data.dividend?.yield != null
                  ? `(${data.dividend.yield.toFixed(2)}%)`
                  : null
              }
            />
            <StatRow
              label="Ex-Dividend Date"
              value={fmtDate(data.dividend?.exDividendDate)}
            />
          </div>

          {/* Right column */}
          <div>
            <StatRow label="Volume" value={fmtVolume(p.volume)} />
            <StatRow
              label="Open"
              value={p.open != null ? fmtPrice(p.open) : "—"}
            />
            <StatRow
              label="Previous Close"
              value={p.prevClose != null ? fmtPrice(p.prevClose) : "—"}
            />
            <StatRow
              label="Day's Range"
              value={
                p.low != null && p.high != null
                  ? `${fmtPrice(p.low)} – ${fmtPrice(p.high)}`
                  : "—"
              }
            />
            <StatRow
              label="52-Week Range"
              value={
                data.range52Week?.low != null && data.range52Week?.high != null
                  ? `${fmtPrice(data.range52Week.low)} – ${fmtPrice(data.range52Week.high)}`
                  : "—"
              }
            />
            <StatRow
              label="Earnings Date"
              value={fmtDate(data.earnings?.nextDate)}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-w-0">
          {/* Range selector */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    range === r.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {chartChange != null && (
              <span
                className={`text-sm font-semibold tabular-nums ${chartChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {fmtPct(chartChange)} ({range})
              </span>
            )}
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tickFormatter={formatXTick(range)}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtPrice(v)}
                  width={65}
                />
                <Tooltip
                  content={<ChartTooltipContent range={range} />}
                  cursor={{ stroke: "#d1d5db", strokeDasharray: "4 2" }}
                />
                <Area
                  type="monotone"
                  dataKey="c"
                  stroke={chartColor}
                  strokeWidth={1.5}
                  fill="url(#chartFill)"
                  dot={false}
                  activeDot={{ r: 3, fill: chartColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] rounded-xl bg-gray-50 text-sm text-gray-400">
              No chart data available for {range}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

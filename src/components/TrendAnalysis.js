"use client";

import {
  Component,
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 10, right: 10, left: -10, bottom: 0 };
const LEGEND_WRAPPER_STYLE = { fontSize: "11px", color: "#6b7280" };
const REF_LABEL_UPPER = {
  value: "+2σ",
  position: "right",
  fontSize: 10,
  fill: "#f59e0b",
};
const REF_LABEL_LOWER = {
  value: "-2σ",
  position: "right",
  fontSize: 10,
  fill: "#f59e0b",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(dateStr) {
  if (dateStr == null || dateStr === "") return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtSentiment(v) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${Number(v).toFixed(3)}`;
}

function fmtPct(v) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${Number(v).toFixed(2)}%`;
}

function fmtVolume(v) {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString();
}

function corrLabel(c) {
  if (c == null) return "N/A";
  const abs = Math.abs(c);
  if (abs >= 0.7) return "Strong";
  if (abs >= 0.4) return "Moderate";
  if (abs >= 0.2) return "Weak";
  return "Negligible";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-gray-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </span>
      <span className={`text-lg font-bold tabular-nums leading-none ${color ?? "text-gray-900"}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1.5">
        {label != null && label !== "" ? fmtDate(String(label)) : "—"}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Sentiment
          </span>
          <span className={`font-medium tabular-nums ${d.avgSentiment >= 0 ? "text-green-600" : "text-red-600"}`}>
            {fmtSentiment(d.avgSentiment)}
          </span>
        </div>
        {d.spyReturn != null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              SPY Return
            </span>
            <span className={`font-medium tabular-nums ${d.spyReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtPct(d.spyReturn)}
            </span>
          </div>
        )}
        {d.spyVolume != null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-400">SPY Volume</span>
            <span className="font-medium tabular-nums text-gray-700">
              {fmtVolume(d.spyVolume)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-400">Articles</span>
          <span className="font-medium tabular-nums text-gray-700">
            {d.articleCount}
          </span>
        </div>
        {d.isSpike && (
          <div className="mt-1 pt-1 border-t border-gray-100">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                d.spikeDirection === "positive" ? "text-green-600" : "text-red-600"
              }`}
            >
              {d.spikeDirection === "positive" ? "Positive" : "Negative"} Spike
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SpikeRow({ spike }) {
  const isPos = spike.direction === "positive";
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
            isPos
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {isPos ? "↑" : "↓"}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-900">
            {fmtDate(spike.date)}
          </span>
          <span className="ml-2 text-[11px] text-gray-400">
            {spike.articleCount} article{spike.articleCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <span
            className={`text-sm font-semibold tabular-nums ${
              isPos ? "text-green-600" : "text-red-600"
            }`}
          >
            {fmtSentiment(spike.avgSentiment)}
          </span>
          <span className="ml-1.5 text-[11px] text-gray-400">
            ({spike.deviation > 0 ? "+" : ""}
            {spike.deviation}σ)
          </span>
        </div>
        {spike.spyReturn != null && (
          <span
            className={`text-xs font-medium tabular-nums ${
              spike.spyReturn >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            SPY {fmtPct(spike.spyReturn)}
          </span>
        )}
      </div>
    </div>
  );
}

// Custom dot for spike markers on the chart
function SpikeDot(props) {
  const { cx, cy, payload } = props;
  if (!payload?.isSpike) return null;
  const color = payload.spikeDirection === "positive" ? "#16a34a" : "#dc2626";
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2} fill={color} />
    </g>
  );
}

function renderSpikeDot(props) {
  return <SpikeDot {...props} />;
}

/** Fixed-size chart: avoids ResponsiveContainer ResizeObserver feedback loops with React 19 + flex layouts. */
function TrendSentimentChart({ chartData, stats }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);

  const fmtSentimentTick = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "";
  }, []);
  const fmtSpyTick = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "";
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      setWidth((prev) => {
        if (w <= 0) return prev;
        return w !== prev ? w : prev;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="h-[300px] w-full min-w-0"
      style={{ minHeight: CHART_HEIGHT }}
    >
      {width > 0 && (
        <ComposedChart
          width={width}
          height={CHART_HEIGHT}
          responsive={false}
          data={chartData}
          margin={CHART_MARGIN}
        >
          <defs>
            <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            yAxisId="sentiment"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtSentimentTick}
            domain={["auto", "auto"]}
            width={45}
          />
          <YAxis
            yAxisId="spy"
            orientation="right"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtSpyTick}
            domain={["auto", "auto"]}
            width={50}
          />
          <Tooltip content={CustomTooltip} />
          <Legend
            verticalAlign="top"
            height={30}
            iconType="circle"
            iconSize={8}
            wrapperStyle={LEGEND_WRAPPER_STYLE}
          />

          {stats && (
            <>
              <ReferenceLine
                yAxisId="sentiment"
                y={stats.mean}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <ReferenceLine
                yAxisId="sentiment"
                y={stats.upperBound}
                stroke="#f59e0b"
                strokeDasharray="2 4"
                strokeWidth={1}
                label={REF_LABEL_UPPER}
              />
              <ReferenceLine
                yAxisId="sentiment"
                y={stats.lowerBound}
                stroke="#f59e0b"
                strokeDasharray="2 4"
                strokeWidth={1}
                label={REF_LABEL_LOWER}
              />
            </>
          )}

          <Area
            yAxisId="sentiment"
            type="monotone"
            dataKey="avgSentiment"
            name="Daily Sentiment"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#sentimentGrad)"
            dot={renderSpikeDot}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
          <Line
            yAxisId="spy"
            type="monotone"
            dataKey="spyReturn"
            name="SPY Daily Return"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: "#6b7280" }}
            connectNulls
          />
        </ComposedChart>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TrendAnalysisPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/stock/massive/sentiment-trend", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!data?.combined) return [];
    return data.combined.map((d) => ({
      ...d,
      dateLabel: fmtDate(d.date),
    }));
  }, [data]);

  const stats = data?.stats;
  const spikes = data?.spikes ?? [];

  const sentimentColor = stats
    ? stats.mean >= 0.1
      ? "text-green-600"
      : stats.mean <= -0.1
        ? "text-red-600"
        : "text-gray-700"
    : "text-gray-900";

  const corrColor = stats?.correlation != null
    ? stats.correlation > 0.2
      ? "text-green-600"
      : stats.correlation < -0.2
        ? "text-red-600"
        : "text-gray-700"
    : "text-gray-700";

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Trend Analysis</h2>
        {data?.dateRange && (
          <span className="text-[11px] text-gray-400">
            {fmtDate(data.dateRange.from)} – {fmtDate(data.dateRange.to)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200/60 p-3 space-y-2">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-6 w-12" />
              </div>
            ))}
          </div>
          <Shimmer className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Unable to load sentiment trend data
        </div>
      ) : (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-5 pb-4">
            <StatCard
              label="Articles Analyzed"
              value={stats?.totalArticles?.toLocaleString() ?? "—"}
              sub={`${stats?.daysAnalyzed ?? 0} trading days`}
            />
            <StatCard
              label="Avg Sentiment"
              value={fmtSentiment(stats?.mean)}
              sub={`σ = ${
                Number.isFinite(Number(stats?.stdDev))
                  ? Number(stats.stdDev).toFixed(3)
                  : "—"
              }`}
              color={sentimentColor}
            />
            <StatCard
              label="Sentiment Spikes"
              value={stats?.spikeCount ?? 0}
              sub="> 2σ from mean"
            />
            <StatCard
              label="Sentiment↔SPY"
              value={stats?.correlation != null ? stats.correlation.toFixed(3) : "N/A"}
              sub={corrLabel(stats?.correlation)}
              color={corrColor}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="px-6 pb-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                <TrendSentimentChart chartData={chartData} stats={stats} />
              </div>
            </div>
          )}

          {/* Spikes */}
          {spikes.length > 0 && (
            <div className="px-6 pb-5">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
                Sentiment Spikes ({spikes.length})
              </p>
              <div className="rounded-xl border border-gray-100 bg-gray-50/30 px-4">
                {spikes.map((spike, idx) => (
                  <SpikeRow key={spike.date ?? `spike-${idx}`} spike={spike} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              Sentiment scored from article insights: +1 (bullish) to −1 (bearish).
              Spikes exceed 2 standard deviations from the 30-day mean.
              {stats?.correlation != null && (
                <> Pearson r = {stats.correlation.toFixed(3)} between daily sentiment and same-day SPY returns.</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

class TrendAnalysisErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Trend Analysis</h2>
          </div>
          <div className="py-12 px-6 text-center text-sm text-gray-400">
            This chart could not be rendered safely. You can keep using the rest of the dashboard.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TrendAnalysis() {
  return (
    <TrendAnalysisErrorBoundary>
      <TrendAnalysisPanel />
    </TrendAnalysisErrorBoundary>
  );
}

"use client";

import { useState, useEffect } from "react";

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function fmtVol(v) {
  if (v == null || v === 0) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

function BreadthBar({ advancers, decliners, unchanged }) {
  const total = advancers + decliners + unchanged;
  if (total === 0) return null;

  const advPct = (advancers / total) * 100;
  const decPct = (decliners / total) * 100;
  const unchPct = (unchanged / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="bg-green-500 transition-all duration-700 ease-out"
          style={{ width: `${advPct}%` }}
        />
        <div
          className="bg-gray-300 transition-all duration-700 ease-out"
          style={{ width: `${unchPct}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-700 ease-out"
          style={{ width: `${decPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] tabular-nums">
        <span className="text-green-600 font-medium">
          {advPct.toFixed(1)}% advancing
        </span>
        {unchPct > 0.5 && (
          <span className="text-gray-400">{unchPct.toFixed(1)}% flat</span>
        )}
        <span className="text-red-600 font-medium">
          {decPct.toFixed(1)}% declining
        </span>
      </div>
    </div>
  );
}

function VolumeBar({ advancerVolume, declinerVolume }) {
  const total = advancerVolume + declinerVolume;
  if (total === 0) return null;

  const advPct = (advancerVolume / total) * 100;
  const decPct = (declinerVolume / total) * 100;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        Volume Split
      </p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="bg-green-400/70 transition-all duration-700 ease-out"
          style={{ width: `${advPct}%` }}
        />
        <div
          className="bg-red-400/70 transition-all duration-700 ease-out"
          style={{ width: `${decPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] tabular-nums text-gray-500">
        <span>
          <span className="text-green-600 font-medium">{fmtVol(advancerVolume)}</span>{" "}
          up vol
        </span>
        <span>
          <span className="text-red-600 font-medium">{fmtVol(declinerVolume)}</span>{" "}
          down vol
        </span>
      </div>
    </div>
  );
}

function MoverRow({ mover, rank }) {
  const up = mover.changePercent >= 0;
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-gray-300 w-3 text-right tabular-nums">
          {rank}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {mover.symbol}
        </span>
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${up ? "text-green-600" : "text-red-600"}`}
      >
        {up ? "+" : ""}
        {Number(mover.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketBreadth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/market/breadth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(true);
        } else {
          setData(d);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const sentiment =
    data?.adRatio != null
      ? data.adRatio >= 2
        ? "Strong Bullish"
        : data.adRatio >= 1.2
          ? "Bullish"
          : data.adRatio >= 0.8
            ? "Neutral"
            : data.adRatio >= 0.5
              ? "Bearish"
              : "Strong Bearish"
      : null;

  const sentimentColor =
    sentiment === "Strong Bullish" || sentiment === "Bullish"
      ? "text-green-600"
      : sentiment === "Bearish" || sentiment === "Strong Bearish"
        ? "text-red-600"
        : "text-gray-600";

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Market Breadth
        </h2>
        {data?.updatedAt && (
          <span className="text-[10px] text-gray-400">
            Updated{" "}
            {new Date(data.updatedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200/60 p-3 space-y-2">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-6 w-12" />
              </div>
            ))}
          </div>
          <Shimmer className="h-3 w-full rounded-full" />
          <Shimmer className="h-24 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Unable to load market breadth data
        </div>
      ) : (
        <div className="p-6 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-0.5 rounded-xl border border-gray-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Advancers
              </span>
              <span className="text-lg font-bold tabular-nums leading-none text-green-600">
                {data.advancers.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-gray-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Decliners
              </span>
              <span className="text-lg font-bold tabular-nums leading-none text-red-600">
                {data.decliners.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-gray-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                A/D Ratio
              </span>
              <span className={`text-lg font-bold tabular-nums leading-none ${sentimentColor}`}>
                {data.adRatio ?? "—"}
              </span>
              {sentiment && (
                <span className={`text-[11px] ${sentimentColor}`}>
                  {sentiment}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-gray-200/60 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Total Tickers
              </span>
              <span className="text-lg font-bold tabular-nums leading-none text-gray-900">
                {data.total.toLocaleString()}
              </span>
              {data.unchanged > 0 && (
                <span className="text-[11px] text-gray-400">
                  {data.unchanged.toLocaleString()} unchanged
                </span>
              )}
            </div>
          </div>

          {/* Breadth bar */}
          <BreadthBar
            advancers={data.advancers}
            decliners={data.decliners}
            unchanged={data.unchanged}
          />

          {/* Volume bar */}
          <VolumeBar
            advancerVolume={data.advancerVolume}
            declinerVolume={data.declinerVolume}
          />

          {/* Top movers */}
          {(data.topAdvancers?.length > 0 || data.topDecliners?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.topAdvancers?.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3">
                  <p className="text-[10px] font-semibold tracking-wider text-green-600 uppercase mb-1">
                    Top Advancers
                  </p>
                  {data.topAdvancers.map((m, i) => (
                    <MoverRow key={m.symbol} mover={m} rank={i + 1} />
                  ))}
                </div>
              )}
              {data.topDecliners?.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3">
                  <p className="text-[10px] font-semibold tracking-wider text-red-600 uppercase mb-1">
                    Top Decliners
                  </p>
                  {data.topDecliners.map((m, i) => (
                    <MoverRow key={m.symbol} mover={m} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

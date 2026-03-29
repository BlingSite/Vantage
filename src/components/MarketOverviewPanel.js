"use client";

import { useState, useEffect } from "react";

function Sparkline({ data, width = 64, height = 20 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const isUp = data[data.length - 1] >= data[0];
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmt(price) {
  if (price == null) return "—";
  return `$${Number(price).toFixed(2)}`;
}

function changeStr(change, pct) {
  if (change == null) return null;
  const s = change >= 0 ? "+" : "";
  const p = pct != null ? ` (${s}${Number(pct).toFixed(2)}%)` : "";
  return `${s}${Number(change).toFixed(2)}${p}`;
}

function MarketRow({ label, price, change, changePercent, sparkline, border }) {
  const str = changeStr(change, changePercent);
  const up = (change ?? 0) >= 0;

  return (
    <div
      className={`flex items-center justify-between py-2 ${border ? "border-b border-gray-100" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-500 w-[88px] shrink-0 truncate">
          {label}
        </span>
        {sparkline?.length > 1 && <Sparkline data={sparkline} />}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {fmt(price)}
        </span>
        {str && (
          <span
            className={`text-[11px] font-medium tabular-nums ${up ? "text-green-600" : "text-red-600"}`}
          >
            {str}
          </span>
        )}
      </div>
    </div>
  );
}

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function MarketOverviewPanel({ className = "" }) {
  const [market, setMarket] = useState(null);
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setMarket(d);
      })
      .catch(() => {})
      .finally(() => setMarketLoading(false));
  }, []);

  const breadth = (() => {
    if (!market?.indices) return null;
    const up = market.indices.filter((i) => (i.change ?? 0) > 0).length;
    if (up === market.indices.length) return "Broad Gains";
    if (up === 0) return "Broad Decline";
    return "Mixed";
  })();

  const renderSection = (title, items) => {
    if (!items?.length) return null;
    return (
      <div className="pt-2.5 first:pt-0">
        <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-0.5">
          {title}
        </p>
        {items.map((item, i) => (
          <MarketRow
            key={item.symbol}
            {...item}
            border={i < items.length - 1}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="mb-3 pb-2.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Market Overview</h2>
      </div>

      {marketLoading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex justify-between py-1.5">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-36" />
            </div>
          ))}
        </div>
      ) : !market ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Unable to load market data
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {renderSection("Indices", market.indices)}
          {renderSection("Volatility", market.volatility)}
          <div className="flex items-center justify-between pt-2.5 mt-0.5">
            {breadth && (
              <span className="text-[11px] text-gray-400">
                Breadth:{" "}
                <span
                  className={
                    breadth === "Broad Gains"
                      ? "text-green-600"
                      : breadth === "Broad Decline"
                        ? "text-red-600"
                        : "text-gray-500"
                  }
                >
                  {breadth}
                </span>
              </span>
            )}
            {market.updatedAt && (
              <span className="text-[10px] text-gray-400 ml-auto">
                Updated{" "}
                {new Date(market.updatedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";

const US_ROW_ORDER = [
  { symbol: "I:DJI", displayName: "Dow Jones" },
  { symbol: "I:SPX", displayName: "S&P 500" },
  { symbol: "I:COMP", displayName: "Nasdaq Composite" },
  { symbol: "I:VIX", displayName: "VIX" },
  { symbol: "GLD", displayName: "Gold" },
  { symbol: "USO", displayName: "Oil" },
];

function indexBySymbol(market) {
  const map = {};
  const sections = ["indices", "volatility", "commodities"];
  for (const key of sections) {
    for (const row of market[key] ?? []) {
      map[row.symbol] = row;
    }
  }
  return map;
}

function fmtPrice(price) {
  if (price == null) return "—";
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtChange(change) {
  if (change == null) return "—";
  const n = Number(change);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(pct) {
  if (pct == null) return "—";
  const n = Number(pct);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function TrendArrow({ up }) {
  return (
    <span
      className={`inline-flex text-xs leading-none ${up ? "text-emerald-600" : "text-red-600"}`}
      aria-hidden
    >
      {up ? "▲" : "▼"}
    </span>
  );
}

function ShimmerCell({ className = "" }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function USMarketTickerWidget({ embedded = false }) {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market/overview", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.error) setMarket(data);
        else setMarket(null);
      } catch {
        if (!cancelled) setMarket(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const rows = useMemo(() => {
    if (!market) return [];
    const bySym = indexBySymbol(market);
    return US_ROW_ORDER.map(({ symbol, displayName }) => {
      const r = bySym[symbol];
      return {
        symbol,
        displayName,
        price: r?.price ?? null,
        change: r?.change ?? null,
        changePercent: r?.changePercent ?? null,
      };
    });
  }, [market]);

  const body = (
    <>
        <div className="mb-3 inline-block">
          <h2 className="text-sm font-bold tracking-tight text-gray-900">
            US market
          </h2>
          <div className="mt-1 h-0.5 w-full rounded-full bg-gray-900" aria-hidden />
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th
                  scope="col"
                  className="w-8 px-3 py-2.5 text-left font-semibold text-gray-500"
                  aria-label="Trend"
                />
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Change
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  % Chg
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-3">
                      <ShimmerCell className="h-3 w-3" />
                    </td>
                    <td className="px-3 py-3">
                      <ShimmerCell className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ShimmerCell className="ml-auto h-4 w-20" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ShimmerCell className="ml-auto h-4 w-16" />
                    </td>
                    <td className="px-3 py-3 pr-4 text-right">
                      <ShimmerCell className="ml-auto h-4 w-14" />
                    </td>
                  </tr>
                ))
              ) : !market ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    Unable to load market data
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
                  const up = (row.change ?? 0) >= 0;
                  const hasChange = row.change != null;
                  return (
                    <tr
                      key={row.symbol}
                      className={`border-b border-gray-100 last:border-0 ${
                        i % 2 === 0 ? "bg-sky-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-3 align-middle">
                        {hasChange ? <TrendArrow up={up} /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 align-middle font-bold text-gray-900">
                        {row.displayName}
                      </td>
                      <td className="px-3 py-3 align-middle text-right tabular-nums text-gray-900">
                        {fmtPrice(row.price)}
                      </td>
                      <td
                        className={`px-3 py-3 align-middle text-right tabular-nums font-medium ${
                          !hasChange
                            ? "text-gray-400"
                            : up
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {fmtChange(row.change)}
                      </td>
                      <td
                        className={`px-3 py-3 pr-4 align-middle text-right tabular-nums font-medium ${
                          row.changePercent == null
                            ? "text-gray-400"
                            : up
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {fmtPct(row.changePercent)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {market?.note && (
          <p className="mt-2 text-[10px] leading-snug text-gray-400">
            {market.note}
          </p>
        )}
    </>
  );

  if (embedded) {
    return (
      <div className="mt-8 w-full min-w-0 pt-2">{body}</div>
    );
  }

  return (
    <div className="border-b border-gray-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4">{body}</div>
    </div>
  );
}

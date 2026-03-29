"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_SYMBOLS = 5;

function formatPrice(c) {
  if (c == null || Number.isNaN(Number(c))) return "—";
  return `$${Number(c).toFixed(2)}`;
}

export default function HeroWatchlistSummary() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();

      const { data: watchlistsData, error: wlError } = await supabase
        .from("watchlists")
        .select("id, is_default")
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (wlError || !watchlistsData?.length) {
        setRows([]);
        setStatus("empty");
        return;
      }

      const active =
        watchlistsData.find((w) => w.is_default) ?? watchlistsData[0];

      const { data: itemsResult, error: itemsError } = await supabase
        .from("watchlist_items")
        .select("*, stocks(*)")
        .eq("watchlist_id", active.id);

      if (cancelled) return;
      if (itemsError) {
        setRows([]);
        setStatus("error");
        return;
      }

      const seen = new Set();
      const symbols = [];
      for (const item of itemsResult ?? []) {
        const sym = item.stocks?.symbol?.toUpperCase();
        if (!sym || seen.has(sym)) continue;
        seen.add(sym);
        symbols.push(sym);
        if (symbols.length >= MAX_SYMBOLS) break;
      }

      if (symbols.length === 0) {
        setRows([]);
        setStatus("empty");
        return;
      }

      const symbolsParam = encodeURIComponent(symbols.join(","));
      let quotes = {};
      try {
        const res = await fetch(
          `/api/stock/massive/snapshot?symbols=${symbolsParam}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            const hasData = Object.keys(data).some((k) => data[k]?.c != null);
            if (hasData) quotes = data;
          }
        }
      } catch {
        // ignore
      }

      if (cancelled) return;

      setRows(
        symbols.map((symbol) => {
          const q = quotes[symbol];
          return {
            symbol,
            c: q?.c ?? null,
            d: q?.d ?? null,
            dp: q?.dp ?? null,
          };
        })
      );
      setStatus("ready");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="mt-7 w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="h-3 w-28 rounded bg-gray-200/90 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-200/90 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-17 min-w-22 flex-1 basis-22 max-w-28 rounded-xl border border-gray-100 bg-gray-50/80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (status === "empty" || status === "error") {
    return (
      <div className="mt-7">
        <p className="text-sm text-gray-500 max-w-md">
          {status === "error"
            ? "Could not load watchlist symbols right now."
            : "Add tickers to your watchlist to see live prices here."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 w-full max-w-xl">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Your watchlist
        </p>
        <Link
          href="/watchlist_dashboard"
          className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => {
          const up = (row.d ?? 0) >= 0;
          const changeColor = up ? "text-green-600" : "text-red-600";
          const hasQuote = row.c != null;

          return (
            <div
              key={row.symbol}
              className="min-w-22 flex-1 basis-22 max-w-30 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-xs font-bold tracking-tight text-gray-900">
                {row.symbol}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                {formatPrice(row.c)}
              </p>
              {hasQuote && row.d != null && row.dp != null ? (
                <p
                  className={`mt-0.5 text-[11px] font-medium tabular-nums ${changeColor}`}
                >
                  {up ? "+" : ""}
                  {Number(row.d).toFixed(2)} ({up ? "+" : ""}
                  {Number(row.dp).toFixed(2)}%)
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-gray-400">Live quote…</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

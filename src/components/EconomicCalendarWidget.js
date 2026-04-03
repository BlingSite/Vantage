"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_WATCHLIST_SYMBOLS = 12;

function kindStyles(kind) {
  switch (kind) {
    case "fomc":
      return "bg-violet-50 text-violet-800 ring-violet-200";
    case "cpi":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "earnings":
      return "bg-slate-100 text-slate-800 ring-slate-200";
    default:
      return "bg-gray-50 text-gray-800 ring-gray-200";
  }
}

function formatWhen(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target - today) / 86400000);
  const label = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (diff === 0) return `Today · ${label}`;
  if (diff === 1) return `Tomorrow · ${label}`;
  if (diff > 1 && diff < 7) return `In ${diff} days · ${label}`;
  return label;
}

export default function EconomicCalendarWidget() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [earningsFlag, setEarningsFlag] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadWatchlistSymbols() {
      const { data: watchlistsData, error: wlError } = await supabase
        .from("watchlists")
        .select("id, is_default")
        .order("created_at", { ascending: true });

      if (cancelled) return [];
      if (wlError || !watchlistsData?.length) return [];

      const active =
        watchlistsData.find((w) => w.is_default) ?? watchlistsData[0];

      const { data: itemsResult, error: itemsError } = await supabase
        .from("watchlist_items")
        .select("*, stocks(*)")
        .eq("watchlist_id", active.id);

      if (cancelled || itemsError) return [];

      const seen = new Set();
      const symbols = [];
      for (const item of itemsResult ?? []) {
        const sym = item.stocks?.symbol?.toUpperCase();
        if (!sym || seen.has(sym)) continue;
        seen.add(sym);
        symbols.push(sym);
        if (symbols.length >= MAX_WATCHLIST_SYMBOLS) break;
      }
      return symbols;
    }

    async function run() {
      setLoading(true);
      try {
        const symbols = await loadWatchlistSymbols();
        const q = symbols.length
          ? `?symbols=${encodeURIComponent(symbols.join(","))}`
          : "";
        const res = await fetch(`/api/home/economic-calendar${q}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setEvents(Array.isArray(data.events) ? data.events : []);
          setEarningsFlag(!!data.earningsUnavailable);
        }
      } catch (e) {
        console.error("Economic calendar fetch failed:", e);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Economic calendar
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">
            High-impact events
          </h2>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            FOMC, CPI, and upcoming earnings on your default watchlist.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No upcoming events in this window.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {events.map((ev, idx) => (
            <li
              key={`${ev.kind}-${ev.date}-${ev.symbol ?? ""}-${idx}`}
              className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
            >
              <span
                className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${kindStyles(ev.kind)}`}
              >
                {ev.kind === "fomc"
                  ? "Fed"
                  : ev.kind === "cpi"
                    ? "CPI"
                    : ev.kind === "earnings"
                      ? ev.symbol ?? "EPS"
                      : ev.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {ev.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {ev.detail}
                </p>
                <p className="text-[11px] font-medium text-gray-400 mt-1 tabular-nums">
                  {formatWhen(ev.date)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <Link
          href="/watchlist_dashboard"
          className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Watchlist &amp; earnings →
        </Link>
        {earningsFlag && (
          <span className="text-[10px] text-gray-400" title="Add MASSIVE_API_KEY with earnings data access, or check plan.">
            Earnings feed incomplete
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  US_EASTERN_TZ,
  formatClockInZone,
  formatCountdown,
  getCountdownTarget,
  inferSessionFromWallClock,
} from "@/lib/usMarketSession";

function sessionLabel(session) {
  const m = session.market;
  if (m === "open") return "Market open";
  if (m === "extended-hours") return "Extended hours";
  if (m === "closed") return "Market closed";
  return "Session unknown";
}

function sessionStyles(session) {
  const m = session.market;
  if (m === "open")
    return { dot: "bg-emerald-500", text: "text-emerald-800", pill: "bg-emerald-50" };
  if (m === "extended-hours")
    return { dot: "bg-amber-500", text: "text-amber-900", pill: "bg-amber-50" };
  if (m === "closed")
    return { dot: "bg-gray-400", text: "text-gray-700", pill: "bg-gray-100" };
  return { dot: "bg-gray-300", text: "text-gray-600", pill: "bg-gray-100" };
}

export default function MarketStatusBar() {
  const [apiSession, setApiSession] = useState(null);
  const [skewMs, setSkewMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const res = await fetch("/api/market/status", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.serverTime) {
          const parsed = Date.parse(data.serverTime);
          if (!Number.isNaN(parsed)) {
            setSkewMs(parsed - Date.now());
          }
        }
        if (data.market != null) {
          setApiSession({
            market: data.market,
            earlyHours: !!data.earlyHours,
            afterHours: !!data.afterHours,
          });
        } else {
          setApiSession(null);
        }
      } catch {
        if (!cancelled) setApiSession(null);
      }
    }

    pull();
    const id = setInterval(pull, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now() + skewMs), 1000);
    return () => clearInterval(id);
  }, [skewMs]);

  const apiMarket = apiSession?.market;

  const session = useMemo(
    () =>
      apiMarket != null ? apiSession : inferSessionFromWallClock(nowMs),
    [apiMarket, apiSession, nowMs],
  );

  const { targetMs, countdownLabel } = useMemo(
    () => getCountdownTarget(session, nowMs),
    [session, nowMs],
  );

  const remaining = targetMs != null ? targetMs - nowMs : null;
  const countdownStr = formatCountdown(remaining);
  const styles = sessionStyles(session);
  const clock = formatClockInZone(nowMs, { timeZone: US_EASTERN_TZ });

  return (
    <div
      className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm supports-backdrop-filter:bg-white/80"
      role="status"
      aria-live="polite"
      aria-label="US stock market session"
    >
      <div className="mx-auto flex min-h-8 max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-1.5 text-[11px] leading-snug sm:gap-x-5 sm:text-xs">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${styles.pill} ${styles.text}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
            aria-hidden
          />
          <span>{sessionLabel(session)}</span>
        </div>

        <span className="hidden text-gray-400 sm:inline" aria-hidden>
          ·
        </span>

        <span className="font-medium tabular-nums text-gray-800">
          {clock}{" "}
          <span className="font-normal text-gray-500">ET</span>
        </span>

        <span className="hidden text-gray-400 sm:inline" aria-hidden>
          ·
        </span>

        <span className="text-gray-600">
          {countdownStr ? (
            <>
              <span className="text-gray-500">{countdownLabel}</span>{" "}
              <span className="font-semibold tabular-nums text-gray-900">
                {countdownStr}
              </span>
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </span>
      </div>
    </div>
  );
}

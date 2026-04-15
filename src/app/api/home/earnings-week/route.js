import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/massive";

export const dynamic = "force-dynamic";

const NASDAQ_CALENDAR = "https://api.nasdaq.com/api/calendar/earnings";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const monday = new Date(now);
  if (isWeekend) {
    monday.setDate(now.getDate() + (day === 0 ? 1 : 2));
  } else {
    monday.setDate(now.getDate() - (day - 1));
  }
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return { from: days[0], to: days[4], days };
}

function parseMarketCap(str) {
  if (!str) return 0;
  return Number(str.replace(/[$,\s]/g, "")) || 0;
}

function nasdaqTiming(timeStr) {
  if (!timeStr) return null;
  if (timeStr.includes("pre")) return "BMO";
  if (timeStr.includes("after")) return "AMC";
  return null;
}

async function fetchDayEarnings(date) {
  try {
    const res = await fetch(`${NASDAQ_CALENDAR}?date=${date}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.rows ?? []).map((r) => ({
      symbol: r.symbol,
      name: r.name,
      date,
      timing: nasdaqTiming(r.time),
      marketCap: parseMarketCap(r.marketCap),
      epsForecast: r.epsForecast || null,
      fiscalQuarter: r.fiscalQuarterEnding || null,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const { from, to, days } = getWeekRange();

    const dayResults = await Promise.all(days.map(fetchDayEarnings));
    const all = dayResults.flat();

    const seen = new Map();
    for (const r of all) {
      if (!r.symbol) continue;
      const existing = seen.get(r.symbol);
      if (!existing || r.marketCap > existing.marketCap) {
        seen.set(r.symbol, r);
      }
    }

    const byDay = new Map();
    for (const r of seen.values()) {
      if (!byDay.has(r.date)) byDay.set(r.date, []);
      byDay.get(r.date).push(r);
    }
    const PER_DAY = 5;
    const top = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([, items]) =>
        items.sort((a, b) => b.marketCap - a.marketCap).slice(0, PER_DAY)
      );

    const snapshots = await Promise.allSettled(
      top.map((s) =>
        getSnapshot(s.symbol, { cache: "no-store" }).catch(() => null)
      )
    );

    const stocks = top.map((s, i) => {
      const snap =
        snapshots[i]?.status === "fulfilled" ? snapshots[i].value : null;
      const rawPrice =
        snap?.day?.c ?? snap?.prevDay?.c ?? snap?.lastTrade?.p ?? null;
      const price = rawPrice && rawPrice > 0 ? rawPrice : null;
      const changePercent =
        price != null ? (snap?.todaysChangePerc ?? null) : null;
      return {
        symbol: s.symbol,
        name: s.name,
        date: s.date,
        timing: s.timing,
        marketCap: s.marketCap,
        epsForecast: s.epsForecast,
        fiscalQuarter: s.fiscalQuarter,
        price,
        changePercent,
      };
    });

    return NextResponse.json({
      stocks,
      week: { from, to },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Earnings week error:", err);
    return NextResponse.json(
      { error: "Failed to load earnings", stocks: [] },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getMacroEventsBetween } from "@/lib/us-macro-calendar";
import { getBenzingaUpcomingEarnings } from "@/lib/massive";

export const dynamic = "force-dynamic";

function addDaysIso(fromYmd, days) {
  const d = new Date(fromYmd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function earningsTimeDetail(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "Earnings call";
  const [h, m] = timeStr.split(":").map(Number);
  if (!Number.isFinite(h)) return "Earnings call";
  if (h < 9 || (h === 9 && (m ?? 0) < 30)) return "Before market open";
  if (h >= 16) return "After market close";
  return "During market hours";
}

function nextEarningsPerTicker(results, fromYmd) {
  const map = new Map();
  for (const r of results) {
    const date = r.date;
    if (!date || date < fromYmd) continue;
    const sym = r.ticker?.toUpperCase();
    if (!sym) continue;
    const prev = map.get(sym);
    if (!prev || date < prev.date) {
      map.set(sym, {
        date,
        time: r.time,
        fiscalPeriod: r.fiscal_period,
        fiscalYear: r.fiscal_year,
      });
    }
  }
  return [...map.entries()].map(([symbol, row]) => ({
    symbol,
    ...row,
  }));
}

/**
 * GET /api/home/economic-calendar?symbols=AAPL,MSFT
 */
export async function GET(request) {
  const today = new Date().toISOString().slice(0, 10);
  const horizonEnd = addDaysIso(today, 56);

  const macro = getMacroEventsBetween(today, horizonEnd);

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 15);

  let earningsEvents = [];
  let earningsUnavailable = false;

  if (symbols.length > 0 && process.env.MASSIVE_API_KEY) {
    try {
      const data = await getBenzingaUpcomingEarnings(symbols, {
        from: today,
        limit: 300,
      });
      const results = Array.isArray(data?.results) ? data.results : [];
      const rows = nextEarningsPerTicker(results, today);
      earningsEvents = rows.map((row) => ({
        kind: "earnings",
        date: row.date,
        title: `${row.symbol} earnings`,
        detail: [row.fiscalPeriod && row.fiscalYear ? `${row.fiscalPeriod} ${row.fiscalYear}` : null, earningsTimeDetail(row.time)]
          .filter(Boolean)
          .join(" · "),
        impact: "high",
        symbol: row.symbol,
        dayOrder: 2,
      }));
    } catch (err) {
      console.warn("Economic calendar: Benzinga earnings unavailable:", err.message);
      earningsUnavailable = true;
    }
  } else if (symbols.length > 0) {
    earningsUnavailable = true;
  }

  const merged = [...macro, ...earningsEvents].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.dayOrder ?? 0) - (b.dayOrder ?? 0);
  });

  const maxItems = 14;
  const events = merged.slice(0, maxItems);

  const res = NextResponse.json({
    events,
    range: { from: today, to: horizonEnd },
    earningsUnavailable,
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

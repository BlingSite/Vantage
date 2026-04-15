import { NextResponse } from "next/server";
import {
  getSnapshot,
  getTickerOverview,
  getFinancials,
  getDividends,
  getCustomBars,
  getBenzingaUpcomingEarnings,
} from "@/lib/massive";

export const dynamic = "force-dynamic";

const EXCHANGE_MAP = {
  XNYS: "NYSE",
  XNAS: "NASDAQ",
  XASE: "AMEX",
  ARCX: "NYSE Arca",
  BATS: "CBOE BZX",
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const recentDay = new Date(Date.now() - 5 * 86400000)
      .toISOString()
      .slice(0, 10);
    const yearAgo = new Date(Date.now() - 365 * 86400000)
      .toISOString()
      .slice(0, 10);

    const [
      snapR,
      overviewR,
      financialsR,
      dividendsR,
      earningsR,
      yearBarsR,
      intradayR,
    ] = await Promise.allSettled([
      getSnapshot(symbol, { cache: "no-store" }),
      getTickerOverview(symbol),
      getFinancials(symbol, { limit: 4, timeframe: "annual" }),
      getDividends(symbol, {
        limit: 20,
        sort: "ex_dividend_date",
        order: "desc",
      }),
      getBenzingaUpcomingEarnings([symbol]),
      getCustomBars(symbol, {
        timespan: "day",
        from: yearAgo,
        to: today,
        limit: 260,
        sort: "asc",
      }),
      getCustomBars(symbol, {
        timespan: "minute",
        multiplier: 5,
        from: recentDay,
        to: today,
        sort: "asc",
        limit: 2000,
      }),
    ]);

    const snap = snapR.status === "fulfilled" ? snapR.value : null;
    const overview = overviewR.status === "fulfilled" ? overviewR.value : null;
    const financialsData =
      financialsR.status === "fulfilled" ? financialsR.value : null;
    const dividendsData =
      dividendsR.status === "fulfilled" ? dividendsR.value : null;
    const earningsData =
      earningsR.status === "fulfilled" ? earningsR.value : null;
    const yearBars =
      yearBarsR.status === "fulfilled" ? yearBarsR.value : null;
    const intradayBars =
      intradayR.status === "fulfilled" ? intradayR.value : null;

    // Price
    const day = snap?.day ?? {};
    const prevDay = snap?.prevDay ?? {};
    const prevClose = prevDay.c ?? null;
    const currentPrice = day.c ?? snap?.lastTrade?.p ?? null;
    const change =
      currentPrice != null && prevClose != null
        ? currentPrice - prevClose
        : null;
    const changePercent =
      change != null && prevClose ? (change / prevClose) * 100 : null;

    // Financials
    const fin = financialsData?.results?.[0]?.financials ?? null;
    const incomeStmt = fin?.income_statement ?? {};
    const revenue = incomeStmt?.revenues?.value ?? null;
    const netIncome = incomeStmt?.net_income_loss?.value ?? null;
    const eps = incomeStmt?.basic_earnings_per_share?.value ?? null;
    const sharesOut =
      overview?.share_class_shares_outstanding ??
      overview?.weighted_shares_outstanding ??
      null;
    const peRatio =
      currentPrice && eps && eps > 0 ? currentPrice / eps : null;

    // Dividends
    const recurring = (dividendsData?.results ?? []).filter(
      (d) =>
        d.cash_amount != null &&
        Number(d.cash_amount) > 0 &&
        !["SC", "LT", "ST"].includes(d.dividend_type)
    );
    const exDividendDate = recurring[0]?.ex_dividend_date ?? null;
    let annualDividend = null;
    let dividendYield = null;
    if (recurring.length > 0) {
      const freq = recurring[0]?.frequency ?? 4;
      const paymentsPerYear = freq > 0 ? freq : 4;
      const recent = recurring.slice(0, paymentsPerYear);
      const sum = recent.reduce((s, d) => s + Number(d.cash_amount), 0);
      if (sum > 0) {
        const scaleFactor = paymentsPerYear / recent.length;
        annualDividend = Number((sum * scaleFactor).toFixed(4));
        if (currentPrice > 0) {
          dividendYield = (annualDividend / currentPrice) * 100;
        }
      }
    }

    // Earnings
    const nextEarnings = earningsData?.results?.[0]?.date ?? null;

    // 52-week range
    const yearBarResults = yearBars?.results ?? [];
    let fiftyTwoWeekHigh = null;
    let fiftyTwoWeekLow = null;
    if (yearBarResults.length > 0) {
      fiftyTwoWeekHigh = Math.max(...yearBarResults.map((b) => b.h));
      fiftyTwoWeekLow = Math.min(...yearBarResults.map((b) => b.l));
    }

    // Chart data — keep only the most recent trading day's bars
    const allIntraday = intradayBars?.results ?? [];
    let chartIntraday = [];
    if (allIntraday.length > 0) {
      const lastTs = allIntraday[allIntraday.length - 1].t;
      const lastDate = new Date(lastTs).toDateString();
      chartIntraday = allIntraday
        .filter((b) => new Date(b.t).toDateString() === lastDate)
        .map((b) => ({ t: b.t, c: b.c, v: b.v }));
    }
    const chartDaily = yearBarResults.map((b) => ({
      t: b.t,
      c: b.c,
      v: b.v,
    }));

    const exchangeCode = overview?.primary_exchange ?? null;
    const exchangeName = EXCHANGE_MAP[exchangeCode] ?? exchangeCode;

    const res = NextResponse.json({
      symbol,
      name: overview?.name ?? null,
      exchange: exchangeName,
      currency: overview?.currency_name?.toUpperCase() ?? "USD",
      sicDescription: overview?.sic_description ?? null,
      price: {
        current: currentPrice,
        change,
        changePercent,
        open: day.o ?? null,
        high: day.h ?? null,
        low: day.l ?? null,
        prevClose,
        volume: day.v ?? snap?.min?.av ?? prevDay.v ?? null,
      },
      overview: {
        marketCap: overview?.market_cap ?? null,
        sharesOutstanding: sharesOut,
        totalEmployees: overview?.total_employees ?? null,
      },
      financials: { revenue, netIncome, eps, peRatio },
      dividend: {
        annualDividend,
        yield: dividendYield,
        exDividendDate,
      },
      earnings: { nextDate: nextEarnings },
      range52Week: { high: fiftyTwoWeekHigh, low: fiftyTwoWeekLow },
      chart: { intraday: chartIntraday, daily: chartDaily },
      updatedAt: new Date().toISOString(),
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("Stock detail error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load stock detail" },
      { status: 500 }
    );
  }
}

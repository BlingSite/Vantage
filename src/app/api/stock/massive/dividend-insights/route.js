import { getDividends } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/massive/dividend-insights?symbols=AAPL,MSFT
 *
 * Per-symbol dividend insights from Massive.com dividend history only.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam =
      searchParams.get("symbols") ?? searchParams.get("symbol");
    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Missing symbols query parameter" },
        { status: 400 }
      );
    }

    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 30);

    if (symbols.length === 0) return NextResponse.json({});

    const results = await Promise.allSettled(
      symbols.map((sym) => buildInsights(sym))
    );

    const payload = {};
    symbols.forEach((sym, i) => {
      const r = results[i];
      payload[sym] = r.status === "fulfilled" ? r.value : null;
    });

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("Dividend insights error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch dividend insights" },
      { status: 500 }
    );
  }
}

async function buildInsights(symbol) {
  let allDivs = [];
  try {
    const divData = await getDividends(symbol, {
      limit: 50,
      sort: "ex_dividend_date",
      order: "desc",
    });
    allDivs = Array.isArray(divData?.results) ? divData.results : [];
  } catch {
    allDivs = [];
  }

  const recurring = allDivs.filter(
    (d) =>
      d.cash_amount != null &&
      Number(d.cash_amount) > 0 &&
      d.dividend_type !== "SC" &&
      d.dividend_type !== "LT" &&
      d.dividend_type !== "ST"
  );

  let exDividendDate = null;
  let history = [];
  let frequency = null;
  let annualDividend = null;

  if (recurring.length > 0) {
    exDividendDate = recurring[0]?.ex_dividend_date ?? null;
    frequency = recurring[0]?.frequency ?? 4;
    history = recurring.slice(0, 20).map((d) => ({
      date: d.ex_dividend_date,
      amount: Number(d.cash_amount),
    }));

    const freq = recurring[0]?.frequency ?? 4;
    const paymentsPerYear = freq > 0 ? freq : 4;
    const recent = recurring.slice(0, paymentsPerYear);
    const sum = recent.reduce((s, d) => s + Number(d.cash_amount), 0);
    if (recent.length > 0 && sum > 0) {
      const scaleFactor = paymentsPerYear / recent.length;
      annualDividend = Number((sum * scaleFactor).toFixed(4));
    }
  }

  return {
    annualDividend,
    payoutRatio: null,
    growthRate: null,
    exDividendDate,
    frequency,
    history,
  };
}

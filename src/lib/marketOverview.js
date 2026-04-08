import {
  getSnapshot,
  getCustomBars,
  getMarketStatus,
  getIndicesSnapshot,
} from "@/lib/massive";

const TICKERS = {
  indices: [
    { symbol: "I:DJI", label: "Dow Jones", etf: "DIA", scale: 100 },
    { symbol: "I:SPX", label: "S&P 500", etf: "SPY", scale: 10 },
    { symbol: "I:COMP", label: "Nasdaq Composite", etf: "ONEQ", scale: null },
  ],
  volatility: [{ symbol: "I:VIX", label: "VIX", etf: "VIXY", scale: null }],
  bonds: [
    { symbol: "SHY", label: "2Y Treasury" },
    { symbol: "TLT", label: "10Y Treasury" },
  ],
  commodities: [
    { symbol: "USO", label: "WTI Oil" },
    { symbol: "GLD", label: "Gold" },
  ],
  dollar: [{ symbol: "UUP", label: "DXY" }],
};

const ALL_INDEX_TICKERS = [
  ...TICKERS.indices,
  ...TICKERS.volatility,
];
const ALL_STOCK_TICKERS = [
  ...TICKERS.bonds,
  ...TICKERS.commodities,
  ...TICKERS.dollar,
];
const ALL_ETF_SYMBOLS = [
  ...ALL_INDEX_TICKERS.map((t) => t.etf),
  ...ALL_STOCK_TICKERS.map((t) => t.symbol),
];

/**
 * Yahoo Finance symbols for assets where the ETF proxy price diverges
 * significantly from the underlying (VIX, Gold, Oil).
 */
const YAHOO_OVERRIDES = {
  "I:COMP": "%5EIXIC", // Nasdaq Composite Index
  "I:VIX": "%5EVIX",   // Cboe Volatility Index
  GLD: "GC%3DF",       // Gold futures (COMEX)
  USO: "CL%3DF",       // WTI Crude Oil futures (NYMEX)
};

/**
 * Fetch a single symbol's daily chart from Yahoo Finance.
 * Returns { price, change, changePercent, prevClose, sparkline } or null.
 */
async function fetchYahooChart(yahooSymbol) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1mo&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (c) => c != null
    );
    if (closes.length < 2) return null;

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    return { price, change, changePercent, prevClose, sparkline: closes };
  } catch {
    return null;
  }
}

/**
 * Fetch all Yahoo Finance overrides in parallel.
 * Returns a map keyed by our internal symbol (e.g. "I:VIX", "GLD", "USO").
 */
async function fetchYahooOverrides() {
  const entries = Object.entries(YAHOO_OVERRIDES);
  const results = await Promise.all(
    entries.map(([, yahooSym]) => fetchYahooChart(yahooSym))
  );
  const map = {};
  entries.forEach(([key], i) => {
    if (results[i]) map[key] = results[i];
  });
  return map;
}

function lastTwoBarsRow(bars) {
  const list = bars?.results;
  if (!Array.isArray(list) || list.length < 2) return null;
  const last = list[list.length - 1];
  const prev = list[list.length - 2];
  const price = Number(last?.c);
  const prevClose = Number(prev?.c);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(prevClose) || prevClose <= 0) return null;
  const change = price - prevClose;
  const changePercent = (change / prevClose) * 100;
  return { price, change, changePercent, prevClose };
}

/**
 * Fetches the same payload as GET /api/market/overview (for reuse in server routes).
 */
export async function fetchMarketOverview() {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);

  const barsFetchOpts = { timespan: "day", from, to, limit: 15, sort: "asc" };

  const allBarSymbols = [...ALL_ETF_SYMBOLS, "I:COMP"];

  const [
    indexSnapData,
    marketStatus,
    yahooData,
    ...barResults
  ] = await Promise.all([
    getIndicesSnapshot(
      ALL_INDEX_TICKERS.map((t) => t.symbol),
      { cache: "no-store" }
    ).catch(() => ({ results: [] })),
    getMarketStatus().catch(() => null),
    fetchYahooOverrides(),
    ...allBarSymbols.map((s) =>
      getCustomBars(s, barsFetchOpts).catch(() => ({ results: [] }))
    ),
  ]);

  const barsMap = {};
  allBarSymbols.forEach((sym, i) => {
    barsMap[sym] = barResults[i];
  });

  const indexSnapMap = {};
  for (const row of indexSnapData?.results ?? []) {
    if (row?.ticker && !row.error) indexSnapMap[row.ticker] = row;
  }

  const snapshots = {};

  for (const t of ALL_INDEX_TICKERS) {
    const indexRow = indexSnapMap[t.symbol];
    if (indexRow) {
      const session = indexRow.session ?? {};
      const value = Number(indexRow.value ?? session.close);
      const prevClose = Number(
        session.previous_close ?? session.previousClose
      );
      if (Number.isFinite(value) && value > 0) {
        const change = session.change ?? (Number.isFinite(prevClose) ? value - prevClose : null);
        const changePercent =
          session.change_percent ??
          (Number.isFinite(prevClose) && prevClose !== 0
            ? ((change ?? 0) / prevClose) * 100
            : null);
        snapshots[t.symbol] = {
          price: value,
          change: change ?? 0,
          changePercent: changePercent ?? 0,
          prevClose: Number.isFinite(prevClose) ? prevClose : null,
        };
        continue;
      }
    }

    if (t.symbol === "I:VIX" && yahooData["I:VIX"]) {
      const yv = yahooData["I:VIX"];
      snapshots[t.symbol] = {
        price: yv.price,
        change: yv.change,
        changePercent: yv.changePercent,
        prevClose: yv.prevClose,
      };
      continue;
    }

    if (t.symbol === "I:COMP" && yahooData["I:COMP"]) {
      const yv = yahooData["I:COMP"];
      snapshots[t.symbol] = {
        price: yv.price,
        change: yv.change,
        changePercent: yv.changePercent,
        prevClose: yv.prevClose,
      };
      continue;
    }

    if (t.symbol === "I:COMP") {
      const compIdxRow = lastTwoBarsRow(barsMap["I:COMP"]);
      if (compIdxRow) {
        snapshots[t.symbol] = compIdxRow;
        continue;
      }
      const oneqRow = lastTwoBarsRow(barsMap["ONEQ"]);
      const compIdxList = barsMap["I:COMP"]?.results ?? [];
      if (oneqRow && compIdxList.length >= 1) {
        const lastIdxC = Number(compIdxList[compIdxList.length - 1]?.c);
        const lastOneqC = Number(barsMap["ONEQ"]?.results?.slice(-1)[0]?.c);
        if (
          Number.isFinite(lastIdxC) && lastIdxC > 0 &&
          Number.isFinite(lastOneqC) && lastOneqC > 0
        ) {
          const dynScale = lastIdxC / lastOneqC;
          snapshots[t.symbol] = {
            price: oneqRow.price * dynScale,
            change: oneqRow.change * dynScale,
            changePercent: oneqRow.changePercent,
            prevClose: oneqRow.prevClose * dynScale,
          };
          continue;
        }
      }
      if (oneqRow) snapshots[t.symbol] = oneqRow;
      continue;
    }

    const etfRow = lastTwoBarsRow(barsMap[t.etf]);
    if (!etfRow) continue;

    if (t.scale != null) {
      snapshots[t.symbol] = {
        price: etfRow.price * t.scale,
        change: etfRow.change * t.scale,
        changePercent: etfRow.changePercent,
        prevClose: etfRow.prevClose * t.scale,
      };
    } else {
      snapshots[t.symbol] = etfRow;
    }
  }

  for (const t of ALL_STOCK_TICKERS) {
    const yOverride = yahooData[t.symbol];
    if (yOverride) {
      snapshots[t.symbol] = {
        price: yOverride.price,
        change: yOverride.change,
        changePercent: yOverride.changePercent,
        prevClose: yOverride.prevClose,
      };
      continue;
    }
    const barRow = lastTwoBarsRow(barsMap[t.symbol]);
    if (barRow) {
      snapshots[t.symbol] = barRow;
    }
  }

  const sparklines = {};
  for (const t of ALL_INDEX_TICKERS) {
    if (t.symbol === "I:VIX" && yahooData["I:VIX"]?.sparkline?.length > 0) {
      sparklines[t.symbol] = yahooData["I:VIX"].sparkline;
      continue;
    }
    if (t.symbol === "I:COMP") {
      if (yahooData["I:COMP"]?.sparkline?.length > 0) {
        sparklines[t.symbol] = yahooData["I:COMP"].sparkline;
        continue;
      }
      const idxBars = barsMap["I:COMP"]?.results ?? [];
      if (idxBars.length > 0) {
        sparklines[t.symbol] = idxBars.map((b) => Number(b.c));
        continue;
      }
    }
    const list = barsMap[t.etf]?.results ?? [];
    if (list.length > 0 && t.scale != null) {
      sparklines[t.symbol] = list.map((b) => Number(b.c) * t.scale);
    } else if (list.length > 0) {
      sparklines[t.symbol] = list.map((b) => Number(b.c));
    } else {
      sparklines[t.symbol] = [];
    }
  }

  const buildSection = (tickers) =>
    tickers.map(({ symbol, label }) => ({
      symbol,
      label,
      ...(snapshots[symbol] ?? {
        price: null,
        change: null,
        changePercent: null,
      }),
      sparkline: sparklines[symbol] ?? [],
    }));

  return {
    indices: buildSection(TICKERS.indices),
    volatility: buildSection(TICKERS.volatility),
    bonds: buildSection(TICKERS.bonds),
    commodities: buildSection(TICKERS.commodities),
    dollar: buildSection(TICKERS.dollar),
    marketStatus: marketStatus?.market ?? null,
    updatedAt: new Date().toISOString(),
    note:
      "Price and change reflect the last completed trading session (daily bar close-to-close). Indices use ETF proxies scaled to approximate index levels (DIA×100, SPY×10). Nasdaq Composite uses I:COMP daily bars. VIX uses Cboe Volatility Index. Gold uses COMEX gold futures. Oil uses WTI crude futures. Treasuries via SHY/TLT.",
  };
}

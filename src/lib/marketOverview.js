import { getSnapshot, getCustomBars, getMarketStatus } from "@/lib/massive";

const TICKERS = {
  indices: [
    { symbol: "SPY", label: "S&P 500" },
    { symbol: "DIA", label: "Dow Jones" },
    { symbol: "QQQ", label: "Nasdaq" },
  ],
  volatility: [{ symbol: "VIXY", label: "VIX" }],
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

/**
 * Fetches the same payload as GET /api/market/overview (for reuse in server routes).
 */
export async function fetchMarketOverview() {
  const allTickers = Object.values(TICKERS).flat();
  const allSymbols = allTickers.map((t) => t.symbol);
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [snapResults, ...sparkResults] = await Promise.all([
    Promise.allSettled(allSymbols.map((s) => getSnapshot(s))),
    ...TICKERS.indices.map(({ symbol }) =>
      getCustomBars(symbol, {
        timespan: "day",
        from,
        to,
        limit: 7,
        sort: "asc",
      }).catch(() => ({ results: [] }))
    ),
  ]);

  let marketStatus = null;
  try {
    marketStatus = await getMarketStatus();
  } catch {}

  const snapshots = {};
  allSymbols.forEach((symbol, i) => {
    const r = snapResults[i];
    if (r.status !== "fulfilled" || !r.value) return;
    const snap = r.value;
    const day = snap.day ?? {};
    const prevDay = snap.prevDay ?? {};
    const prevClose = prevDay.c ?? null;
    const price = day.c ?? snap.lastTrade?.p ?? null;
    snapshots[symbol] = {
      price,
      change:
        snap.todaysChange ?? (price && prevClose ? price - prevClose : null),
      changePercent: snap.todaysChangePerc ?? null,
      prevClose,
    };
  });

  const sparklines = {};
  TICKERS.indices.forEach(({ symbol }, i) => {
    const data = sparkResults[i];
    sparklines[symbol] = (data?.results ?? []).map((bar) => bar.c);
  });

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
    note: "VIX shown via VIXY ETF proxy; Treasury levels via SHY (short) and TLT (long duration) proxies—not official yields.",
  };
}

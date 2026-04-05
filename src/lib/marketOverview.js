import {
  getSnapshot,
  getCustomBars,
  getMarketStatus,
  getIndicesSnapshot,
} from "@/lib/massive";

const TICKERS = {
  indices: [
    { symbol: "I:DJI", label: "Dow Jones" },
    { symbol: "I:SPX", label: "S&P 500" },
    { symbol: "I:NDX", label: "Nasdaq 100" },
  ],
  volatility: [{ symbol: "I:VIX", label: "VIX" }],
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

/** When /v3/snapshot/indices is empty or not entitled, scale liquid ETF proxies to index-style levels. */
const INDEX_ETF_FALLBACK = {
  "I:DJI": { etf: "DIA", scale: 100 },
  "I:SPX": { etf: "SPY", scale: 10 },
  "I:NDX": { etf: "QQQ", scale: 40 },
  "I:VIX": { etf: "VIXY", scale: null },
};

/**
 * Fetches the same payload as GET /api/market/overview (for reuse in server routes).
 */
export async function fetchMarketOverview() {
  const indexSymbols = [
    ...TICKERS.indices.map((t) => t.symbol),
    ...TICKERS.volatility.map((t) => t.symbol),
  ];
  const stockSymbols = [
    ...TICKERS.bonds.map((t) => t.symbol),
    ...TICKERS.commodities.map((t) => t.symbol),
    ...TICKERS.dollar.map((t) => t.symbol),
  ];
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [indexSnapData, snapResults, ...sparkResults] = await Promise.all([
    getIndicesSnapshot(indexSymbols).catch(() => ({ results: [] })),
    Promise.allSettled(stockSymbols.map((s) => getSnapshot(s))),
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

  /**
   * Prefer last trade (and minute bar) over daily close so the quoted price
   * matches Polygon's todaysChange / todaysChangePerc. day.c can lag or diverge
   * slightly from the change fields when both are present.
   *
   * Massive sometimes returns lastTrade.p === 0 as a placeholder; `??` would
   * treat 0 as valid and skip fallbacks — treat non‑positive prices as missing.
   */
  function firstPositivePrice(...candidates) {
    for (const v of candidates) {
      if (v == null) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  function priceFromSnapshot(snap) {
    if (!snap) return null;
    const day = snap.day ?? {};
    const min = snap.min ?? {};
    const lt = snap.lastTrade ?? {};
    const q = snap.lastQuote ?? {};
    const tradePx = lt.p ?? lt.price;
    const quoteMid =
      q.p != null && q.P != null ? (Number(q.p) + Number(q.P)) / 2 : null;
    return firstPositivePrice(
      tradePx,
      min.c,
      quoteMid,
      q.p,
      q.P,
      day.c,
      snap.fmv
    );
  }

  /** @param {Record<string, unknown>} row - one entry from GET /v3/snapshot/indices */
  function snapshotFromIndexRow(row) {
    if (!row || row.error) return null;
    const session = row.session ?? {};
    const prevClose =
      session.previous_close ??
      session.previousClose ??
      null;
    const rawValue = row.value ?? session.close ?? session.last;
    if (rawValue == null) return null;
    const price = Number(rawValue);
    if (!Number.isFinite(price) || price <= 0) return null;
    let change = session.change ?? null;
    const cp =
      session.change_percent ?? session.changePercent ?? null;
    if (
      change == null &&
      prevClose != null &&
      Number.isFinite(price - prevClose)
    ) {
      change = price - prevClose;
    }
    return {
      price,
      change,
      changePercent: cp,
      prevClose,
    };
  }

  /** Last daily close from aggs when index snapshot is missing (e.g. plan not entitled). */
  function snapshotFromBars(bars) {
    const list = bars?.results;
    if (!Array.isArray(list) || list.length === 0) return null;
    const last = list[list.length - 1];
    const prev = list[list.length - 2];
    const c = last?.c;
    if (c == null) return null;
    const price = Number(c);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevClose = prev?.c != null ? Number(prev.c) : null;
    let change =
      prevClose != null && Number.isFinite(price - prevClose)
        ? price - prevClose
        : null;
    let changePercent =
      prevClose != null && prevClose !== 0 && change != null
        ? (change / prevClose) * 100
        : null;
    return { price, change, changePercent, prevClose };
  }

  function snapshotFromEtfScale(snap, scale) {
    if (!snap) return null;
    const prevDay = snap.prevDay ?? {};
    const prevClose = prevDay.c ?? null;
    let price = priceFromSnapshot(snap);
    if (
      price == null &&
      prevClose != null &&
      snap.todaysChange != null &&
      Number.isFinite(prevClose + snap.todaysChange)
    ) {
      price = prevClose + snap.todaysChange;
    }
    if (price == null || !Number.isFinite(price)) return null;
    const scaledPrice = scale != null ? price * scale : price;
    let change = snap.todaysChange ?? null;
    let prevForChange = prevClose;
    if (scale != null && prevClose != null) {
      prevForChange = prevClose * scale;
      change =
        snap.todaysChange != null
          ? snap.todaysChange * scale
          : scaledPrice - prevForChange;
    } else if (scale != null) {
      change =
        snap.todaysChange != null ? snap.todaysChange * scale : null;
    } else {
      change =
        snap.todaysChange ??
        (prevClose != null ? price - prevClose : null);
    }
    let changePercent = snap.todaysChangePerc ?? null;
    if (
      changePercent == null &&
      change != null &&
      prevForChange != null &&
      prevForChange !== 0
    ) {
      changePercent = (change / prevForChange) * 100;
    }
    return {
      price: scaledPrice,
      change,
      changePercent,
      prevClose: prevForChange,
    };
  }

  const snapshots = {};

  for (const row of indexSnapData?.results ?? []) {
    const sym = row?.ticker;
    if (typeof sym !== "string") continue;
    const parsed = snapshotFromIndexRow(row);
    if (parsed) snapshots[sym] = parsed;
  }

  stockSymbols.forEach((symbol, i) => {
    const r = snapResults[i];
    if (r.status !== "fulfilled" || !r.value) return;
    const snap = r.value;
    const prevDay = snap.prevDay ?? {};
    const prevClose = prevDay.c ?? null;
    let price = priceFromSnapshot(snap);
    if (
      price == null &&
      prevClose != null &&
      snap.todaysChange != null &&
      Number.isFinite(prevClose + snap.todaysChange)
    ) {
      price = prevClose + snap.todaysChange;
    }
    snapshots[symbol] = {
      price,
      change:
        snap.todaysChange ??
        (price != null && prevClose != null ? price - prevClose : null),
      changePercent: snap.todaysChangePerc ?? null,
      prevClose,
    };
  });

  TICKERS.indices.forEach(({ symbol }, i) => {
    if (snapshots[symbol]?.price != null) return;
    const fromBars = snapshotFromBars(sparkResults[i]);
    if (fromBars) snapshots[symbol] = fromBars;
  });

  const needEtf = indexSymbols.filter((s) => snapshots[s]?.price == null);
  if (needEtf.length > 0) {
    const etfResults = await Promise.allSettled(
      needEtf.map((sym) => {
        const cfg = INDEX_ETF_FALLBACK[sym];
        return cfg ? getSnapshot(cfg.etf) : Promise.resolve(null);
      })
    );
    needEtf.forEach((sym, i) => {
      const cfg = INDEX_ETF_FALLBACK[sym];
      if (!cfg) return;
      const r = etfResults[i];
      if (r.status !== "fulfilled" || !r.value) return;
      const parsed = snapshotFromEtfScale(r.value, cfg.scale);
      if (parsed) snapshots[sym] = parsed;
    });
  }

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
    note:
      "Index levels prefer official snapshots when available; otherwise they are estimated from daily bars or from liquid ETFs (DIA×100, SPY×10, QQQ×40; VIX uses VIXY). Gold and oil use GLD/USO. Treasuries via SHY/TLT—not official yields.",
  };
}

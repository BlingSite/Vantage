/**
 * Massive.com API client (server-side only).
 * See https://massive.com/docs
 * Set MASSIVE_API_KEY in .env.local (create key at https://massive.com/).
 *
 * Base URL: https://api.massive.com
 * Auth: apiKey query parameter on every request.
 */

const MASSIVE_BASE = "https://api.massive.com";

function getToken() {
  const token = process.env.MASSIVE_API_KEY;
  if (!token) {
    throw new Error(
      "MASSIVE_API_KEY is not set. Get an API key at https://massive.com/"
    );
  }
  return token;
}

/**
 * @param {string} path - e.g. "/v2/snapshot/locale/us/markets/stocks/tickers/AAPL"
 * @param {Record<string, string>} [params] - query params (apiKey is added automatically)
 * @returns {Promise<unknown>}
 */
async function request(path, params = {}) {
  const token = getToken();
  const searchParams = new URLSearchParams({ ...params, apiKey: token });
  const url = `${MASSIVE_BASE}${path}?${searchParams.toString()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Massive API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/**
 * Single ticker snapshot — current price, today's change, volume, prev day, etc.
 * GET /v2/snapshot/locale/us/markets/stocks/tickers/{stocksTicker}
 * @param {string} symbol
 */
export async function getSnapshot(symbol) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  const data = await request(
    `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol.toUpperCase())}`
  );
  return data?.ticker ?? data;
}

/**
 * Full market snapshot — all US stock tickers.
 * GET /v2/snapshot/locale/us/markets/stocks/tickers
 */
export async function getFullMarketSnapshot() {
  return request("/v2/snapshot/locale/us/markets/stocks/tickers");
}

/**
 * Index ticker snapshots (Dow, S&P 500, etc.) — values are index points, not ETF prices.
 * GET /v3/snapshot/indices?ticker.any_of=...
 * @param {string[]} tickers - e.g. ["I:DJI", "I:SPX"]
 */
export async function getIndicesSnapshot(tickers) {
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return { results: [] };
  }
  const tickerAnyOf = tickers
    .map((t) => String(t).trim().toUpperCase())
    .join(",");
  return request("/v3/snapshot/indices", {
    "ticker.any_of": tickerAnyOf,
    limit: String(Math.min(tickers.length, 250)),
  });
}

// ---------------------------------------------------------------------------
// Aggregates / OHLC
// ---------------------------------------------------------------------------

/**
 * Previous trading day's OHLC bar.
 * GET /v2/aggs/ticker/{stocksTicker}/prev
 * @param {string} symbol
 * @param {{ adjusted?: boolean }} [options]
 */
export async function getPreviousDayBar(symbol, options = {}) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  const params = {};
  if (options.adjusted === false) params.adjusted = "false";
  const data = await request(
    `/v2/aggs/ticker/${encodeURIComponent(symbol.toUpperCase())}/prev`,
    params
  );
  const results = data?.results;
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

/**
 * Custom OHLC bars (candlestick data).
 * GET /v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}
 * @param {string} symbol
 * @param {{ multiplier?: number, timespan?: string, from: string, to: string, adjusted?: boolean, sort?: string, limit?: number }} options
 */
export async function getCustomBars(symbol, options) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  const {
    multiplier = 1,
    timespan = "day",
    from,
    to,
    adjusted,
    sort,
    limit,
  } = options;
  if (!from || !to) throw new Error("from and to dates are required");
  const params = {};
  if (adjusted === false) params.adjusted = "false";
  if (sort) params.sort = sort;
  if (limit) params.limit = String(limit);
  return request(
    `/v2/aggs/ticker/${encodeURIComponent(symbol.toUpperCase())}/range/${multiplier}/${timespan}/${from}/${to}`,
    params
  );
}

/**
 * Average daily volume over the last N trading days.
 * Fetches daily bars via getCustomBars and averages the volume.
 * @param {string} symbol
 * @param {number} [days=30]
 * @returns {Promise<number | null>}
 */
export async function getAverageVolume(symbol, days = 30) {
  if (!symbol || typeof symbol !== "string") return null;
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 1.5 * 86400000)
      .toISOString()
      .slice(0, 10);

    const data = await getCustomBars(symbol, {
      timespan: "day",
      from,
      to,
      limit: days,
      sort: "desc",
    });

    const bars = data?.results ?? [];
    if (bars.length === 0) return null;
    const totalVolume = bars.reduce((sum, bar) => sum + (bar.v ?? 0), 0);
    return Math.round(totalVolume / bars.length);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trades & Quotes
// ---------------------------------------------------------------------------

/**
 * Last trade for a stock.
 * GET /v2/last/trade/{stocksTicker}
 * @param {string} symbol
 */
export async function getLastTrade(symbol) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  return request(
    `/v2/last/trade/${encodeURIComponent(symbol.toUpperCase())}`
  );
}

/**
 * Last NBBO quote for a stock.
 * GET /v2/last/nbbo/{stocksTicker}
 * @param {string} symbol
 */
export async function getLastQuote(symbol) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  return request(
    `/v2/last/nbbo/${encodeURIComponent(symbol.toUpperCase())}`
  );
}

// ---------------------------------------------------------------------------
// Reference / Tickers
// ---------------------------------------------------------------------------

/**
 * Ticker overview — company name, description, market cap, branding, etc.
 * GET /v3/reference/tickers/{ticker}
 * @param {string} symbol
 * @param {{ date?: string }} [options]
 */
export async function getTickerOverview(symbol, options = {}) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  const params = {};
  if (options.date) params.date = options.date;
  const data = await request(
    `/v3/reference/tickers/${encodeURIComponent(symbol.toUpperCase())}`,
    params
  );
  return data?.results ?? data;
}

/**
 * Search / list tickers.
 * GET /v3/reference/tickers
 * @param {{ search?: string, type?: string, market?: string, active?: boolean, limit?: number, order?: string, sort?: string }} [options]
 */
export async function searchTickers(options = {}) {
  const params = {};
  if (options.search) params.search = options.search;
  if (options.type) params.type = options.type;
  if (options.market) params.market = options.market;
  if (options.active !== undefined) params.active = String(options.active);
  if (options.limit) params.limit = String(options.limit);
  if (options.order) params.order = options.order;
  if (options.sort) params.sort = options.sort;
  return request("/v3/reference/tickers", params);
}

// ---------------------------------------------------------------------------
// Corporate Actions
// ---------------------------------------------------------------------------

/**
 * Dividends history.
 * GET /v3/reference/dividends
 * @param {string} symbol
 * @param {{ limit?: number, sort?: string, order?: string, frequency?: number }} [options]
 */
export async function getDividends(symbol, options = {}) {
  if (!symbol || typeof symbol !== "string") {
    return { results: [] };
  }
  const params = { ticker: symbol.toUpperCase() };
  if (options.limit) params.limit = String(options.limit);
  if (options.sort) params.sort = options.sort;
  if (options.order) params.order = options.order;
  if (options.frequency) params.frequency = String(options.frequency);
  const data = await request("/v3/reference/dividends", params);
  return data;
}

/**
 * Compute annualized dividend yield from Massive dividends + current price.
 * Takes the last 4 recurring quarterly dividends (or whatever frequency) and
 * annualizes: (sum of last year's dividends / price) * 100.
 * @param {string} symbol
 * @param {number} currentPrice
 * @returns {Promise<number | null>}
 */
export async function getDividendYield(symbol, currentPrice) {
  if (
    !symbol ||
    typeof symbol !== "string" ||
    currentPrice == null ||
    Number(currentPrice) <= 0
  ) {
    return null;
  }
  try {
    const data = await getDividends(symbol, {
      limit: 20,
      sort: "ex_dividend_date",
      order: "desc",
    });
    const results = Array.isArray(data?.results) ? data.results : [];
    console.log(`[DivYield] ${symbol}: price=${currentPrice}, results count=${results.length}`);
    if (results.length > 0) {
      console.log(`[DivYield] ${symbol}: first result=`, JSON.stringify(results[0]));
    }
    if (results.length === 0) return null;

    const recurring = results.filter(
      (d) =>
        d.cash_amount != null &&
        Number(d.cash_amount) > 0 &&
        d.dividend_type !== "SC" &&
        d.dividend_type !== "LT" &&
        d.dividend_type !== "ST"
    );
    console.log(`[DivYield] ${symbol}: recurring count=${recurring.length}`);
    if (recurring.length === 0) return null;

    const freq = recurring[0]?.frequency ?? 4;
    const paymentsPerYear = freq > 0 ? freq : 4;
    const recent = recurring.slice(0, paymentsPerYear);
    const annualDividend = recent.reduce(
      (sum, d) => sum + Number(d.cash_amount),
      0
    );
    console.log(`[DivYield] ${symbol}: freq=${freq}, paymentsPerYear=${paymentsPerYear}, recent=${recent.length}, annualDiv=${annualDividend}`);
    if (annualDividend <= 0) return null;

    const scaleFactor = paymentsPerYear / recent.length;
    const yieldPct = ((annualDividend * scaleFactor) / Number(currentPrice)) * 100;
    console.log(`[DivYield] ${symbol}: scaleFactor=${scaleFactor}, yield=${yieldPct.toFixed(4)}%`);
    return yieldPct;
  } catch (err) {
    console.error(`[DivYield] ${symbol}: error=`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fundamentals
// ---------------------------------------------------------------------------

/**
 * Financial ratios (P/E, EV/EBITDA, dividend yield, etc.).
 * GET /stocks/vX/reference/financials
 * @param {string} symbol
 * @param {{ limit?: number, timeframe?: string, include_sources?: boolean }} [options]
 */
export async function getFinancials(symbol, options = {}) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbol is required");
  }
  const params = { "ticker.any_of": symbol.toUpperCase() };
  if (options.limit) params.limit = String(options.limit);
  if (options.timeframe) params.timeframe = options.timeframe;
  if (options.include_sources) params.include_sources = "true";
  return request("/vX/reference/financials", params);
}

// ---------------------------------------------------------------------------
// Market Operations
// ---------------------------------------------------------------------------

/**
 * Exchanges list.
 * GET /v3/reference/exchanges
 */
export async function getExchanges() {
  return request("/v3/reference/exchanges");
}

/**
 * Market status.
 * GET /v1/marketstatus/now
 */
export async function getMarketStatus() {
  return request("/v1/marketstatus/now");
}

/**
 * Market holidays.
 * GET /v1/marketstatus/upcoming
 */
export async function getMarketHolidays() {
  return request("/v1/marketstatus/upcoming");
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/**
 * Ticker news.
 * GET /v2/reference/news
 * @param {string} symbol
 * @param {{ limit?: number }} [options]
 */
export async function getTickerNews(symbol, options = {}) {
  if (!symbol || typeof symbol !== "string") {
    return { results: [] };
  }
  const params = { ticker: symbol.toUpperCase() };
  if (options.limit) params.limit = String(options.limit);
  return request("/v2/reference/news", params);
}

/**
 * Upcoming earnings (Benzinga partner feed).
 * GET /benzinga/v1/earnings
 * @param {string[]} symbols
 * @param {{ from?: string, limit?: number }} [options] from = YYYY-MM-DD
 */
export async function getBenzingaUpcomingEarnings(symbols, options = {}) {
  const uniq = [...new Set(symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  if (uniq.length === 0) {
    return { results: [] };
  }
  const from = options.from ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const params = {
    "ticker.any_of": uniq.slice(0, 20).join(","),
    "date.gte": from,
    sort: "date.asc",
    limit: String(limit),
  };
  return request("/benzinga/v1/earnings", params);
}

/**
 * General market news (no specific ticker required).
 * GET /v2/reference/news
 * @param {{ limit?: number, ticker?: string, published_utc_gte?: string, published_utc_lte?: string, order?: string, sort?: string }} [options]
 */
export async function getMarketNews(options = {}) {
  const params = {};
  if (options.ticker) params.ticker = options.ticker.toUpperCase();
  if (options.limit) params.limit = String(options.limit);
  if (options.published_utc_gte) params["published_utc.gte"] = options.published_utc_gte;
  if (options.published_utc_lte) params["published_utc.lte"] = options.published_utc_lte;
  if (options.order) params.order = options.order;
  if (options.sort) params.sort = options.sort;
  return request("/v2/reference/news", params);
}

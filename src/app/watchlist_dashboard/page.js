"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VantageLogo from "@/components/VantageLogo";

// Company ticker mark components
const AppleLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00A4EF"/>
  </svg>
);

const TeslaLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#E31937">
    <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 14.111V5.362zm0 0l-2.475-3.026S5.28 2.426 1.054 4.39c1.082 1.636 3.231 2.438 3.231 2.438.146-1.439 1.154-1.79 4.354-1.79L12 14.111V5.362zM12 21.042l-1.657-6.86h3.314L12 21.042z"/>
  </svg>
);

const GoogleLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

function mapStockFromJoin(item, alertSymbols) {
  const stock = item.stocks;
  const symbol = stock?.symbol ?? "???";
  return {
    id: stock?.id,
    watchlistItemId: item.id,
    symbol,
    name: stock?.name ?? `${symbol} Company`,
    price: null,
    change: null,
    changePercent: null,
    volume: stock?.volume ?? null,
    hasAlert: alertSymbols.has(symbol),
  };
}

export default function WatchlistDashboard() {
  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlist, setActiveWatchlist] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tickerInput, setTickerInput] = useState("");
  const [showNewWatchlistModal, setShowNewWatchlistModal] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [dividendYields, setDividendYields] = useState({});
  const [dividendsLoading, setDividendsLoading] = useState(false);
  const [avgVolumes, setAvgVolumes] = useState({});
  const [avgVolumesLoading, setAvgVolumesLoading] = useState(false);
  const [newsIntel, setNewsIntel] = useState({});
  const [newsIntelLoading, setNewsIntelLoading] = useState(false);
  const [expandedStock, setExpandedStock] = useState(null);
  const [activeTab, setActiveTab] = useState("technicals");
  const [technicals, setTechnicals] = useState({});
  const [technicalsLoading, setTechnicalsLoading] = useState(false);
  const [dividendInsights, setDividendInsights] = useState({});
  const [dividendInsightsLoading, setDividendInsightsLoading] = useState(false);
  const [earningsData, setEarningsData] = useState({});
  const [earningsLoading, setEarningsLoading] = useState(false);

  // New watchlist form state
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [newWatchlistIsDefault, setNewWatchlistIsDefault] = useState(false);
  const [newWatchlistIsPublic, setNewWatchlistIsPublic] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: watchlistsData, error: wlError } = await supabase
          .from("watchlists")
          .select("*")
          .order("created_at", { ascending: true });
        if (wlError) throw wlError;

        let alertsData = [];
        const { data: alertsResult, error: alertsError } = await supabase
          .from("alerts")
          .select("*");
        if (!alertsError) alertsData = alertsResult ?? [];

        const alertSymbols = new Set((alertsData ?? []).map((a) => a.symbol));

        const { data: itemsResult, error: itemsError } = await supabase
          .from("watchlist_items")
          .select("*, stocks(*)");
        const itemsData = (!itemsError && itemsResult) ? itemsResult : [];

        const wlList = (watchlistsData ?? []).map((wl) => ({
          id: wl.id,
          name: wl.name,
          isDefault: wl.is_default ?? false,
          isPublic: wl.is_public ?? false,
          createdAt: wl.created_at,
          updatedAt: wl.updated_at,
          stocks: itemsData
            .filter((item) => item.watchlist_id === wl.id)
            .map((item) => mapStockFromJoin(item, alertSymbols)),
        }));

        setWatchlists(wlList);
        setAlerts(alertsData);
        setActiveWatchlist(wlList[0] ?? null);
      } catch (err) {
        console.error("Failed to fetch watchlist data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  // Fetch real-time quotes — Massive.com snapshot
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setQuotesBySymbol({});
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);

    const symbolsParam = encodeURIComponent(symbols.join(","));

    (async () => {
      try {
        const res = await fetch(
          `/api/stock/massive/snapshot?symbols=${symbolsParam}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) {
            const hasData = Object.keys(data).some((k) => data[k]?.c != null);
            if (hasData) {
              setQuotesBySymbol(data);
              return;
            }
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setQuotesBySymbol({});
    })().finally(() => {
      if (!cancelled) setQuotesLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeWatchlist]);

  // Fetch dividend yields — Massive.com
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setDividendYields({});
      return;
    }
    let cancelled = false;
    setDividendsLoading(true);

    const symbolsParam = encodeURIComponent(symbols.join(","));

    (async () => {
      try {
        const res = await fetch(
          `/api/stock/massive/dividends?symbols=${symbolsParam}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) {
            const hasData = Object.values(data).some((v) => v != null);
            if (hasData) {
              setDividendYields(data);
              return;
            }
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setDividendYields({});
    })().finally(() => {
      if (!cancelled) setDividendsLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeWatchlist]);

  // Fetch average volumes
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setAvgVolumes({});
      return;
    }
    let cancelled = false;
    setAvgVolumesLoading(true);

    const symbolsParam = encodeURIComponent(symbols.join(","));

    (async () => {
      try {
        const res = await fetch(`/api/stock/massive/avg-volume?symbols=${symbolsParam}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) {
            setAvgVolumes(data);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setAvgVolumes({});
    })().finally(() => {
      if (!cancelled) setAvgVolumesLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeWatchlist]);

  // Fetch news intelligence (headlines, earnings, dividends, upgrades, insider trades)
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setNewsIntel({});
      return;
    }
    let cancelled = false;
    setNewsIntelLoading(true);

    const symbolsParam = encodeURIComponent(symbols.join(","));

    (async () => {
      try {
        const res = await fetch(`/api/stock/news-intel?symbols=${symbolsParam}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) {
            setNewsIntel(data);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setNewsIntel({});
    })().finally(() => {
      if (!cancelled) setNewsIntelLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeWatchlist]);

  // Fetch technical indicators
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setTechnicals({});
      return;
    }
    let cancelled = false;
    setTechnicalsLoading(true);
    const symbolsParam = encodeURIComponent(symbols.join(","));
    (async () => {
      try {
        const res = await fetch(`/api/stock/technicals?symbols=${symbolsParam}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) { setTechnicals(data); return; }
        }
      } catch {}
      if (!cancelled) setTechnicals({});
    })().finally(() => { if (!cancelled) setTechnicalsLoading(false); });
    return () => { cancelled = true; };
  }, [activeWatchlist]);

  // Fetch dividend insights (annual dividend, payout ratio, growth, history)
  useEffect(() => {
    const symbols = activeWatchlist?.stocks?.map((s) => s.symbol).filter(Boolean) ?? [];
    if (symbols.length === 0) {
      setDividendInsights({});
      return;
    }
    let cancelled = false;
    setDividendInsightsLoading(true);
    const symbolsParam = encodeURIComponent(symbols.join(","));
    (async () => {
      try {
        const res = await fetch(`/api/stock/massive/dividend-insights?symbols=${symbolsParam}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!data.error && !cancelled) { setDividendInsights(data); return; }
        }
      } catch {}
      if (!cancelled) setDividendInsights({});
    })().finally(() => { if (!cancelled) setDividendInsightsLoading(false); });
    return () => { cancelled = true; };
  }, [activeWatchlist]);

  const getRSIColor = (rsi) => {
    if (rsi == null) return "text-gray-400";
    if (rsi >= 70) return "text-red-600";
    if (rsi <= 30) return "text-green-600";
    return "text-gray-900";
  };

  const getRSILabel = (rsi) => {
    if (rsi == null) return "";
    if (rsi >= 70) return "Overbought";
    if (rsi <= 30) return "Oversold";
    return "Neutral";
  };

  const formatMarketCap = (cap) => {
    if (cap == null) return "—";
    if (cap >= 1000000) return `$${(cap / 1000000).toFixed(2)}T`;
    if (cap >= 1000) return `$${(cap / 1000).toFixed(2)}B`;
    return `$${cap.toFixed(0)}M`;
  };

  const getStockLogo = (symbol) => {
    switch (symbol) {
      case "AAPL":
        return <AppleLogo />;
      case "MSFT":
        return <MicrosoftLogo />;
      case "TSLA":
        return <TeslaLogo />;
      case "GOOG":
        return <GoogleLogo />;
      default:
        return (
          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
            {symbol.charAt(0)}
          </div>
        );
    }
  };

  const handleAddSymbol = async () => {
    if (!tickerInput.trim() || !activeWatchlist) return;

    const wlId = activeWatchlist.id;
    const symbol = tickerInput.toUpperCase().trim();
    if (activeWatchlist.stocks.some((s) => s.symbol === symbol)) {
      setTickerInput("");
      return;
    }

    try {
      let stockRow;
      const { data: existing } = await supabase
        .from("stocks")
        .select("*")
        .eq("symbol", symbol)
        .maybeSingle();

      if (existing) {
        stockRow = existing;
      } else {
        const { data: newStock, error: stockErr } = await supabase
          .from("stocks")
          .insert({ symbol, name: `${symbol} Company` })
          .select()
          .single();
        if (stockErr) throw stockErr;
        stockRow = newStock;
      }

      // Fetch company name — Massive.com ticker overview
      try {
        let name = null;
        const tickerRes = await fetch(`/api/stock/massive/ticker?symbol=${encodeURIComponent(symbol)}`);
        if (tickerRes.ok) {
          const tickerData = await tickerRes.json();
          if (tickerData?.name && !tickerData.error) name = tickerData.name;
        }
        if (name) {
          await supabase.from("stocks").update({ name }).eq("id", stockRow.id);
          stockRow.name = name;
        }
      } catch {
        // ignore profile failure
      }

      const nextPosition = (activeWatchlist.stocks?.length ?? 0) + 1;
      const { data: item, error: itemErr } = await supabase
        .from("watchlist_items")
        .insert({
          watchlist_id: wlId,
          stock_id: stockRow.id,
          position: nextPosition,
        })
        .select("*, stocks(*)")
        .single();
      if (itemErr) throw itemErr;

      const alertSymbols = new Set(alerts.map((a) => a.symbol));
      const newStock = mapStockFromJoin(item, alertSymbols);
      const updatedWatchlists = watchlists.map((wl) =>
        wl.id === wlId ? { ...wl, stocks: [...wl.stocks, newStock] } : wl
      );
      setWatchlists(updatedWatchlists);
      setActiveWatchlist(updatedWatchlists.find((wl) => wl.id === wlId));
      setTickerInput("");
    } catch (err) {
      console.error("Failed to add symbol:", err);
    }
  };

  const handleRemoveStock = async (symbol) => {
    if (!activeWatchlist) return;

    const stock = activeWatchlist.stocks.find((s) => s.symbol === symbol);
    if (!stock) return;

    try {
      let deleted = false;

      if (stock.watchlistItemId) {
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("id", stock.watchlistItemId);
        if (error) {
          console.error("watchlist_items delete failed:", error);
        } else {
          deleted = true;
        }
      }

      if (!deleted && stock.id) {
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("watchlist_id", activeWatchlist.id)
          .eq("stock_id", stock.id);
        if (error) {
          console.error("watchlist_items delete by stock_id failed:", error);
        } else {
          deleted = true;
        }
      }

      if (!deleted) {
        console.error("Could not delete stock from DB, watchlistItemId:", stock.watchlistItemId, "stockId:", stock.id);
      }

      // Clean up alerts (non-blocking)
      supabase.from("alerts").delete().eq("symbol", symbol).then(({ error }) => {
        if (error) console.error("alerts cleanup failed:", error);
      });

      const updatedWatchlists = watchlists.map((wl) =>
        wl.id === activeWatchlist.id ? { ...wl, stocks: wl.stocks.filter((s) => s.symbol !== symbol) } : wl
      );
      setWatchlists(updatedWatchlists);
      setActiveWatchlist(updatedWatchlists.find((wl) => wl.id === activeWatchlist.id));
      setAlerts((prev) => prev.filter((a) => a.symbol !== symbol));
    } catch (err) {
      console.error("Failed to remove stock:", err);
    }
  };

  const handleSetAlert = async (symbol) => {
    const stock = activeWatchlist?.stocks?.find((s) => s.symbol === symbol);
    if (!stock || !activeWatchlist) return;

    const hasExistingAlert = alerts.some((a) => a.symbol === symbol);
    const currentPrice = quotesBySymbol[symbol]?.c ?? parseFloat(stock.price);
    if (!hasExistingAlert && (currentPrice == null || isNaN(currentPrice))) return;

    try {
      if (hasExistingAlert) {
        await supabase.from("alerts").delete().eq("symbol", symbol);
        setAlerts((prev) => prev.filter((a) => a.symbol !== symbol));
      } else {
        const value = Math.round(Number(currentPrice) * 1.1);
        const { data, error } = await supabase
          .from("alerts")
          .insert({ symbol, type: "price_above", value })
          .select()
          .single();
        if (error) throw error;
        setAlerts((prev) => [...prev, data]);
      }

      const updatedWatchlists = watchlists.map((wl) =>
        wl.id === activeWatchlist.id
          ? {
              ...wl,
              stocks: wl.stocks.map((s) =>
                s.symbol === symbol ? { ...s, hasAlert: !hasExistingAlert } : s
              ),
            }
          : wl
      );
      setWatchlists(updatedWatchlists);
      setActiveWatchlist(updatedWatchlists.find((wl) => wl.id === activeWatchlist.id));
    } catch (err) {
      console.error("Failed to update alert:", err);
    }
  };

  const selectWatchlist = (watchlist) => {
    setActiveWatchlist(watchlist);
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) return;

    if (watchlists.some((wl) => wl.name.toLowerCase() === newWatchlistName.trim().toLowerCase())) {
      return;
    }

    try {
      if (newWatchlistIsDefault && watchlists.length > 0) {
        await supabase.from("watchlists").update({ is_default: false });
      }

      const TEMP_USER_ID = "58ede164-6746-4c6b-80d8-2fcdb8569dd5";
      const { data, error } = await supabase
        .from("watchlists")
        .insert({
          name: newWatchlistName.trim(),
          is_default: newWatchlistIsDefault,
          is_public: newWatchlistIsPublic,
          user_id: TEMP_USER_ID,
        })
        .select()
        .single();
      if (error) throw error;

      const newWatchlist = {
        id: data.id,
        name: data.name,
        isDefault: data.is_default ?? false,
        isPublic: data.is_public ?? false,
        stocks: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      const updatedWatchlists = newWatchlistIsDefault
        ? watchlists.map((wl) => ({ ...wl, isDefault: false })).concat(newWatchlist)
        : [...watchlists, newWatchlist];

      setWatchlists(updatedWatchlists);
      setActiveWatchlist(newWatchlist);

      setNewWatchlistName("");
      setNewWatchlistIsDefault(false);
      setNewWatchlistIsPublic(false);
      setShowNewWatchlistModal(false);
    } catch (err) {
      console.error("Failed to create watchlist:", err);
    }
  };

  const closeNewWatchlistModal = () => {
    setNewWatchlistName("");
    setNewWatchlistIsDefault(false);
    setNewWatchlistIsPublic(false);
    setShowNewWatchlistModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="block min-w-0 max-w-full" aria-label="Vantage home">
            <VantageLogo className="h-8 w-auto max-w-full" />
          </Link>
        </div>

        {/* Watchlists Section */}
        <div className="flex-1 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">My Watchlists</h3>
          
          {/* New Watchlist Button */}
          <div className="relative mb-4">
            <button
              onClick={() => setShowNewWatchlistModal(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Watchlist
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Watchlist Items */}
          <nav className="space-y-1">
            {watchlists.map((watchlist) => (
              <button
                key={watchlist.id}
                onClick={() => selectWatchlist(watchlist)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeWatchlist.id === watchlist.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {watchlist.name === "Tech Stocks" && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
                  </svg>
                )}
                {watchlist.name === "Dividend Stocks" && (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                  </svg>
                )}
                {watchlist.name === "Energy" && (
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                  </svg>
                )}
                <span className="flex-1 text-left">{watchlist.name}</span>
                {watchlist.isDefault && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Deflt</span>
                )}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            ))}
          </nav>

          {/* Alerts Section */}
          <div className="mt-6">
            <button
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="flex-1 text-left">Alerts</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showAlertsDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAlertsDropdown && (
              <div className="mt-2 ml-6 text-sm text-gray-600">
                <div className="flex items-center gap-2 py-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {alerts.length} Active Alerts
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="relative max-w-2xl">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8">
          {/* Watchlist Title */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">{activeWatchlist?.name ?? "My Watchlists"}</h1>

          {/* Add Symbol Input */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
              placeholder="Enter ticker symbol..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddSymbol}
              disabled={!activeWatchlist}
              className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Symbol
            </button>
          </div>

          {/* Stocks Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Symbol</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Price</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Change</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Dividend Yield</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Avg Volume</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeWatchlist?.stocks ?? []).map((stock) => (
                  <tr key={stock.symbol} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getStockLogo(stock.symbol)}
                        <span className="font-semibold text-gray-900">{stock.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{stock.name}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {quotesBySymbol[stock.symbol]?.c != null
                        ? `$${Number(quotesBySymbol[stock.symbol].c).toFixed(2)}`
                        : quotesLoading ? "…" : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {quotesBySymbol[stock.symbol]?.c != null ? (
                        <span className={(quotesBySymbol[stock.symbol].d ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                          {(quotesBySymbol[stock.symbol].d ?? 0) >= 0 ? "+" : ""}
                          {Number(quotesBySymbol[stock.symbol].d ?? 0).toFixed(2)} (
                          {(quotesBySymbol[stock.symbol].dp ?? 0) >= 0 ? "+" : ""}
                          {Number(quotesBySymbol[stock.symbol].dp ?? 0).toFixed(2)}%)
                        </span>
                      ) : quotesLoading ? (
                        <span className="text-gray-400">…</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 tabular-nums">
                      {(() => {
                        const dy = dividendYields[stock.symbol];
                        if (dy != null && Number(dy) >= 0) return `${Number(dy).toFixed(2)}%`;
                        return dividendsLoading ? "…" : "—";
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 tabular-nums">
                      {(() => {
                        const vol = avgVolumes[stock.symbol];
                        if (vol != null && Number(vol) >= 0) return Number(vol).toLocaleString();
                        return avgVolumesLoading ? "…" : "—";
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveStock(stock.symbol)}
                        className="px-4 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {(activeWatchlist?.stocks?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {activeWatchlist
                        ? "No stocks in this watchlist. Add a ticker symbol above to get started."
                        : "Create a watchlist using the sidebar to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tab Navigation — below watchlist */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {[
              { id: "technicals", label: "Technical Indicators" },
              { id: "news", label: "Latest News" },
              { id: "dividends", label: "Dividend Insights" },
              { id: "earnings", label: "Earnings Calendar" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== TECHNICAL INDICATORS TAB ===== */}
          {activeTab === "technicals" && (
            <div>
              {technicalsLoading && (activeWatchlist?.stocks?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  <div className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading technical indicators...
                  </div>
                </div>
              )}

              {!technicalsLoading && (activeWatchlist?.stocks?.length ?? 0) === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  Add stocks to your watchlist to see technical indicators.
                </div>
              )}

              {(activeWatchlist?.stocks ?? []).length > 0 && !technicalsLoading && (
                <div className="space-y-5">
                  {(activeWatchlist?.stocks ?? []).map((stock) => {
                    const t = technicals[stock.symbol];
                    const quote = quotesBySymbol[stock.symbol];
                    const price = t?.currentPrice ?? quote?.c ?? null;

                    return (
                      <div key={stock.symbol} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Stock Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStockLogo(stock.symbol)}
                            <div>
                              <span className="font-semibold text-gray-900 text-lg">{stock.symbol}</span>
                              <span className="text-gray-500 ml-2 text-sm">{stock.name}</span>
                            </div>
                          </div>
                          {price != null && (
                            <div className="text-right">
                              <div className="text-xl font-semibold text-gray-900 tabular-nums">${Number(price).toFixed(2)}</div>
                              {quote?.d != null && (
                                <div className={`text-sm font-medium tabular-nums ${(quote.d ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {(quote.d ?? 0) >= 0 ? "+" : ""}{Number(quote.d).toFixed(2)} ({(quote.dp ?? 0) >= 0 ? "+" : ""}{Number(quote.dp ?? 0).toFixed(2)}%)
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!t ? (
                          <div className="p-6 text-sm text-gray-400">Loading indicators...</div>
                        ) : (
                          <div className="p-6">
                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">{formatMarketCap(t.marketCap)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">P/E Ratio</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">{t.peRatio != null ? Number(t.peRatio).toFixed(2) : "—"}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Beta</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">{t.beta != null ? Number(t.beta).toFixed(2) : "—"}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">RSI (14)</div>
                                <div className={`text-lg font-semibold mt-1 tabular-nums ${getRSIColor(t.rsi)}`}>{t.rsi != null ? t.rsi : "—"}</div>
                                {t.rsi != null && <div className={`text-xs font-medium ${getRSIColor(t.rsi)}`}>{getRSILabel(t.rsi)}</div>}
                              </div>
                            </div>

                            {/* 52-Week Range */}
                            <div className="mb-6">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">52-Week Range</div>
                              {t.week52High != null && t.week52Low != null ? (
                                <div>
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 tabular-nums">${Number(t.week52Low).toFixed(2)}</span>
                                    <span className="font-medium text-gray-700 tabular-nums">${Number(t.week52High).toFixed(2)}</span>
                                  </div>
                                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-linear-to-r from-red-300 via-yellow-300 to-green-300 rounded-full opacity-60 w-full" />
                                    {price != null && t.week52High !== t.week52Low && (
                                      <div
                                        className="absolute top-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow"
                                        style={{
                                          left: `${Math.min(100, Math.max(0, ((price - t.week52Low) / (t.week52High - t.week52Low)) * 100))}%`,
                                          transform: "translate(-50%, -50%)",
                                        }}
                                      />
                                    )}
                                  </div>
                                  {price != null && (
                                    <div className="text-center text-xs text-gray-500 mt-1">
                                      Current: <span className="font-medium text-gray-700">${Number(price).toFixed(2)}</span>
                                      {" · "}
                                      {Number(((price - t.week52Low) / (t.week52High - t.week52Low) * 100).toFixed(0))}% of range
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">—</div>
                              )}
                            </div>

                            {/* MAs and Support/Resistance */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="border border-gray-200 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">50-Day SMA</div>
                                <div className="text-base font-semibold text-gray-900 mt-1 tabular-nums">{t.sma50 != null ? `$${Number(t.sma50).toFixed(2)}` : "—"}</div>
                                {t.sma50 != null && price != null && (
                                  <div className={`text-xs font-medium mt-0.5 ${price > t.sma50 ? "text-green-600" : "text-red-600"}`}>
                                    Price is {price > t.sma50 ? "above" : "below"}
                                  </div>
                                )}
                              </div>
                              <div className="border border-gray-200 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">200-Day SMA</div>
                                <div className="text-base font-semibold text-gray-900 mt-1 tabular-nums">{t.sma200 != null ? `$${Number(t.sma200).toFixed(2)}` : "—"}</div>
                                {t.sma200 != null && price != null && (
                                  <div className={`text-xs font-medium mt-0.5 ${price > t.sma200 ? "text-green-600" : "text-red-600"}`}>
                                    Price is {price > t.sma200 ? "above" : "below"}
                                  </div>
                                )}
                              </div>
                              <div className="border border-gray-200 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Support</div>
                                <div className="text-base font-semibold text-green-700 mt-1 tabular-nums">{t.support != null ? `$${Number(t.support).toFixed(2)}` : "—"}</div>
                                {t.support != null && price != null && (
                                  <div className="text-xs text-gray-500 mt-0.5">{((1 - t.support / price) * 100).toFixed(1)}% below</div>
                                )}
                              </div>
                              <div className="border border-gray-200 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resistance</div>
                                <div className="text-base font-semibold text-red-700 mt-1 tabular-nums">{t.resistance != null ? `$${Number(t.resistance).toFixed(2)}` : "—"}</div>
                                {t.resistance != null && price != null && (
                                  <div className="text-xs text-gray-500 mt-0.5">{((t.resistance / price - 1) * 100).toFixed(1)}% above</div>
                                )}
                              </div>
                            </div>

                            {/* MA Cross Signal */}
                            {t.sma50 != null && t.sma200 != null && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm">
                                  {t.sma50 > t.sma200 ? (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Golden Cross</span>
                                      <span className="text-gray-500">50-day SMA is above 200-day SMA — bullish signal</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Death Cross</span>
                                      <span className="text-gray-500">50-day SMA is below 200-day SMA — bearish signal</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== LATEST NEWS TAB ===== */}
          {activeTab === "news" && (
            <div>
              {newsIntelLoading && (activeWatchlist?.stocks?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  Loading news & intelligence data...
                </div>
              )}

              {!newsIntelLoading && (activeWatchlist?.stocks?.length ?? 0) === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  Add stocks to your watchlist to see latest news.
                </div>
              )}

              {(activeWatchlist?.stocks ?? []).length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(activeWatchlist?.stocks ?? []).map((stock) => {
                    const intel = newsIntel[stock.symbol];
                    const isExpanded = expandedStock === stock.symbol;
                    if (!isExpanded && expandedStock != null) return null;

                    return (
                      <div
                        key={stock.symbol}
                        className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${isExpanded ? "lg:col-span-2" : ""}`}
                      >
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                          <div className="flex items-center gap-2">
                            {getStockLogo(stock.symbol)}
                            <span className="font-semibold text-gray-900">{stock.symbol}</span>
                            <span className="text-sm text-gray-500">{stock.name}</span>
                          </div>
                          <button
                            onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {isExpanded ? "Collapse" : "Expand"}
                          </button>
                        </div>

                        {!intel && newsIntelLoading ? (
                          <div className="p-5 text-sm text-gray-400">Loading...</div>
                        ) : !intel ? (
                          <div className="p-5 text-sm text-gray-400">No data available</div>
                        ) : (
                          <div className={`${isExpanded ? "grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100" : ""}`}>
                            <div className="p-5">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Headlines</h4>
                              {intel.news?.length > 0 ? (
                                <ul className="space-y-2">
                                  {intel.news.slice(0, isExpanded ? 5 : 3).map((article, i) => (
                                    <li key={i}>
                                      <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-gray-700 hover:text-blue-600 transition-colors line-clamp-2 block"
                                      >
                                        {article.title}
                                      </a>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {article.source && <span className="text-xs text-gray-400">{article.source}</span>}
                                        {article.date && (
                                          <span className="text-xs text-gray-400">
                                            {new Date(article.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400">No recent headlines</p>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="p-5 space-y-5">
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Key Dates</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                                        </svg>
                                        Earnings Date
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {intel.earningsDate ? (
                                          <>
                                            {new Date(intel.earningsDate.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            {intel.earningsDate.hour && (
                                              <span className="text-xs text-gray-400 ml-1">
                                                ({intel.earningsDate.hour === "bmo" ? "Before Market" : intel.earningsDate.hour === "amc" ? "After Market" : intel.earningsDate.hour})
                                              </span>
                                            )}
                                          </>
                                        ) : <span className="text-gray-400">—</span>}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                                        </svg>
                                        {intel.upcomingDividend?.upcoming ? "Next Dividend" : "Last Dividend"}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {intel.upcomingDividend ? (
                                          <>
                                            {intel.upcomingDividend.exDate
                                              ? new Date(intel.upcomingDividend.exDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                              : "—"}
                                            {intel.upcomingDividend.amount != null && (
                                              <span className="text-xs text-gray-500 ml-1">(${Number(intel.upcomingDividend.amount).toFixed(2)})</span>
                                            )}
                                          </>
                                        ) : <span className="text-gray-400">—</span>}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Analyst Actions</h4>
                                  {intel.upgrades?.length > 0 ? (
                                    <div className="space-y-2">
                                      {intel.upgrades.slice(0, 4).map((u, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                            u.action === "upgrade" ? "bg-green-100 text-green-700" :
                                            u.action === "downgrade" ? "bg-red-100 text-red-700" :
                                            u.action === "init" ? "bg-blue-100 text-blue-700" :
                                            "bg-gray-100 text-gray-600"
                                          }`}>
                                            {u.action === "upgrade" ? "↑" : u.action === "downgrade" ? "↓" : "●"} {u.action}
                                          </span>
                                          <span className="text-gray-700 truncate flex-1">{u.company}</span>
                                          {u.fromGrade && u.toGrade && <span className="text-xs text-gray-400 whitespace-nowrap">{u.fromGrade} → {u.toGrade}</span>}
                                          {!u.fromGrade && u.toGrade && <span className="text-xs text-gray-400 whitespace-nowrap">{u.toGrade}</span>}
                                          {u.date && <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(u.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-sm text-gray-400">No recent analyst actions</p>}
                                </div>

                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Insider Trades</h4>
                                  {intel.insiderTrades?.length > 0 ? (
                                    <div className="space-y-2">
                                      {intel.insiderTrades.slice(0, 4).map((tr, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                            (tr.change ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                          }`}>
                                            {(tr.change ?? 0) > 0 ? "Buy" : "Sell"}
                                          </span>
                                          <span className="text-gray-700 truncate flex-1">{tr.name}</span>
                                          {tr.value != null && tr.value > 0 && (
                                            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                              ${tr.value >= 1000000 ? `${(tr.value / 1000000).toFixed(1)}M` : tr.value >= 1000 ? `${(tr.value / 1000).toFixed(0)}K` : tr.value.toLocaleString()}
                                            </span>
                                          )}
                                          {tr.transactionDate && <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(tr.transactionDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-sm text-gray-400">No recent insider trades</p>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== DIVIDEND INSIGHTS TAB ===== */}
          {activeTab === "dividends" && (
            <div>
              {dividendInsightsLoading && (activeWatchlist?.stocks?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  <div className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading dividend insights...
                  </div>
                </div>
              )}

              {!dividendInsightsLoading && (activeWatchlist?.stocks?.length ?? 0) === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  Add stocks to your watchlist to see dividend insights.
                </div>
              )}

              {(activeWatchlist?.stocks ?? []).length > 0 && !dividendInsightsLoading && (
                <div className="space-y-5">
                  {(activeWatchlist?.stocks ?? []).map((stock) => {
                    const insight = dividendInsights[stock.symbol];
                    const exDateFallback = newsIntel[stock.symbol]?.upcomingDividend?.exDate ?? null;
                    const effectiveExDate = insight?.exDividendDate ?? exDateFallback;

                    return (
                      <div key={stock.symbol} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Stock Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStockLogo(stock.symbol)}
                            <div>
                              <span className="font-semibold text-gray-900 text-lg">{stock.symbol}</span>
                              <span className="text-gray-500 ml-2 text-sm">{stock.name}</span>
                            </div>
                          </div>
                          {insight?.annualDividend != null && (
                            <div className="text-right">
                              <div className="text-xl font-semibold text-gray-900 tabular-nums">${insight.annualDividend.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">Annual Dividend</div>
                            </div>
                          )}
                        </div>

                        {!insight ? (
                          <div className="p-6 text-sm text-gray-400">
                            {dividendInsightsLoading ? "Loading..." : "No dividend data available"}
                          </div>
                        ) : insight.annualDividend == null ? (
                          <div className="p-6 text-sm text-gray-400">This stock does not pay dividends.</div>
                        ) : (
                          <div className="p-6">
                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Dividend</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">
                                  ${insight.annualDividend.toFixed(2)}
                                </div>
                                {insight.frequency && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {insight.frequency === 12 ? "Monthly" : insight.frequency === 4 ? "Quarterly" : insight.frequency === 2 ? "Semi-Annual" : insight.frequency === 1 ? "Annual" : `${insight.frequency}x/yr`}
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Ratio</div>
                                <div className={`text-lg font-semibold mt-1 tabular-nums ${
                                  insight.payoutRatio == null ? "text-gray-400"
                                    : insight.payoutRatio > 0.8 ? "text-red-600"
                                    : insight.payoutRatio > 0.6 ? "text-amber-600"
                                    : "text-green-600"
                                }`}>
                                  {insight.payoutRatio != null ? `${(insight.payoutRatio * 100).toFixed(1)}%` : "—"}
                                </div>
                                {insight.payoutRatio != null && (
                                  <div className={`text-xs mt-0.5 ${
                                    insight.payoutRatio > 0.8 ? "text-red-500" : insight.payoutRatio > 0.6 ? "text-amber-500" : "text-green-500"
                                  }`}>
                                    {insight.payoutRatio > 0.8 ? "High" : insight.payoutRatio > 0.6 ? "Moderate" : "Sustainable"}
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dividend Growth</div>
                                <div className={`text-lg font-semibold mt-1 tabular-nums ${
                                  insight.growthRate == null ? "text-gray-400"
                                    : insight.growthRate > 0 ? "text-green-600"
                                    : insight.growthRate < 0 ? "text-red-600"
                                    : "text-gray-900"
                                }`}>
                                  {insight.growthRate != null
                                    ? `${insight.growthRate >= 0 ? "+" : ""}${(insight.growthRate * 100).toFixed(1)}%`
                                    : "—"}
                                </div>
                                {insight.growthRate != null && (
                                  <div className="text-xs text-gray-400 mt-0.5">5-Year CAGR</div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ex-Dividend Date</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1">
                                  {effectiveExDate
                                    ? new Date(effectiveExDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                    : "—"}
                                </div>
                                {effectiveExDate && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {(() => {
                                      const exDate = new Date(effectiveExDate + "T00:00:00");
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const diffDays = Math.round((exDate - today) / 86400000);
                                      if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
                                      if (diffDays === 0) return "Today";
                                      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dividend History Chart */}
                            {insight.history?.length > 1 && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                  Dividend History {!insight.frequency && "(Annual)"}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  {(() => {
                                    const history = [...insight.history].reverse().slice(-12);
                                    const maxAmount = Math.max(...history.map((h) => h.amount));
                                    const chartHeight = 140;
                                    const gap = 6;
                                    const barWidth = Math.min(48, Math.max(16, (700 - history.length * gap) / history.length));
                                    const chartWidth = history.length * (barWidth + gap);

                                    return (
                                      <div className="overflow-x-auto">
                                        <svg width={chartWidth} height={chartHeight + 36} className="min-w-full">
                                          {history.map((h, i) => {
                                            const barHeight = maxAmount > 0 ? (h.amount / maxAmount) * chartHeight : 0;
                                            const x = i * (barWidth + gap);
                                            const y = chartHeight - barHeight;
                                            const year = h.date?.slice(0, 4) ?? "";

                                            return (
                                              <g key={i}>
                                                <rect
                                                  x={x}
                                                  y={y}
                                                  width={barWidth}
                                                  height={barHeight}
                                                  rx={3}
                                                  className="fill-blue-400 hover:fill-blue-500 transition-colors cursor-default"
                                                />
                                                <title>{`$${h.amount.toFixed(2)} — ${h.date}`}</title>
                                                <text
                                                  x={x + barWidth / 2}
                                                  y={chartHeight + 16}
                                                  textAnchor="middle"
                                                  className="fill-gray-400"
                                                  style={{ fontSize: "10px" }}
                                                >
                                                  {year}
                                                </text>
                                                <text
                                                  x={x + barWidth / 2}
                                                  y={y - 5}
                                                  textAnchor="middle"
                                                  className="fill-gray-500"
                                                  style={{ fontSize: "10px" }}
                                                >
                                                  ${h.amount.toFixed(2)}
                                                </text>
                                              </g>
                                            );
                                          })}
                                        </svg>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== EARNINGS CALENDAR TAB ===== */}
          {activeTab === "earnings" && (
            <div>
              {earningsLoading && (activeWatchlist?.stocks?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  <div className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading earnings data...
                  </div>
                </div>
              )}

              {!earningsLoading && (activeWatchlist?.stocks?.length ?? 0) === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  Add stocks to your watchlist to see earnings calendar.
                </div>
              )}

              {(activeWatchlist?.stocks ?? []).length > 0 && !earningsLoading && (
                <div className="space-y-5">
                  {(activeWatchlist?.stocks ?? []).map((stock) => {
                    const ed = earningsData[stock.symbol];

                    return (
                      <div key={stock.symbol} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Stock Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStockLogo(stock.symbol)}
                            <div>
                              <span className="font-semibold text-gray-900 text-lg">{stock.symbol}</span>
                              <span className="text-gray-500 ml-2 text-sm">{stock.name}</span>
                            </div>
                          </div>
                          {ed?.nextEarnings?.date && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(ed.nextEarnings.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ed.nextEarnings.hour === "bmo" ? "Before Market Open" : ed.nextEarnings.hour === "amc" ? "After Market Close" : "Next Earnings"}
                              </div>
                            </div>
                          )}
                        </div>

                        {!ed ? (
                          <div className="p-6 text-sm text-gray-400">
                            {earningsLoading ? "Loading..." : "No earnings data available"}
                          </div>
                        ) : (
                          <div className="p-6">
                            {/* Key Metrics Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Next Earnings</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1">
                                  {ed.nextEarnings?.date
                                    ? new Date(ed.nextEarnings.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                    : "—"}
                                </div>
                                {ed.nextEarnings?.date && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {(() => {
                                      const earningsDate = new Date(ed.nextEarnings.date + "T00:00:00");
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const diffDays = Math.round((earningsDate - today) / 86400000);
                                      if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
                                      if (diffDays === 0) return "Today";
                                      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
                                    })()}
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expected EPS</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">
                                  {ed.nextEarnings?.epsEstimate != null
                                    ? `$${ed.nextEarnings.epsEstimate.toFixed(2)}`
                                    : "—"}
                                </div>
                                {ed.nextEarnings?.epsEstimate != null && ed.previousEps != null && (
                                  <div className={`text-xs mt-0.5 ${ed.nextEarnings.epsEstimate >= ed.previousEps ? "text-green-500" : "text-red-500"}`}>
                                    {ed.nextEarnings.epsEstimate >= ed.previousEps ? "↑" : "↓"} vs prev ${ed.previousEps.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Previous EPS</div>
                                <div className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">
                                  {ed.previousEps != null ? `$${ed.previousEps.toFixed(2)}` : "—"}
                                </div>
                                {ed.epsTTM != null && (
                                  <div className="text-xs text-gray-400 mt-0.5">TTM: ${ed.epsTTM.toFixed(2)}</div>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Surprise</div>
                                <div className={`text-lg font-semibold mt-1 tabular-nums ${
                                  (() => {
                                    const vals = (ed.history ?? []).filter((h) => h.surprisePercent != null).map((h) => h.surprisePercent);
                                    if (vals.length === 0) return "text-gray-400";
                                    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                                    return avg >= 0 ? "text-green-600" : "text-red-600";
                                  })()
                                }`}>
                                  {(() => {
                                    const vals = (ed.history ?? []).filter((h) => h.surprisePercent != null).map((h) => h.surprisePercent);
                                    if (vals.length === 0) return "—";
                                    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                                    return `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`;
                                  })()}
                                </div>
                                {ed.history?.length > 0 && (
                                  <div className="text-xs text-gray-400 mt-0.5">Last {ed.history.filter((h) => h.surprisePercent != null).length} quarters</div>
                                )}
                              </div>
                            </div>

                            {/* Earnings History — Surprise Chart */}
                            {ed.history?.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quarterly Earnings History</div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                          <th className="text-left pb-3 font-medium">Quarter</th>
                                          <th className="text-right pb-3 font-medium">Estimate</th>
                                          <th className="text-right pb-3 font-medium">Actual</th>
                                          <th className="text-right pb-3 font-medium">Surprise</th>
                                          <th className="text-right pb-3 font-medium pl-4 w-36">Surprise %</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {[...ed.history].reverse().map((h, i) => {
                                          const beat = h.surprisePercent != null && h.surprisePercent >= 0;
                                          const barWidth = h.surprisePercent != null
                                            ? Math.min(100, Math.abs(h.surprisePercent) * 5)
                                            : 0;

                                          return (
                                            <tr key={i}>
                                              <td className="py-2.5 text-gray-700 font-medium">
                                                Q{h.quarter} {h.year}
                                              </td>
                                              <td className="py-2.5 text-right text-gray-500 tabular-nums">
                                                {h.estimate != null ? `$${h.estimate.toFixed(2)}` : "—"}
                                              </td>
                                              <td className="py-2.5 text-right font-medium text-gray-900 tabular-nums">
                                                {h.actual != null ? `$${h.actual.toFixed(2)}` : "—"}
                                              </td>
                                              <td className={`py-2.5 text-right tabular-nums ${beat ? "text-green-600" : "text-red-600"}`}>
                                                {h.surprise != null
                                                  ? `${h.surprise >= 0 ? "+" : ""}$${h.surprise.toFixed(2)}`
                                                  : "—"}
                                              </td>
                                              <td className="py-2.5 pl-4">
                                                {h.surprisePercent != null ? (
                                                  <div className="flex items-center gap-2 justify-end">
                                                    <span className={`text-xs font-medium tabular-nums ${beat ? "text-green-600" : "text-red-600"}`}>
                                                      {h.surprisePercent >= 0 ? "+" : ""}{h.surprisePercent.toFixed(2)}%
                                                    </span>
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                                                      {beat ? (
                                                        <div
                                                          className="h-full bg-green-400 rounded-full ml-auto"
                                                          style={{ width: `${barWidth}%` }}
                                                        />
                                                      ) : (
                                                        <div
                                                          className="h-full bg-red-400 rounded-full"
                                                          style={{ width: `${barWidth}%` }}
                                                        />
                                                      )}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-400">—</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* New Watchlist Modal */}
      {showNewWatchlistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Watchlist</h2>
            <p className="text-gray-500 text-sm mb-6">
              Create a new watchlist to organize and track your favorite stocks.
            </p>

            <div className="space-y-5">
              {/* Watchlist Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Watchlist Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="e.g., Tech Stocks, Dividend Portfolio"
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">{newWatchlistName.length}/200 characters</p>
              </div>

              {/* Set as Default */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewWatchlistIsDefault(!newWatchlistIsDefault)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newWatchlistIsDefault ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newWatchlistIsDefault ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Set as default</span>
                    <p className="text-xs text-gray-500">This watchlist will be shown first when you open the app</p>
                  </div>
                </label>
              </div>

              {/* Make Public */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewWatchlistIsPublic(!newWatchlistIsPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newWatchlistIsPublic ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newWatchlistIsPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Make public</span>
                    <p className="text-xs text-gray-500">Allow others to view this watchlist</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={closeNewWatchlistModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                disabled={!newWatchlistName.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Watchlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

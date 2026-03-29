"use client";

import AIMarketAnalystPanel from "@/components/AIMarketAnalystPanel";
import AskMarketChat from "@/components/AskMarketChat";
import MarketBreadth from "@/components/MarketBreadth";
import MarketOverviewPanel from "@/components/MarketOverviewPanel";
import TrendAnalysis from "@/components/TrendAnalysis";

export default function MarketsPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Markets
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Market data &amp; tools
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Indices, breadth, trends, and AI-assisted market context.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6">
        <MarketOverviewPanel />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6">
        <AIMarketAnalystPanel />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6">
        <AskMarketChat />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6">
        <MarketBreadth />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-8">
        <TrendAnalysis />
      </div>
    </div>
  );
}

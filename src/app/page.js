"use client";

import Link from "next/link";
import MarketStatusBar from "@/components/MarketStatusBar";
import USMarketTickerWidget from "@/components/USMarketTickerWidget";
import EconomicCalendarWidget from "@/components/EconomicCalendarWidget";
import SectorPerformanceHeatmap from "@/components/SectorPerformanceHeatmap";
import TopMovers from "@/components/TopMovers";
import EarningsThisWeek from "@/components/EarningsThisWeek";
import PersonalizedInsightSummary from "@/components/PersonalizedInsightSummary";

export default function Home() {
  return (
    <div>
      <MarketStatusBar />
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-10 animate-fade-in-up">
        <p className="text-xl font-medium leading-snug text-gray-600 sm:text-2xl sm:leading-snug max-w-3xl">
          Monitor markets, manage watchlists, and receive alerts.
        </p>
        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <EconomicCalendarWidget />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <USMarketTickerWidget embedded />
          </div>
        </div>
        <div className="mt-10 max-w-3xl">
          <PersonalizedInsightSummary />
        </div>
        <div className="mt-10">
          <TopMovers />
        </div>
        <div className="mt-10">
          <EarningsThisWeek />
        </div>
        <div className="mt-10">
          <SectorPerformanceHeatmap />
        </div>
      </div>

      <footer className="border-t border-gray-200/60 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="text-xs text-gray-400">Vantage</span>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Help
            </Link>
            <Link
              href="#"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              API Keys
            </Link>
            <Link
              href="#"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Settings
            </Link>
            <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Log out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

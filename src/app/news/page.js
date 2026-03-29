"use client";

import MarketNews from "@/components/MarketNews";
import NewsSentimentSummarizer from "@/components/NewsSentimentSummarizer";

export default function NewsPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          News
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Headlines &amp; sentiment
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Market news and AI-powered sentiment summaries.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6">
        <NewsSentimentSummarizer />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-8">
        <MarketNews />
      </div>
    </div>
  );
}

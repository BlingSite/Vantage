"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MarketStatusBar from "@/components/MarketStatusBar";

export default function Home() {
  const [firstName, setFirstName] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      const name =
        u?.user_metadata?.full_name ??
        u?.user_metadata?.name ??
        u?.email?.split("@")[0] ??
        null;
      const first = name ? name.split(" ")[0] : null;
      setFirstName((prev) => (prev === first ? prev : first));
    });
  }, []);

  return (
    <div>
      <MarketStatusBar />
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="flex flex-col justify-center animate-fade-in-up">
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.75rem] leading-tight">
            Welcome back
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-500 max-w-md">
            Monitor markets, manage watchlists, and receive alerts.
          </p>

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

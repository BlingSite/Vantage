"use client";

import { useRef, useEffect, useState } from "react";

const EXAMPLES = [
  "Why is VIX elevated?",
  "What does an inverted yield curve mean for my portfolio?",
];

export default function AskMarketChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const nextThread = [...messages, { role: "user", content: trimmed }];
    setMessages(nextThread);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/market/ask-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextThread }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content ?? "" },
      ]);
    } catch (e) {
      setError(e.message || "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 pb-2.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Ask the Market Chat
        </h2>
        <p className="mt-0.5 text-[11px] text-gray-500">
          Ask questions in plain language — answers use OpenAI with a fresh live
          market snapshot (indices, volatility proxy, bonds, commodities,
          session).
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            onClick={() => send(q)}
            className="rounded-full border border-gray-200 bg-gray-50/80 px-3 py-1 text-left text-[11px] text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mb-3 max-h-[min(22rem,50vh)] overflow-y-auto rounded-xl border border-gray-100 bg-[#fafbfc] px-3 py-2.5">
        {messages.length === 0 && !loading && (
          <p className="py-6 text-center text-[12px] text-gray-400">
            Try a sample question above or type your own.
          </p>
        )}
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li
              key={i}
              className={`text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-4 rounded-lg bg-white px-3 py-2 shadow-sm border border-gray-100/80"
                  : "text-gray-700"
              }`}
            >
              {m.role === "user" ? (
                <span className="text-gray-900">{m.content}</span>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </li>
          ))}
        </ul>
        {loading && (
          <p className="mt-2 text-[11px] text-gray-400 animate-pulse">
            Thinking with live market context…
          </p>
        )}
        <span ref={bottomRef} className="block h-px w-full shrink-0" />
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the market…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200/80 disabled:opacity-60"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>

      <p className="mt-2 text-[10px] text-gray-400">
        Not financial advice. Data is illustrative and may be delayed; proxies
        are noted in context.
      </p>
    </div>
  );
}

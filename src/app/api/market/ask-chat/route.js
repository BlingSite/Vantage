import { NextResponse } from "next/server";
import { chat } from "@/lib/openai";
import { fetchMarketOverview } from "@/lib/marketOverview";

export const dynamic = "force-dynamic";

const SYSTEM = `You are a concise market education assistant. The user sees a dashboard with live snapshot data in LIVE_MARKET_CONTEXT (JSON).

Rules:
- Ground current levels and day moves in LIVE_MARKET_CONTEXT when relevant (indices, volatility proxy, bond ETFs, commodities, dollar proxy, session status).
- The note field explains proxies (e.g. GLD/USO for commodities, SHY/TLT as rough short vs long rate sensitivity—not official Treasury yields). Say so if the user asks for exact yield levels.
- Explain concepts clearly (e.g. inverted yield curve, portfolio implications) and mention uncertainty and that this is not personalized financial advice.
- If context is missing or stale, say so and answer from general knowledge while labeling it as such.
- Keep answers focused; default under ~400 words unless the user asks for depth.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty messages array" },
        { status: 400 }
      );
    }

    const invalid = messages.some(
      (m) =>
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string"
    );
    if (invalid) {
      return NextResponse.json(
        {
          error:
            "Each message must have role 'user' or 'assistant' and string content",
        },
        { status: 400 }
      );
    }

    let context;
    try {
      context = await fetchMarketOverview();
    } catch (e) {
      context = {
        error: "Market data unavailable",
        detail: e?.message ?? String(e),
      };
    }

    const contextStr = JSON.stringify(context, null, 2);
    const fullMessages = [
      {
        role: "system",
        content: `${SYSTEM}\n\nLIVE_MARKET_CONTEXT:\n${contextStr}`,
      },
      ...messages,
    ];

    const content = await chat(fullMessages, {
      temperature: 0.45,
      max_tokens: 1400,
    });

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Market ask-chat error:", err);
    const status = err?.status === 401 ? 401 : 500;
    return NextResponse.json(
      { error: err?.message ?? "Chat request failed" },
      { status }
    );
  }
}

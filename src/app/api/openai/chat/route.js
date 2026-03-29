import { NextResponse } from "next/server";
import { chat } from "@/lib/openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/openai/chat
 *
 * Body (JSON):
 *   - messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
 *   - model?: string (default: gpt-4o-mini)
 *   - temperature?: number (default: 0.7)
 *   - max_tokens?: number (default: 1024)
 *
 * Returns: { content: string } or { error: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, model, temperature, max_tokens } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty messages array" },
        { status: 400 }
      );
    }

    const content = await chat(messages, {
      ...(model && { model }),
      ...(typeof temperature === "number" && { temperature }),
      ...(typeof max_tokens === "number" && { max_tokens }),
    });

    return NextResponse.json({ content });
  } catch (err) {
    console.error("OpenAI chat error:", err);
    const status = err?.status === 401 ? 401 : 500;
    return NextResponse.json(
      { error: err?.message ?? "OpenAI request failed" },
      { status }
    );
  }
}

import OpenAI from "openai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROMPT = "What's the market telling us today?";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise market analyst. Answer in 2–4 short paragraphs. Focus on what current market conditions and recent moves might imply for investors. Be clear and avoid jargon where possible.",
        },
        { role: "user", content: PROMPT },
      ],
      max_tokens: 500,
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No response from the analyst.";

    return NextResponse.json({ text, prompt: PROMPT });
  } catch (err) {
    console.error("AI Market Analyst error:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to get AI market analysis",
      },
      { status: 500 }
    );
  }
}

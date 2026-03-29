import { getMarketStatus } from "@/lib/massive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight market clock for UI (session + serverTime). Avoids pulling full overview payload.
 */
export async function GET() {
  try {
    const data = await getMarketStatus();
    return NextResponse.json(
      {
        market: data?.market ?? null,
        earlyHours: !!data?.earlyHours,
        afterHours: !!data?.afterHours,
        serverTime: data?.serverTime ?? null,
        exchanges: data?.exchanges ?? null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("MASSIVE_API_KEY")) {
      return NextResponse.json(
        { error: "Market status unavailable", market: null },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
    console.error("Market status error:", err);
    return NextResponse.json(
      { error: msg || "Failed to fetch market status", market: null },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

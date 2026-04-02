import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next")?.startsWith("/") ? searchParams.get("next") : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) {
        return NextResponse.redirect(`${origin}${nextPath}`);
      }
      if (forwardedHost) {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        return NextResponse.redirect(`${proto}://${forwardedHost}${nextPath}`);
      }
      return NextResponse.redirect(`${origin}${nextPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

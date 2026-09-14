import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext =
    requestUrl.searchParams.get("next") ?? "/sevilha/reservar";
  // Eu aceito somente caminhos internos para impedir redirecionamento para sites externos.
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\") &&
    !/[\x00-\x1f]/.test(requestedNext)
      ? requestedNext
      : "/sevilha/reservar";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

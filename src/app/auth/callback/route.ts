import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeInternalPath(
  value: string | null,
) {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\x00-\x1f]/.test(value)
  ) {
    return value;
  }

  return "/";
}

export async function GET(
  request: Request,
) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code",
    );

  const next =
    safeInternalPath(
      requestUrl.searchParams.get(
        "next",
      ),
    );

  if (code) {
    const supabase =
      await createClient();

    await supabase.auth.exchangeCodeForSession(
      code,
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      requestUrl.origin,
    ),
  );
}

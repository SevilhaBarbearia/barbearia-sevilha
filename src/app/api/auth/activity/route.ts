import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  const {
    data: active,
    error,
  } = await supabase.rpc(
    "touch_current_app_session",
  );

  if (
    error ||
    active !== true
  ) {
    /*
     * A sessão já ultrapassou o limite de inatividade ou o servidor
     * não conseguiu validá-la. Eu encerro o refresh token deste navegador
     * para que o timeout não seja apenas visual.
     */
    await supabase.auth.signOut({
      scope: "local",
    });

    return NextResponse.json(
      {
        error:
          "SESSION_EXPIRED",
      },
      {
        status: 401,
      },
    );
  }

  return new NextResponse(
    null,
    {
      status: 204,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  // Primeiro tenta registrar (atualiza last_activity_at).
  const { data: touched, error: touchError } = await supabase.rpc(
    "touch_current_app_session",
  );

  // Se a sessão ainda não existe no banco (primeiro request após convite
  // ou após migration 027), check_current_app_session cria a linha e
  // devolve true. Isso evita logout indevido de sessões recém-criadas.
  if (touchError || touched !== true) {
    const { data: active, error: checkError } = await supabase.rpc(
      "check_current_app_session",
    );

    if (checkError || active !== true) {
      await supabase.auth.signOut({ scope: "local" });

      return NextResponse.json(
        { error: "SESSION_EXPIRED" },
        { status: 401 },
      );
    }
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

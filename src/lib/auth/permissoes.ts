import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { permiteAdministracao } from "./admin-policy";
import type { Profile } from "@/lib/db/types";

async function sessaoAplicacaoAtiva(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
) {
  const {
    data: active,
    error,
  } = await supabase.rpc(
    "check_current_app_session",
  );

  if (
    error ||
    active !== true
  ) {
    return false;
  }

  return true;
}

export async function obterUsuarioAtual() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return {
      user: null,
      profile: null,
    };
  }

  /*
   * A sessão do Supabase, sozinha, não é mais suficiente.
   * O servidor também precisa confirmar que esta sessão específica
   * teve atividade humana dentro dos últimos 30 minutos.
   */
  const active =
    await sessaoAplicacaoAtiva(
      supabase,
    );

  if (!active) {
    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch {
      /*
       * Mesmo se o Auth remoto estiver temporariamente indisponível,
       * eu não aceito a sessão vencida como autenticada na aplicação.
       */
    }

    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single<Profile>();

  return {
    user: data.user,
    profile,
  };
}

export async function exigirUsuario(
  slug?: string,
) {
  const { user, profile } = await obterUsuarioAtual();

  if (!user) {
    redirect(
      slug
        ? `/${encodeURIComponent(slug)}/login`
        : "/login",
    );
  }

  return { user, profile };
}

export async function exigirPerfilCompleto(
  slug?: string,
) {
  const { user, profile } = await exigirUsuario(slug);

  if (!profile?.phone || !profile?.full_name) {
    redirect(
      slug
        ? `/${encodeURIComponent(slug)}/completar-cadastro`
        : "/completar-cadastro",
    );
  }

  return { user, profile };
}

export async function obterAdministradorAtual() {
  const { user, profile } = await obterUsuarioAtual();

  if (
    !user ||
    profile?.role !== "admin" ||
    !profile.is_active
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (
    error ||
    !permiteAdministracao(
      user.id,
      profile,
      data?.claims,
    )
  ) {
    return null;
  }

  return { user, profile };
}

export async function exigirAdmin() {
  const admin = await obterAdministradorAtual();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export function podeGerenciarAgenda(
  role?: string | null,
) {
  return (
    role === "admin" ||
    role === "barber"
  );
}

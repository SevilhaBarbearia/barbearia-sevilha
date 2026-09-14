"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obterAdministradorAtual } from "./permissoes";

export async function entrarAdministrador(
  _state: { erro: string },
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 1024) {
    return { erro: "Informe o e-mail e a senha da administração." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return {
        erro: "Não foi possível entrar. Confira suas credenciais e tente novamente.",
      };

    if (!(await obterAdministradorAtual())) {
      await supabase.auth.signOut({ scope: "local" });
      return { erro: "Esta conta não possui acesso à administração." };
    }
  } catch {
    return { erro: "Não foi possível conectar. Tente novamente em instantes." };
  }

  redirect("/admin/selecionar");
}

export async function sairAdministrador() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  redirect("/admin/login");
}

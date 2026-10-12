"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { obterPlatformAdminAtual } from "./platform-permissoes";

function safePlatformPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value.trim() : "";

  if (
    /^\/plataforma(?:\/[a-z0-9/_-]*)?$/.test(path) &&
    !path.includes("//") &&
    !path.includes("\\")
  ) {
    return path;
  }

  return "/plataforma";
}

export async function entrarPlatformAdmin(
  _state: { erro: string },
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safePlatformPath(formData.get("next"));

  if (!email || !password || email.length > 254 || password.length > 1024) {
    return {
      erro: "Informe o e-mail e a senha da plataforma.",
    };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        erro:
          "Nao foi possivel entrar. Confira suas credenciais e tente novamente.",
      };
    }

    if (!(await obterPlatformAdminAtual())) {
      await supabase.auth.signOut({ scope: "local" });

      return {
        erro: "Esta conta nao possui acesso a plataforma.",
      };
    }
  } catch {
    return {
      erro:
        "Nao foi possivel conectar. Tente novamente em instantes.",
    };
  }

  redirect(next);
}

export async function sairPlatformAdmin() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    throw new Error("Nao foi possivel sair. Tente novamente.");
  }

  redirect("/plataforma/login");
}

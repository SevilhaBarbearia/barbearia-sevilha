"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { obterAdministradorAtual } from "./permissoes";

function safeAdminPath(
  value: FormDataEntryValue | null,
) {
  const path =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    /^\/admin\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9/_-]*)?$/.test(
      path,
    ) &&
    !path.includes("//") &&
    !path.includes("\\")
  ) {
    return path;
  }

  return "/admin";
}

export async function entrarAdministrador(
  _state: { erro: string },
  formData: FormData,
) {
  const email = String(
    formData.get("email") ?? "",
  ).trim();

  const password = String(
    formData.get("password") ?? "",
  );

  const next = safeAdminPath(
    formData.get("next"),
  );

  if (
    !email ||
    !password ||
    email.length > 254 ||
    password.length > 1024
  ) {
    return {
      erro:
        "Informe o e-mail e a senha da administração.",
    };
  }

  try {
    const supabase =
      await createClient();

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

    if (error) {
      return {
        erro:
          "Não foi possível entrar. Confira suas credenciais e tente novamente.",
      };
    }

    if (
      !(await obterAdministradorAtual())
    ) {
      await supabase.auth.signOut({
        scope: "local",
      });

      return {
        erro:
          "Esta conta não possui acesso à administração.",
      };
    }
  } catch {
    return {
      erro:
        "Não foi possível conectar. Tente novamente em instantes.",
    };
  }

  /*
   * O destino nunca concede acesso por si só.
   * /admin/[slug] passa obrigatoriamente por requireBarbershopManager(),
   * que confere a membership daquele tenant no servidor.
   */
  redirect(next);
}

export async function sairAdministrador(
  formData: FormData,
) {
  const slug = String(
    formData.get("slug") ?? "",
  )
    .trim()
    .toLowerCase();

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.signOut({
      scope: "local",
    });

  if (error) {
    throw new Error(
      "Não foi possível sair. Tente novamente.",
    );
  }

  const next =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
      ? `/admin/login?next=${encodeURIComponent(
          `/admin/${slug}`,
        )}`
      : "/admin/login";

  redirect(next);
}

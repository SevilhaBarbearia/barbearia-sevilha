"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .max(1024, "Senha muito longa."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

export type PrimeiroAcessoState =
  | { ok: false; mensagem: string; campo?: "password" | "confirm" }
  | null;

export async function definirSenhaEOEntrar(
  _prev: PrimeiroAcessoState,
  formData: FormData,
): Promise<PrimeiroAcessoState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      mensagem: first?.message ?? "Dados inválidos.",
      campo: first?.path?.[0] === "confirm" ? "confirm" : "password",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      mensagem:
        "Sessão do convite expirada ou inválida. Peça um novo link ao administrador.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      mensagem:
        error.message ||
        "Não foi possível definir a senha. Tente novamente em instantes.",
    };
  }

  redirect(`/admin/${parsed.data.slug}`);
}

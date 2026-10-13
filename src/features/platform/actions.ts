"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da barbearia (mínimo 2 caracteres).")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug inválido. Use apenas letras minúsculas, números e hífens.",
    ),
  owner_email: z.string().email("Informe um e-mail válido."),
});

export type CreateBarbershopState =
  | { ok: true; mensagem: string }
  | { ok: false; mensagem: string; campo?: string };

export async function createBarbershop(
  _prev: CreateBarbershopState | null,
  formData: FormData,
): Promise<CreateBarbershopState> {
  await requirePlatformAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const campo = first?.path?.[0];
    return {
      ok: false,
      mensagem: first?.message ?? "Dados inválidos.",
      campo: typeof campo === "string" ? campo : undefined,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_barbershop_with_owner", {
    barbershop_name: parsed.data.name,
    barbershop_slug: parsed.data.slug,
    owner_email: parsed.data.owner_email,
    existing_organization_id: null,
  });

  if (error?.message.includes("OWNER_NOT_FOUND")) {
    return {
      ok: false,
      mensagem:
        "Crie primeiro a conta do proprietário no Supabase Auth, com e-mail e senha.",
      campo: "owner_email",
    };
  }
  if (error?.message.includes("OWNER_PLATFORM_ADMIN_CONFLICT")) {
    return {
      ok: false,
      mensagem:
        "A conta do Platform Admin não pode ser usada como proprietário de uma barbearia.",
      campo: "owner_email",
    };
  }
  if (error?.message.includes("INVALID_DATA")) {
    return {
      ok: false,
      mensagem:
        "Verifique nome e slug. O slug não pode usar palavras reservadas (admin, api, auth, plataforma, login, reservar, cliente).",
      campo: "slug",
    };
  }
  if (error) {
    return {
      ok: false,
      mensagem:
        "Não foi possível criar a barbearia. Verifique os dados, o proprietário e se o slug já existe.",
    };
  }

  revalidatePath("/plataforma");
  return { ok: true, mensagem: "Barbearia criada com sucesso." };
}

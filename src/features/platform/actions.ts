"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    ),

  owner_email: z
    .string()
    .email(),

  organization_id: z
    .union([
      z.literal(""),
      z.string().uuid(),
    ])
    .optional(),
});

export async function createBarbershop(
  formData: FormData,
) {
  await requirePlatformAdmin();

  const parsed =
    schema.safeParse(
      Object.fromEntries(
        formData,
      ),
    );

  if (!parsed.success) {
    return {
      ok: false,
      mensagem:
        parsed.error
          .issues[0]
          ?.message ??
        "Dados inválidos.",
    };
  }

  const supabase =
    await createClient();

  /*
   * Toda criação passa pela RPC transacional.
   *
   * A RPC agora também:
   * - impede Platform Admin como owner;
   * - cria trial de 15 dias;
   * - aplica identidade visual padrão;
   * - registra auditoria da plataforma.
   */
  const { error } =
    await supabase.rpc(
      "create_barbershop_with_owner",
      {
        barbershop_name:
          parsed.data.name,
        barbershop_slug:
          parsed.data.slug,
        owner_email:
          parsed.data.owner_email,
        existing_organization_id:
          parsed.data
            .organization_id ||
          null,
      },
    );

  if (
    error?.message.includes(
      "OWNER_NOT_FOUND",
    )
  ) {
    return {
      ok: false,
      mensagem:
        "Crie primeiro a conta do proprietário no Supabase Auth, com e-mail e senha.",
    };
  }

  if (
    error?.message.includes(
      "OWNER_PLATFORM_ADMIN_CONFLICT",
    )
  ) {
    return {
      ok: false,
      mensagem:
        "A conta do Platform Admin não pode ser usada como proprietário de uma barbearia.",
    };
  }

  if (error) {
    return {
      ok: false,
      mensagem:
        "Não foi possível criar a barbearia. Verifique os dados, o proprietário e se o slug já existe.",
    };
  }

  /*
   * Eu não redireciono mais o Platform Admin para /admin/{slug}.
   * O painel /admin é exclusivo do owner/manager daquele tenant.
   */
  redirect("/plataforma");
}

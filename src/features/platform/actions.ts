"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { obterAdministradorAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import {
  calcularForegroundSeguro,
  DEFAULT_TENANT_ACCENT,
} from "@/lib/theme/paleta-marca";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  owner_email: z.string().email(),
  organization_id: z
    .union([z.literal(""), z.string().uuid()])
    .optional(),
});

export async function createBarbershop(formData: FormData) {
  const admin = await obterAdministradorAtual();

  if (!admin?.profile.is_platform_admin) {
    redirect("/admin/login");
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_barbershop_with_owner", {
    barbershop_name: parsed.data.name,
    barbershop_slug: parsed.data.slug,
    owner_email: parsed.data.owner_email,
    existing_organization_id: parsed.data.organization_id || null,
  });

  if (error?.message.includes("OWNER_NOT_FOUND")) {
    return {
      ok: false,
      mensagem:
        "Crie primeiro a conta do proprietário no Supabase Auth, com e-mail e senha.",
    };
  }

  if (error) {
    return {
      ok: false,
      mensagem:
        "Não foi possível criar a barbearia. Verifique se o slug já existe.",
    };
  }

  const { data: created } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (created) {
    const foreground = calcularForegroundSeguro(DEFAULT_TENANT_ACCENT);

    await supabase
      .from("barbershops")
      .update({
        primary_color: DEFAULT_TENANT_ACCENT,
        secondary_color: foreground,
      })
      .eq("id", created.id);

    await supabase.from("business_settings").upsert(
      {
        barbershop_id: created.id,
        business_name: parsed.data.name,
        primary_color: DEFAULT_TENANT_ACCENT,
        secondary_color: foreground,
      },
      { onConflict: "barbershop_id" },
    );
  }

  redirect(`/admin/${parsed.data.slug}`);
}

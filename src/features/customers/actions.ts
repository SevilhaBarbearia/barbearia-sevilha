"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { requireBarbershop } from "@/features/tenancy/server";

const preferencesSchema = z.object({
  birth_date: z.union([z.literal(""), z.string().date()]),
  allow_email: z.boolean(),
  allow_whatsapp: z.boolean(),
});

export async function updateCustomerPreferences(formData: FormData) {
  const { user } = await exigirPerfilCompleto(
    String(formData.get("slug") ?? ""),
  );
  const barbershop = await requireBarbershop(
    String(formData.get("slug") ?? ""),
  );
  const parsed = preferencesSchema.safeParse({
    birth_date: String(formData.get("birth_date") ?? ""),
    allow_email: formData.get("allow_email") === "on",
    allow_whatsapp: formData.get("allow_whatsapp") === "on",
  });
  if (!parsed.success)
    return {
      ok: false,
      mensagem: "Revise a data e as preferências informadas.",
    };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_preferences", {
    target_barbershop_id: barbershop.id,
    customer_birth_date: parsed.data.birth_date || null,
    email_allowed: parsed.data.allow_email,
    whatsapp_allowed: parsed.data.allow_whatsapp,
  });

  if (error)
    return {
      ok: false,
      mensagem: "Não foi possível salvar suas preferências.",
    };
  revalidatePath(`/${barbershop.slug}/cliente/perfil`);
  return { ok: true, mensagem: "Preferências atualizadas." };
}

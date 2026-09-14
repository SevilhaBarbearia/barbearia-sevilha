"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";

const settingsSchema = z.object({
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  business_name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().max(250).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(100).optional(),
  logo_url: z.union([z.literal(""), z.string().url()]),
  cover_url: z.union([z.literal(""), z.string().url()]),
  cancellation_limit_hours: z.coerce.number().int().min(0).max(168),
  booking_advance_days: z.coerce.number().int().min(1).max(365),
});

export async function updateBusinessSettings(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      ok: false,
      mensagem: parsed.error.issues[0]?.message ?? "Configuração inválida.",
    };
  const supabase = await createClient();
  const { primary_color, secondary_color, ...businessData } = parsed.data;
  const data = {
    ...businessData,
    description: parsed.data.description || null,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    instagram: parsed.data.instagram || null,
    logo_url: parsed.data.logo_url || null,
    cover_url: parsed.data.cover_url || null,
  };
  const { error } = await supabase
    .from("business_settings")
    .upsert(
      { ...data, barbershop_id: barbershop.id },
      { onConflict: "barbershop_id" },
    );
  if (error)
    return { ok: false, mensagem: "Não foi possível salvar as configurações." };
  const { error: brandError } = await supabase
    .from("barbershops")
    .update({
      primary_color,
      secondary_color,
      name: data.business_name,
      description: data.description,
      logo_url: data.logo_url,
      cover_url: data.cover_url,
    })
    .eq("id", barbershop.id);
  if (brandError)
    return {
      ok: false,
      mensagem:
        "Dados salvos, mas não foi possível atualizar a identidade visual.",
    };
  revalidatePath(`/${barbershop.slug}`, "layout");
  revalidatePath(`/admin/${barbershop.slug}/configuracoes`);
  return { ok: true, mensagem: "Configurações atualizadas." };
}

export async function updateNotificationSettings(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const birthdayMessage = z
    .string()
    .trim()
    .min(5)
    .max(2000)
    .safeParse(formData.get("birthday_message"));
  const satisfactionMessage = z
    .string()
    .trim()
    .min(5)
    .max(2000)
    .safeParse(formData.get("satisfaction_message"));
  const birthdaySendTime = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .safeParse(String(formData.get("birthday_send_time") ?? "09:00"));
  if (
    !birthdayMessage.success ||
    !satisfactionMessage.success ||
    !birthdaySendTime.success
  )
    return {
      ok: false,
      mensagem: "Revise o horário e os textos das mensagens.",
    };
  const supabase = await createClient();
  const { error } = await supabase.from("notification_settings").upsert(
    {
      barbershop_id: barbershop.id,
      birthday_enabled: formData.get("birthday_enabled") === "on",
      birthday_channel: "email",
      birthday_send_time: birthdaySendTime.data,
      satisfaction_enabled: formData.get("satisfaction_enabled") === "on",
      satisfaction_channel: "email",
    },
    { onConflict: "barbershop_id" },
  );
  if (error)
    return { ok: false, mensagem: "Não foi possível salvar as notificações." };
  const templateResults = await Promise.all([
    supabase.from("message_templates").upsert(
      {
        barbershop_id: barbershop.id,
        type: "birthday",
        channel: "email",
        subject: "Feliz aniversário, {{nome}}!",
        content: birthdayMessage.data,
        is_active: true,
      },
      { onConflict: "barbershop_id,type,channel" },
    ),
    supabase.from("message_templates").upsert(
      {
        barbershop_id: barbershop.id,
        type: "satisfaction_survey",
        channel: "email",
        subject: "Como foi seu atendimento?",
        content: satisfactionMessage.data,
        is_active: true,
      },
      { onConflict: "barbershop_id,type,channel" },
    ),
  ]);
  if (templateResults.some(({ error }) => error))
    return {
      ok: false,
      mensagem: "Não foi possível salvar os textos. Tente novamente.",
    };
  revalidatePath(`/admin/${barbershop.slug}/configuracoes`);
  return { ok: true, mensagem: "Notificações atualizadas." };
}

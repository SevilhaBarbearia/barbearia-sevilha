"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";

const programSchema = z.object({
  name: z.string().trim().min(2).max(80),
  earning_mode: z.enum(["visit", "amount", "service"]),
  points_per_visit: z.coerce.number().int().min(0).max(10000),
  points_per_currency: z.coerce.number().min(0).max(10000),
  is_active: z.boolean(),
});

const rewardSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    reward_type: z.enum([
      "free_service",
      "fixed_discount",
      "percentage_discount",
      "gift",
      "custom",
    ]),
    points_cost: z.coerce.number().int().positive().max(1000000),
    service_id: z.union([z.literal(""), z.string().uuid()]),
    discount_value: z.union([
      z.literal(""),
      z.coerce.number().min(0).max(100000),
    ]),
  })
  .superRefine((reward, ctx) => {
    if (reward.reward_type === "free_service" && !reward.service_id)
      ctx.addIssue({
        code: "custom",
        message: "Selecione o serviço gratuito.",
        path: ["service_id"],
      });
    if (
      ["fixed_discount", "percentage_discount"].includes(reward.reward_type) &&
      (!reward.discount_value ||
        (reward.reward_type === "percentage_discount" &&
          Number(reward.discount_value) > 100))
    )
      ctx.addIssue({
        code: "custom",
        message: "Informe um desconto positivo; percentual máximo de 100%.",
        path: ["discount_value"],
      });
  });

export async function updateLoyaltyProgram(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const parsed = programSchema.safeParse({
    name: formData.get("name"),
    earning_mode: formData.get("earning_mode"),
    points_per_visit: formData.get("points_per_visit"),
    points_per_currency: formData.get("points_per_currency"),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success)
    return {
      ok: false,
      mensagem: parsed.error.issues[0]?.message ?? "Configuração inválida.",
    };

  const supabase = await createClient();
  const { error } = await supabase
    .from("loyalty_programs")
    .update(parsed.data)
    .eq("barbershop_id", barbershop.id);
  if (error)
    return { ok: false, mensagem: "Não foi possível salvar o programa." };
  revalidatePath(`/admin/${barbershop.slug}/fidelidade`);
  return { ok: true, mensagem: "Programa atualizado." };
}

export async function saveServicePoints(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const serviceId = z.string().uuid().safeParse(formData.get("service_id"));
  const points = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .safeParse(formData.get("points_earned"));
  if (!serviceId.success || !points.success)
    return { ok: false, mensagem: "Regra por serviço inválida." };

  const supabase = await createClient();
  const [{ data: program }, { data: service }] = await Promise.all([
    supabase
      .from("loyalty_programs")
      .select("id")
      .eq("barbershop_id", barbershop.id)
      .single(),
    supabase
      .from("services")
      .select("id")
      .eq("barbershop_id", barbershop.id)
      .eq("id", serviceId.data)
      .maybeSingle(),
  ]);
  if (!program || !service)
    return { ok: false, mensagem: "Serviço ou programa não encontrado." };

  const { error } = await supabase.from("loyalty_service_rules").upsert(
    {
      barbershop_id: barbershop.id,
      loyalty_program_id: program.id,
      service_id: service.id,
      points_earned: points.data,
      is_active: true,
    },
    { onConflict: "loyalty_program_id,service_id" },
  );
  if (error)
    return {
      ok: false,
      mensagem: "Não foi possível salvar os pontos do serviço.",
    };
  revalidatePath(`/admin/${barbershop.slug}/fidelidade`);
  return { ok: true, mensagem: "Regra atualizada." };
}

export async function createLoyaltyReward(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const parsed = rewardSchema.safeParse({
    name: formData.get("name"),
    reward_type: formData.get("reward_type"),
    points_cost: formData.get("points_cost"),
    service_id: formData.get("service_id") ?? "",
    discount_value: formData.get("discount_value") ?? "",
  });
  if (!parsed.success)
    return {
      ok: false,
      mensagem: parsed.error.issues[0]?.message ?? "Recompensa inválida.",
    };
  const supabase = await createClient();
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("barbershop_id", barbershop.id)
    .single();
  if (!program) return { ok: false, mensagem: "Programa não encontrado." };

  const rewardId = z
    .union([z.literal(""), z.string().uuid()])
    .safeParse(formData.get("id") || "");
  if (!rewardId.success) return { ok: false, mensagem: "Recompensa inválida." };
  const values = {
    barbershop_id: barbershop.id,
    loyalty_program_id: program.id,
    name: parsed.data.name,
    reward_type: parsed.data.reward_type,
    points_cost: parsed.data.points_cost,
    service_id: parsed.data.service_id || null,
    discount_value: parsed.data.discount_value || null,
    is_active: formData.get("is_active") === "on",
  };
  const { error } = rewardId.data
    ? await supabase
        .from("loyalty_rewards")
        .update(values)
        .eq("barbershop_id", barbershop.id)
        .eq("id", rewardId.data)
    : await supabase.from("loyalty_rewards").insert(values);
  if (error)
    return { ok: false, mensagem: "Não foi possível cadastrar a recompensa." };
  revalidatePath(`/admin/${barbershop.slug}/fidelidade`);
  return { ok: true, mensagem: "Recompensa salva." };
}

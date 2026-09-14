"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { requireBarbershop } from "@/features/tenancy/server";

export async function redeemReward(formData: FormData) {
  await exigirPerfilCompleto();
  const barbershop = await requireBarbershop(
    String(formData.get("slug") ?? ""),
  );
  const rewardId = z.string().uuid().safeParse(formData.get("reward_id"));
  if (!rewardId.success) return { ok: false, mensagem: "Recompensa inválida." };

  const supabase = await createClient();
  const { data: reward } = await supabase
    .from("loyalty_rewards")
    .select("id")
    .eq("barbershop_id", barbershop.id)
    .eq("id", rewardId.data)
    .eq("is_active", true)
    .maybeSingle();
  if (!reward) return { ok: false, mensagem: "Recompensa não encontrada." };

  const { error } = await supabase.rpc("redeem_loyalty_reward", {
    target_reward_id: reward.id,
  });
  if (error?.message.includes("INSUFFICIENT_POINTS"))
    return { ok: false, mensagem: "Você ainda não possui pontos suficientes." };
  if (error)
    return { ok: false, mensagem: "Não foi possível concluir o resgate." };
  revalidatePath(`/${barbershop.slug}/cliente/fidelidade`);
  return {
    ok: true,
    mensagem: "Recompensa resgatada. Apresente o lançamento na barbearia.",
  };
}

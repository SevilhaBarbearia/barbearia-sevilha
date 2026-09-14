"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";

const appointmentIdSchema = z.string().uuid();

export async function completeAppointment(formData: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(formData.get("slug") ?? ""),
  );
  const parsed = appointmentIdSchema.safeParse(formData.get("appointment_id"));
  if (!parsed.success) return { ok: false, mensagem: "Reserva inválida." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("barbershop_id", barbershop.id)
    .eq("id", parsed.data)
    .maybeSingle();
  if (!data)
    return { ok: false, mensagem: "Reserva não encontrada nesta barbearia." };

  const { error } = await supabase.rpc("mark_appointment_completed", {
    target_appointment_id: data.id,
  });
  if (error)
    return { ok: false, mensagem: "Não foi possível concluir o atendimento." };

  revalidatePath(`/admin/${barbershop.slug}/agenda`);
  revalidatePath(`/admin/${barbershop.slug}/reservas`);
  revalidatePath(`/admin/${barbershop.slug}/fidelidade`);
  revalidatePath(`/admin/${barbershop.slug}/satisfacao`);
  return { ok: true, mensagem: "Atendimento concluído." };
}

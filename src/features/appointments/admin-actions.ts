"use server";

import {
  revalidatePath,
  updateTag,
} from "next/cache";
import { z } from "zod";

import { getAvailabilityCacheTag } from "@/features/availability/cache";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";

const completionSchema = z.object({
  appointment_id: z.string().uuid("Reserva inválida."),
  amount: z.coerce
    .number()
    .min(0, "O valor recebido não pode ser negativo.")
    .max(999999.99, "Valor de pagamento inválido."),
  method: z.enum([
    "dinheiro",
    "pix",
    "cartao_credito",
    "cartao_debito",
    "outro",
  ]),
});

function completionErrorMessage(message?: string) {
  if (message?.includes("APPOINTMENT_NOT_FOUND")) {
    return "Reserva não encontrada nesta barbearia.";
  }

  if (message?.includes("INVALID_STATUS")) {
    return "Esse atendimento não pode mais ser concluído.";
  }

  if (message?.includes("INVALID_PAYMENT_AMOUNT")) {
    return "Informe um valor de pagamento válido.";
  }

  if (message?.includes("FORBIDDEN")) {
    return "Sua conta não possui permissão para concluir este atendimento.";
  }

  return "Não foi possível concluir o atendimento e registrar o pagamento.";
}

function refreshAdminData(
  barbershopId: string,
  slug: string,
) {
  updateTag(
    getAvailabilityCacheTag(
      barbershopId,
    ),
  );

  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/${slug}`);
  revalidatePath(`/admin/${slug}/agenda`);
  revalidatePath(`/admin/${slug}/reservas`);
  revalidatePath(`/admin/${slug}/pagamentos`);
  revalidatePath(`/admin/${slug}/faturamento`);
  revalidatePath(`/admin/${slug}/fidelidade`);
  revalidatePath(`/admin/${slug}/satisfacao`);
}

/**
 * Mantido apenas para evitar quebra de import antigo.
 * A conclusão sem pagamento deixou de ser permitida.
 */
export async function completeAppointment(
  _formData: FormData,
) {
  return {
    ok: false,
    mensagem:
      "Para concluir o atendimento, informe também a forma de pagamento.",
  };
}

export async function completeAppointmentWithPayment(
  formData: FormData,
) {
  const { barbershop } =
    await requireBarbershopManager(
      String(
        formData.get("slug") ??
          "",
      ),
    );

  const parsed =
    completionSchema.safeParse({
      appointment_id:
        formData.get(
          "appointment_id",
        ),
      amount:
        formData.get("amount"),
      method:
        formData.get("method"),
    });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem:
        parsed.error.issues[0]
          ?.message ??
        "Dados inválidos.",
    };
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.rpc(
      "complete_appointment_with_payment",
      {
        target_barbershop_id:
          barbershop.id,
        target_appointment_id:
          parsed.data
            .appointment_id,
        payment_amount:
          parsed.data.amount,
        payment_method_value:
          parsed.data.method,
      },
    );

  if (error) {
    return {
      ok: false,
      mensagem:
        completionErrorMessage(
          error.message,
        ),
    };
  }

  refreshAdminData(
    barbershop.id,
    barbershop.slug,
  );

  return {
    ok: true,
    mensagem:
      "Atendimento concluído e pagamento registrado.",
  };
}

"use server";

import {
  revalidatePath,
  updateTag,
} from "next/cache";
import { redirect } from "next/navigation";

import { getAvailabilityCacheTag } from "@/features/availability/cache";
import {
  requireBarbershop,
  requireBarbershopManager,
} from "@/features/tenancy/server";
import {
  cancelarAgendamentoSchema,
  completarCadastroSchema,
  criarAgendamentoSchema,
  pagamentoPresencialSchema,
} from "@/lib/agendamentos/schemas";
import {
  exigirPerfilCompleto,
  exigirUsuario,
} from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(
  phone: string,
) {
  return phone.replace(
    /\D/g,
    "",
  );
}

function formSlug(
  formData: FormData,
) {
  return String(
    formData.get("slug") ??
      "",
  );
}

function safeInternalPath(
  value: FormDataEntryValue | null,
  fallback: string,
) {
  const path =
    typeof value === "string"
      ? value
      : "";

  if (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\x00-\x1f]/.test(path)
  ) {
    return path;
  }

  return fallback;
}

function bookingErrorMessage(
  code?: string,
) {
  if (
    code?.includes(
      "CUSTOMER_TIME_CONFLICT",
    )
  ) {
    return "Você já possui outro agendamento nesse mesmo horário.";
  }

  if (
    code?.includes(
      "SLOT_UNAVAILABLE",
    )
  ) {
    return "Esse horário acabou de ser reservado. Escolha outro.";
  }

  if (
    code?.includes(
      "SLOT_BLOCKED",
    )
  ) {
    return "O horário está bloqueado pela barbearia.";
  }

  if (
    code?.includes(
      "OUTSIDE_BUSINESS_HOURS",
    )
  ) {
    return "O horário está fora do expediente do barbeiro.";
  }

  if (
    code?.includes(
      "ADVANCE_LIMIT",
    )
  ) {
    return "A data ultrapassa o limite de antecedência da barbearia.";
  }

  return "Não foi possível confirmar a reserva. Confira os dados e tente novamente.";
}

export async function completarCadastro(
  formData: FormData,
) {
  const slug =
    formSlug(formData);

  const { user } =
    await exigirUsuario(slug);

  const barbershop =
    await requireBarbershop(
      slug,
    );

  const supabase =
    await createClient();

  const parsed =
    completarCadastroSchema.safeParse(
      {
        full_name:
          formData.get(
            "full_name",
          ),

        phone:
          formData.get(
            "phone",
          ),

        email:
          formData.get(
            "email",
          ),
      },
    );

  if (!parsed.success) {
    return {
      ok: false,

      mensagem:
        parsed.error.issues[0]
          ?.message ??
        "Dados inválidos.",
    };
  }

  const customer = {
    barbershop_id:
      barbershop.id,

    profile_id:
      user.id,

    full_name:
      parsed.data.full_name,

    phone:
      normalizePhone(
        parsed.data.phone,
      ),

    email:
      parsed.data.email ||
      user.email,
  };

  const { error } =
    await supabase.rpc(
      "save_my_customer",
      {
        target_barbershop_id:
          barbershop.id,

        customer_name:
          customer.full_name,

        customer_phone:
          customer.phone,

        customer_email:
          customer.email ||
          null,
      },
    );

  if (error) {
    return {
      ok: false,

      mensagem:
        "Não foi possível atualizar seu cadastro.",
    };
  }

  revalidatePath(
    `/${barbershop.slug}/cliente/perfil`,
  );

  const next =
    safeInternalPath(
      formData.get("next"),
      `/${barbershop.slug}/reservar`,
    );

  redirect(next);
}

export async function criarAgendamento(
  formData: FormData,
) {
  await exigirPerfilCompleto(
    formSlug(formData),
  );

  const barbershop =
    await requireBarbershop(
      formSlug(formData),
    );

  const supabase =
    await createClient();

  const parsed =
    criarAgendamentoSchema.safeParse(
      {
        service_id:
          formData.get(
            "service_id",
          ),

        barber_id:
          formData.get(
            "barber_id",
          ),

        start_at:
          formData.get(
            "start_at",
          ),

        client_notes:
          formData.get(
            "client_notes",
          ) ||
          undefined,
      },
    );

  if (!parsed.success) {
    return {
      ok: false,

      mensagem:
        parsed.error.issues[0]
          ?.message ??
        "Dados inválidos.",
    };
  }

  const { error } =
    await supabase.rpc(
      "book_appointment",
      {
        target_barbershop_id:
          barbershop.id,

        target_barber_id:
          parsed.data.barber_id,

        target_service_id:
          parsed.data.service_id,

        target_start_at:
          parsed.data.start_at,

        target_client_notes:
          parsed.data.client_notes ||
          null,
      },
    );

  if (error) {
    return {
      ok: false,

      mensagem:
        bookingErrorMessage(
          error.message,
        ),
    };
  }

  updateTag(
    getAvailabilityCacheTag(
      barbershop.id,
    ),
  );

  revalidatePath(
    `/${barbershop.slug}`,
  );

  revalidatePath(
    `/${barbershop.slug}/cliente/agendamentos`,
  );

  revalidatePath(
    `/admin/${barbershop.slug}/agenda`,
  );

  revalidatePath(
    `/admin/${barbershop.slug}/reservas`,
  );

  redirect(
    `/${barbershop.slug}/cliente/agendamentos?reservado=1`,
  );
}

export async function cancelarAgendamento(
  formData: FormData,
) {
  await exigirUsuario(
    formSlug(formData),
  );

  const barbershop =
    await requireBarbershop(
      formSlug(formData),
    );

  const supabase =
    await createClient();

  const parsed =
    cancelarAgendamentoSchema.safeParse(
      {
        appointment_id:
          formData.get(
            "appointment_id",
          ),

        cancellation_reason:
          formData.get(
            "cancellation_reason",
          ) ||
          undefined,
      },
    );

  if (!parsed.success) {
    return {
      ok: false,
      mensagem:
        "Agendamento inválido.",
    };
  }

  const { data: appointment } =
    await supabase
      .from("appointments")
      .select("id")
      .eq(
        "id",
        parsed.data
          .appointment_id,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .maybeSingle();

  if (!appointment) {
    return {
      ok: false,

      mensagem:
        "Agendamento não encontrado.",
    };
  }

  const { error } =
    await supabase.rpc(
      "cancel_my_appointment",
      {
        target_appointment_id:
          appointment.id,

        reason:
          parsed.data
            .cancellation_reason ||
          null,
      },
    );

  if (
    error?.message.includes(
      "CANCELLATION_LIMIT",
    )
  ) {
    return {
      ok: false,

      mensagem:
        "O prazo permitido para cancelamento já terminou.",
    };
  }

  if (error) {
    return {
      ok: false,

      mensagem:
        "Não foi possível cancelar o agendamento.",
    };
  }

  updateTag(
    getAvailabilityCacheTag(
      barbershop.id,
    ),
  );

  revalidatePath(
    `/${barbershop.slug}`,
  );

  revalidatePath(
    `/${barbershop.slug}/cliente/agendamentos`,
  );

  revalidatePath(
    `/admin/${barbershop.slug}/agenda`,
  );

  revalidatePath(
    `/admin/${barbershop.slug}/reservas`,
  );

  return {
    ok: true,

    mensagem:
      "Agendamento cancelado com sucesso.",
  };
}

export async function registrarPagamentoPresencial(
  formData: FormData,
) {
  const {
    user,
    barbershop,
  } =
    await requireBarbershopManager(
      formSlug(formData),
    );

  const supabase =
    await createClient();

  const parsed =
    pagamentoPresencialSchema.safeParse(
      {
        appointment_id:
          formData.get(
            "appointment_id",
          ),

        amount:
          formData.get(
            "amount",
          ),

        method:
          formData.get(
            "method",
          ),

        status:
          formData.get(
            "status",
          ) ||
          "paid",
      },
    );

  if (!parsed.success) {
    return {
      ok: false,

      mensagem:
        parsed.error.issues[0]
          ?.message ??
        "Dados inválidos.",
    };
  }

  const { data: appointment } =
    await supabase
      .from("appointments")
      .select("id")
      .eq(
        "id",
        parsed.data
          .appointment_id,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .maybeSingle();

  if (!appointment) {
    return {
      ok: false,

      mensagem:
        "Reserva não encontrada nesta barbearia.",
    };
  }

  const { error } =
    await supabase
      .from(
        "presencial_payments",
      )
      .upsert(
        {
          barbershop_id:
            barbershop.id,

          appointment_id:
            appointment.id,

          amount:
            parsed.data.amount,

          method:
            parsed.data.method,

          status:
            parsed.data.status,

          received_by:
            user.id,

          paid_at:
            parsed.data.status ===
            "paid"
              ? new Date().toISOString()
              : null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "appointment_id",
        },
      );

  if (error) {
    return {
      ok: false,

      mensagem:
        "Não foi possível registrar o pagamento presencial.",
    };
  }

  await supabase
    .from(
      "appointment_events",
    )
    .insert({
      barbershop_id:
        barbershop.id,

      appointment_id:
        appointment.id,

      event_type:
        "payment_registered",

      description:
        "Pagamento presencial registrado no painel administrativo.",

      created_by:
        user.id,
    });

  revalidatePath(
    `/admin/${barbershop.slug}/pagamentos`,
  );

  revalidatePath(
    `/admin/${barbershop.slug}/faturamento`,
  );

  return {
    ok: true,

    mensagem:
      "Pagamento presencial registrado.",
  };
}

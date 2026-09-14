"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";
import {
  barbeiroAdminSchema,
  bloqueioHorarioSchema,
  horarioAtendimentoSchema,
  servicoAdminSchema,
} from "@/lib/admin/schemas";

type ActionResult = {
  ok: boolean;
  mensagem: string;
};

function checkboxAtivo(formData: FormData) {
  return formData.get("is_active") === "on";
}

function primeiroErro(errorMessage: string | undefined, fallback: string) {
  return errorMessage ?? fallback;
}

function formSlug(formData: FormData) {
  return String(formData.get("slug") ?? "");
}

function revalidarAdminAgenda(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/reservar`);
  revalidatePath(`/admin/${slug}`);
  revalidatePath(`/admin/${slug}/agenda`);
  revalidatePath(`/admin/${slug}/horarios`);
}

type ExpedienteBase = {
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
};

async function substituirExpedienteSemanal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barbershopId: string,
  barberId: string,
  expediente: ExpedienteBase,
) {
  // Internamente o banco continua usando business_hours por dia da semana.
  // Regra operacional: barbeiro ativo trabalha de segunda a sábado.
  // Domingo não recebe expediente por padrão e só deve abrir se a barbearia decidir futuramente.
  const diasUteisDaBarbearia = [1, 2, 3, 4, 5, 6];
  const registros = diasUteisDaBarbearia.map((dayOfWeek) => ({
    barber_id: barberId,
    barbershop_id: barbershopId,
    day_of_week: dayOfWeek,
    start_time: expediente.start_time,
    end_time: expediente.end_time,
    break_start: expediente.break_start,
    break_end: expediente.break_end,
    is_active: expediente.is_active,
  }));

  const { error } = await supabase.rpc("replace_barber_hours", {
    tenant: barbershopId,
    barber: barberId,
    hours: registros,
  });
  return error;
}

export async function criarServico(formData: FormData): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const parsed = servicoAdminSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    duration_minutes: formData.get("duration_minutes"),
    image_url: formData.get("image_url"),
    is_active: checkboxAtivo(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error.issues[0]?.message,
        "Dados inválidos.",
      ),
    };
  }

  const { error } = await supabase
    .from("services")
    .insert({ ...parsed.data, barbershop_id: barbershop.id });

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível cadastrar o serviço: ${error.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/servicos`);

  return { ok: true, mensagem: "Serviço cadastrado com sucesso." };
}

export async function atualizarServico(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const parsed = servicoAdminSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    duration_minutes: formData.get("duration_minutes"),
    image_url: formData.get("image_url"),
    is_active: checkboxAtivo(formData),
  });

  if (!parsed.success || !parsed.data.id) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error?.issues[0]?.message,
        "Serviço inválido.",
      ),
    };
  }

  const { id, ...dados } = parsed.data;
  const { error } = await supabase
    .from("services")
    .update(dados)
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível atualizar o serviço: ${error.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/servicos`);

  return { ok: true, mensagem: "Serviço atualizado com sucesso." };
}

export async function alternarStatusServico(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível alterar o status do serviço: ${error.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/servicos`);

  return {
    ok: true,
    mensagem: isActive ? "Serviço ativado." : "Serviço desativado.",
  };
}

export async function criarBarbeiro(formData: FormData): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const serviceIds = formData.getAll("service_ids").map(String);
  const parsed = barbeiroAdminSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
    photo_url: formData.get("photo_url"),
    phone: formData.get("phone"),
    start_time: formData.get("start_time") || "09:00",
    end_time: formData.get("end_time") || "18:00",
    break_start: formData.get("break_start"),
    break_end: formData.get("break_end"),
    is_active: checkboxAtivo(formData),
    service_ids: serviceIds,
  });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error.issues[0]?.message,
        "Dados inválidos.",
      ),
    };
  }

  const {
    service_ids,
    start_time,
    end_time,
    break_start,
    break_end,
    ...barbeiro
  } = parsed.data;
  const { data, error } = await supabase
    .from("barbers")
    .insert({ ...barbeiro, barbershop_id: barbershop.id })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      mensagem: `Não foi possível cadastrar o barbeiro: ${error?.message ?? "erro desconhecido"}`,
    };
  }

  if (service_ids.length > 0) {
    const vinculos = service_ids.map((serviceId) => ({
      barber_id: data.id,
      service_id: serviceId,
      barbershop_id: barbershop.id,
      is_active: true,
    }));

    const { error: vinculoError } = await supabase
      .from("barber_services")
      .insert(vinculos);

    if (vinculoError) {
      return {
        ok: false,
        mensagem: `Barbeiro criado, mas não foi possível vincular serviços: ${vinculoError.message}`,
      };
    }
  }

  const expedienteError = await substituirExpedienteSemanal(
    supabase,
    barbershop.id,
    data.id,
    {
      start_time,
      end_time,
      break_start,
      break_end,
      is_active: true,
    },
  );

  if (expedienteError) {
    return {
      ok: false,
      mensagem: `Barbeiro criado, mas não foi possível aplicar o expediente padrão: ${expedienteError.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/barbeiros`);
  revalidatePath(`/admin/${barbershop.slug}/horarios`);

  return { ok: true, mensagem: "Barbeiro cadastrado com sucesso." };
}

export async function atualizarBarbeiro(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const serviceIds = formData.getAll("service_ids").map(String);
  const parsed = barbeiroAdminSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    bio: formData.get("bio"),
    photo_url: formData.get("photo_url"),
    phone: formData.get("phone"),
    start_time: formData.get("start_time") || "09:00",
    end_time: formData.get("end_time") || "18:00",
    break_start: formData.get("break_start"),
    break_end: formData.get("break_end"),
    is_active: checkboxAtivo(formData),
    service_ids: serviceIds,
  });

  if (!parsed.success || !parsed.data.id) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error?.issues[0]?.message,
        "Barbeiro inválido.",
      ),
    };
  }

  const {
    id,
    service_ids,
    start_time,
    end_time,
    break_start,
    break_end,
    ...barbeiro
  } = parsed.data;
  const { error } = await supabase
    .from("barbers")
    .update(barbeiro)
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível atualizar o barbeiro: ${error.message}`,
    };
  }

  // Exclusão lógica dos vínculos antigos para preservar histórico.
  await supabase
    .from("barber_services")
    .update({ is_active: false })
    .eq("barbershop_id", barbershop.id)
    .eq("barber_id", id);

  if (service_ids.length > 0) {
    const vinculos = service_ids.map((serviceId) => ({
      barber_id: id,
      service_id: serviceId,
      barbershop_id: barbershop.id,
      is_active: true,
    }));

    const { error: vinculoError } = await supabase
      .from("barber_services")
      .upsert(vinculos, { onConflict: "barber_id,service_id" });

    if (vinculoError) {
      return {
        ok: false,
        mensagem: `Barbeiro atualizado, mas houve erro ao vincular serviços: ${vinculoError.message}`,
      };
    }
  }

  const expedienteError = await substituirExpedienteSemanal(
    supabase,
    barbershop.id,
    id,
    {
      start_time,
      end_time,
      break_start,
      break_end,
      is_active: true,
    },
  );

  if (expedienteError) {
    return {
      ok: false,
      mensagem: `Barbeiro atualizado, mas não foi possível atualizar o expediente: ${expedienteError.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/barbeiros`);
  revalidatePath(`/admin/${barbershop.slug}/horarios`);

  return { ok: true, mensagem: "Barbeiro atualizado com sucesso." };
}

export async function alternarStatusBarbeiro(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("barbers")
    .update({ is_active: isActive })
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível alterar o status do barbeiro: ${error.message}`,
    };
  }

  revalidatePath(`/${barbershop.slug}`);
  revalidatePath(`/${barbershop.slug}/reservar`);
  revalidatePath(`/admin/${barbershop.slug}/barbeiros`);
  revalidatePath(`/admin/${barbershop.slug}/horarios`);

  return {
    ok: true,
    mensagem: isActive ? "Barbeiro ativado." : "Barbeiro desativado.",
  };
}

export async function aplicarExpedientePadraoBarbeiro(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const parsed = horarioAtendimentoSchema.safeParse({
    barber_id: formData.get("barber_id"),
    day_of_week: 1,
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    break_start: formData.get("break_start"),
    break_end: formData.get("break_end"),
    is_active: checkboxAtivo(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error.issues[0]?.message,
        "Dados inválidos para o expediente padrão.",
      ),
    };
  }

  const error = await substituirExpedienteSemanal(
    supabase,
    barbershop.id,
    parsed.data.barber_id,
    {
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      break_start: parsed.data.break_start,
      break_end: parsed.data.break_end,
      is_active: parsed.data.is_active,
    },
  );

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível aplicar o expediente padrão: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return {
    ok: true,
    mensagem: "Expediente padrão aplicado de segunda a sábado.",
  };
}

export async function criarHorarioAtendimento(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const parsed = horarioAtendimentoSchema.safeParse({
    barber_id: formData.get("barber_id"),
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    break_start: formData.get("break_start"),
    break_end: formData.get("break_end"),
    is_active: checkboxAtivo(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error.issues[0]?.message,
        "Dados inválidos para o expediente.",
      ),
    };
  }

  const { error } = await supabase
    .from("business_hours")
    .insert({ ...parsed.data, barbershop_id: barbershop.id });

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível cadastrar o horário: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return {
    ok: true,
    mensagem: "Horário de atendimento cadastrado com sucesso.",
  };
}

export async function atualizarHorarioAtendimento(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const parsed = horarioAtendimentoSchema.safeParse({
    id: formData.get("id"),
    barber_id: formData.get("barber_id"),
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    break_start: formData.get("break_start"),
    break_end: formData.get("break_end"),
    is_active: checkboxAtivo(formData),
  });

  if (!parsed.success || !parsed.data.id) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error?.issues[0]?.message,
        "Horário inválido.",
      ),
    };
  }

  const { id, ...dados } = parsed.data;
  const { error } = await supabase
    .from("business_hours")
    .update(dados)
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível atualizar o horário: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return {
    ok: true,
    mensagem: "Horário de atendimento atualizado com sucesso.",
  };
}

export async function alternarStatusHorarioAtendimento(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("business_hours")
    .update({ is_active: isActive })
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível alterar o status do horário: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return {
    ok: true,
    mensagem: isActive ? "Horário ativado." : "Horário desativado.",
  };
}

export async function excluirHorarioAtendimento(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase
    .from("business_hours")
    .delete()
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível excluir o horário: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return { ok: true, mensagem: "Horário excluído com sucesso." };
}

export async function criarBloqueioHorario(
  formData: FormData,
): Promise<ActionResult> {
  const { user, barbershop } = await requireBarbershopManager(
    formSlug(formData),
  );
  const supabase = await createClient();

  const dataBloqueio = String(formData.get("block_date") ?? "").trim();
  const inicioBloqueio = String(formData.get("block_start_time") ?? "").trim();
  const fimBloqueio = String(formData.get("block_end_time") ?? "").trim();

  // Eu mantenho a data local até o banco aplicar o fuso da barbearia.
  const startAt =
    dataBloqueio && inicioBloqueio
      ? `${dataBloqueio}T${inicioBloqueio}`
      : formData.get("start_at");

  const endAt =
    dataBloqueio && fimBloqueio
      ? `${dataBloqueio}T${fimBloqueio}`
      : formData.get("end_at");

  const parsed = bloqueioHorarioSchema.safeParse({
    barber_id: formData.get("barber_id"),
    start_at: startAt,
    end_at: endAt,
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      mensagem: primeiroErro(
        parsed.error.issues[0]?.message,
        "Dados inválidos para o bloqueio.",
      ),
    };
  }

  const { error } = await supabase.rpc("create_barber_block", {
    tenant: barbershop.id,
    barber: parsed.data.barber_id,
    local_start: parsed.data.start_at,
    local_end: parsed.data.end_at,
    block_reason: parsed.data.reason,
  });

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível criar o bloqueio: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return { ok: true, mensagem: "Bloqueio criado com sucesso." };
}

export async function excluirBloqueioHorario(
  formData: FormData,
): Promise<ActionResult> {
  const { barbershop } = await requireBarbershopManager(formSlug(formData));
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase
    .from("blocked_slots")
    .delete()
    .eq("barbershop_id", barbershop.id)
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem: `Não foi possível remover o bloqueio: ${error.message}`,
    };
  }

  revalidarAdminAgenda(barbershop.slug);

  return { ok: true, mensagem: "Bloqueio removido com sucesso." };
}

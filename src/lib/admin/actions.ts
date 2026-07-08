'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exigirAdmin } from '@/lib/auth/permissoes';
import {
  barbeiroAdminSchema,
  bloqueioHorarioSchema,
  horarioAtendimentoSchema,
  servicoAdminSchema
} from '@/lib/admin/schemas';

type ActionResult = {
  ok: boolean;
  mensagem: string;
};

function checkboxAtivo(formData: FormData) {
  return formData.get('is_active') === 'on';
}

function primeiroErro(errorMessage: string | undefined, fallback: string) {
  return errorMessage ?? fallback;
}

function revalidarAdminAgenda() {
  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin');
  revalidatePath('/admin/agenda');
  revalidatePath('/admin/horarios');
}

export async function criarServico(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const parsed = servicoAdminSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    duration_minutes: formData.get('duration_minutes'),
    image_url: formData.get('image_url'),
    is_active: checkboxAtivo(formData)
  });

  if (!parsed.success) {
    return { ok: false, mensagem: primeiroErro(parsed.error.issues[0]?.message, 'Dados inválidos.') };
  }

  const { error } = await supabase.from('services').insert(parsed.data);

  if (error) {
    return { ok: false, mensagem: `Não foi possível cadastrar o serviço: ${error.message}` };
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/servicos');

  return { ok: true, mensagem: 'Serviço cadastrado com sucesso.' };
}

export async function atualizarServico(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const parsed = servicoAdminSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    duration_minutes: formData.get('duration_minutes'),
    image_url: formData.get('image_url'),
    is_active: checkboxAtivo(formData)
  });

  if (!parsed.success || !parsed.data.id) {
    return { ok: false, mensagem: primeiroErro(parsed.error?.issues[0]?.message, 'Serviço inválido.') };
  }

  const { id, ...dados } = parsed.data;
  const { error } = await supabase.from('services').update(dados).eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível atualizar o serviço: ${error.message}` };
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/servicos');

  return { ok: true, mensagem: 'Serviço atualizado com sucesso.' };
}

export async function alternarStatusServico(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const isActive = formData.get('is_active') === 'true';

  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível alterar o status do serviço: ${error.message}` };
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/servicos');

  return { ok: true, mensagem: isActive ? 'Serviço ativado.' : 'Serviço desativado.' };
}

export async function criarBarbeiro(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const serviceIds = formData.getAll('service_ids').map(String);
  const parsed = barbeiroAdminSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio'),
    photo_url: formData.get('photo_url'),
    phone: formData.get('phone'),
    is_active: checkboxAtivo(formData),
    service_ids: serviceIds
  });

  if (!parsed.success) {
    return { ok: false, mensagem: primeiroErro(parsed.error.issues[0]?.message, 'Dados inválidos.') };
  }

  const { service_ids, ...barbeiro } = parsed.data;
  const { data, error } = await supabase
    .from('barbers')
    .insert(barbeiro)
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, mensagem: `Não foi possível cadastrar o barbeiro: ${error?.message ?? 'erro desconhecido'}` };
  }

  if (service_ids.length > 0) {
    const vinculos = service_ids.map((serviceId) => ({
      barber_id: data.id,
      service_id: serviceId,
      is_active: true
    }));

    const { error: vinculoError } = await supabase.from('barber_services').insert(vinculos);

    if (vinculoError) {
      return { ok: false, mensagem: `Barbeiro criado, mas não foi possível vincular serviços: ${vinculoError.message}` };
    }
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/barbeiros');
  revalidatePath('/admin/horarios');

  return { ok: true, mensagem: 'Barbeiro cadastrado com sucesso.' };
}

export async function atualizarBarbeiro(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const serviceIds = formData.getAll('service_ids').map(String);
  const parsed = barbeiroAdminSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    bio: formData.get('bio'),
    photo_url: formData.get('photo_url'),
    phone: formData.get('phone'),
    is_active: checkboxAtivo(formData),
    service_ids: serviceIds
  });

  if (!parsed.success || !parsed.data.id) {
    return { ok: false, mensagem: primeiroErro(parsed.error?.issues[0]?.message, 'Barbeiro inválido.') };
  }

  const { id, service_ids, ...barbeiro } = parsed.data;
  const { error } = await supabase.from('barbers').update(barbeiro).eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível atualizar o barbeiro: ${error.message}` };
  }

  // Exclusão lógica dos vínculos antigos para preservar histórico.
  await supabase.from('barber_services').update({ is_active: false }).eq('barber_id', id);

  if (service_ids.length > 0) {
    const vinculos = service_ids.map((serviceId) => ({
      barber_id: id,
      service_id: serviceId,
      is_active: true
    }));

    const { error: vinculoError } = await supabase
      .from('barber_services')
      .upsert(vinculos, { onConflict: 'barber_id,service_id' });

    if (vinculoError) {
      return { ok: false, mensagem: `Barbeiro atualizado, mas houve erro ao vincular serviços: ${vinculoError.message}` };
    }
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/barbeiros');
  revalidatePath('/admin/horarios');

  return { ok: true, mensagem: 'Barbeiro atualizado com sucesso.' };
}

export async function alternarStatusBarbeiro(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const isActive = formData.get('is_active') === 'true';

  const { error } = await supabase
    .from('barbers')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível alterar o status do barbeiro: ${error.message}` };
  }

  revalidatePath('/');
  revalidatePath('/reservar');
  revalidatePath('/admin/barbeiros');
  revalidatePath('/admin/horarios');

  return { ok: true, mensagem: isActive ? 'Barbeiro ativado.' : 'Barbeiro desativado.' };
}

export async function criarHorarioAtendimento(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const parsed = horarioAtendimentoSchema.safeParse({
    barber_id: formData.get('barber_id'),
    day_of_week: formData.get('day_of_week'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    break_start: formData.get('break_start'),
    break_end: formData.get('break_end'),
    is_active: checkboxAtivo(formData)
  });

  if (!parsed.success) {
    return { ok: false, mensagem: primeiroErro(parsed.error.issues[0]?.message, 'Dados inválidos para o expediente.') };
  }

  const { error } = await supabase.from('business_hours').insert(parsed.data);

  if (error) {
    return { ok: false, mensagem: `Não foi possível cadastrar o horário: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: 'Horário de atendimento cadastrado com sucesso.' };
}

export async function atualizarHorarioAtendimento(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const parsed = horarioAtendimentoSchema.safeParse({
    id: formData.get('id'),
    barber_id: formData.get('barber_id'),
    day_of_week: formData.get('day_of_week'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    break_start: formData.get('break_start'),
    break_end: formData.get('break_end'),
    is_active: checkboxAtivo(formData)
  });

  if (!parsed.success || !parsed.data.id) {
    return { ok: false, mensagem: primeiroErro(parsed.error?.issues[0]?.message, 'Horário inválido.') };
  }

  const { id, ...dados } = parsed.data;
  const { error } = await supabase.from('business_hours').update(dados).eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível atualizar o horário: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: 'Horário de atendimento atualizado com sucesso.' };
}

export async function alternarStatusHorarioAtendimento(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const isActive = formData.get('is_active') === 'true';

  const { error } = await supabase.from('business_hours').update({ is_active: isActive }).eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível alterar o status do horário: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: isActive ? 'Horário ativado.' : 'Horário desativado.' };
}

export async function excluirHorarioAtendimento(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '');

  const { error } = await supabase.from('business_hours').delete().eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível excluir o horário: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: 'Horário excluído com sucesso.' };
}

export async function criarBloqueioHorario(formData: FormData): Promise<ActionResult> {
  const { user } = await exigirAdmin();
  const supabase = await createClient();

  const parsed = bloqueioHorarioSchema.safeParse({
    barber_id: formData.get('barber_id'),
    start_at: formData.get('start_at'),
    end_at: formData.get('end_at'),
    reason: formData.get('reason')
  });

  if (!parsed.success) {
    return { ok: false, mensagem: primeiroErro(parsed.error.issues[0]?.message, 'Dados inválidos para o bloqueio.') };
  }

  const dados = {
    ...parsed.data,
    start_at: new Date(parsed.data.start_at).toISOString(),
    end_at: new Date(parsed.data.end_at).toISOString(),
    created_by: user.id
  };

  const { error } = await supabase.from('blocked_slots').insert(dados);

  if (error) {
    return { ok: false, mensagem: `Não foi possível criar o bloqueio: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: 'Bloqueio criado com sucesso.' };
}

export async function excluirBloqueioHorario(formData: FormData): Promise<ActionResult> {
  await exigirAdmin();
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '');

  const { error } = await supabase.from('blocked_slots').delete().eq('id', id);

  if (error) {
    return { ok: false, mensagem: `Não foi possível remover o bloqueio: ${error.message}` };
  }

  revalidarAdminAgenda();

  return { ok: true, mensagem: 'Bloqueio removido com sucesso.' };
}

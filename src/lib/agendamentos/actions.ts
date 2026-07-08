'use server';

import { addHours, addMinutes, isBefore, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calcularHorariosDisponiveis } from '@/lib/agendamentos/horarios';
import { exigirAdmin, exigirPerfilCompleto, exigirUsuario } from '@/lib/auth/permissoes';
import {
  cancelarAgendamentoSchema,
  completarCadastroSchema,
  criarAgendamentoSchema,
  pagamentoPresencialSchema
} from '@/lib/agendamentos/schemas';

function normalizarTelefone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function completarCadastro(formData: FormData) {
  const { user } = await exigirUsuario();
  const supabase = await createClient();

  const parsed = completarCadastroSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    email: formData.get('email')
  });

  if (!parsed.success) {
    return { ok: false, mensagem: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: normalizarTelefone(parsed.data.phone),
      email: parsed.data.email || user.email,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) return { ok: false, mensagem: 'Não foi possível atualizar seu cadastro.' };

  revalidatePath('/cliente/perfil');
  redirect('/reservar');
}

export async function criarAgendamento(formData: FormData) {
  const { user, profile } = await exigirPerfilCompleto();
  const supabase = await createClient();

  const parsed = criarAgendamentoSchema.safeParse({
    service_id: formData.get('service_id'),
    barber_id: formData.get('barber_id'),
    start_at: formData.get('start_at'),
    client_notes: formData.get('client_notes') || undefined
  });

  if (!parsed.success) {
    return { ok: false, mensagem: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const inicio = parseISO(parsed.data.start_at);
  if (isBefore(inicio, new Date())) {
    return { ok: false, mensagem: 'Não é possível reservar horário no passado.' };
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('booking_advance_days')
    .limit(1)
    .maybeSingle();

  const limiteDias = settings?.booking_advance_days ?? 30;
  if (inicio > addHours(new Date(), limiteDias * 24)) {
    return { ok: false, mensagem: `A barbearia permite reservas com até ${limiteDias} dias de antecedência.` };
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, price, duration_minutes, is_active')
    .eq('id', parsed.data.service_id)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) return { ok: false, mensagem: 'Serviço indisponível.' };

  const { data: relation } = await supabase
    .from('barber_services')
    .select('id')
    .eq('barber_id', parsed.data.barber_id)
    .eq('service_id', parsed.data.service_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!relation) return { ok: false, mensagem: 'Este barbeiro não realiza o serviço selecionado.' };

  const fim = addMinutes(inicio, service.duration_minutes);

  const dataInicio = new Date(inicio);
  dataInicio.setHours(0, 0, 0, 0);
  const dataFim = new Date(inicio);
  dataFim.setHours(23, 59, 59, 999);

  const [{ data: expediente }, { data: ocupados }, { data: bloqueados }] = await Promise.all([
    supabase.from('business_hours').select('*').eq('barber_id', parsed.data.barber_id).eq('is_active', true),
    supabase
      .from('appointment_busy_slots')
      .select('*')
      .eq('barber_id', parsed.data.barber_id)
      .gte('start_at', dataInicio.toISOString())
      .lte('start_at', dataFim.toISOString()),
    supabase
      .from('blocked_busy_slots')
      .select('*')
      .eq('barber_id', parsed.data.barber_id)
      .gte('start_at', dataInicio.toISOString())
      .lte('start_at', dataFim.toISOString())
  ]);

  const horariosDisponiveis = calcularHorariosDisponiveis({
    dataISO: dataInicio.toISOString(),
    duracaoMinutos: service.duration_minutes,
    expediente: expediente ?? [],
    ocupados: ocupados ?? [],
    bloqueados: bloqueados ?? []
  });

  const horarioContinuaDisponivel = horariosDisponiveis.some((slot) => slot.startAt === inicio.toISOString());
  if (!horarioContinuaDisponivel) {
    return { ok: false, mensagem: 'Esse horário não está disponível para reserva.' };
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: user.id,
      barber_id: parsed.data.barber_id,
      service_id: parsed.data.service_id,
      start_at: inicio.toISOString(),
      end_at: fim.toISOString(),
      status: 'pending',
      total_price: service.price,
      client_notes: parsed.data.client_notes || null
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, mensagem: 'Não foi possível confirmar a reserva. Verifique se o horário continua disponível.' };
  }

  await supabase.from('appointment_events').insert({
    appointment_id: appointment.id,
    event_type: 'created_by_client',
    description: `Reserva criada por ${profile?.full_name ?? 'cliente'}.`,
    created_by: user.id
  });

  revalidatePath('/cliente/agendamentos');
  redirect('/cliente/agendamentos?reservado=1');
}

export async function cancelarAgendamento(formData: FormData) {
  const { user, profile } = await exigirUsuario();
  const supabase = await createClient();

  const parsed = cancelarAgendamentoSchema.safeParse({
    appointment_id: formData.get('appointment_id'),
    cancellation_reason: formData.get('cancellation_reason') || undefined
  });

  if (!parsed.success) return { ok: false, mensagem: 'Agendamento inválido.' };

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, client_id, start_at, status')
    .eq('id', parsed.data.appointment_id)
    .single();

  if (!appointment) return { ok: false, mensagem: 'Agendamento não encontrado.' };

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin && appointment.client_id !== user.id) {
    return { ok: false, mensagem: 'Você não tem permissão para cancelar este agendamento.' };
  }

  if (!isAdmin) {
    const { data: settings } = await supabase
      .from('business_settings')
      .select('cancellation_limit_hours')
      .limit(1)
      .maybeSingle();

    const limiteHoras = settings?.cancellation_limit_hours ?? 4;
    const dataLimiteCancelamento = addHours(new Date(), limiteHoras);
    if (parseISO(appointment.start_at) < dataLimiteCancelamento) {
      return { ok: false, mensagem: `Cancelamentos precisam ser feitos com pelo menos ${limiteHoras} horas de antecedência.` };
    }
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.cancellation_reason || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointment.id);

  if (error) return { ok: false, mensagem: 'Não foi possível cancelar o agendamento.' };

  await supabase.from('appointment_events').insert({
    appointment_id: appointment.id,
    event_type: 'canceled',
    description: parsed.data.cancellation_reason || 'Agendamento cancelado.',
    created_by: user.id
  });

  revalidatePath('/cliente/agendamentos');
  revalidatePath('/admin/reservas');
  return { ok: true, mensagem: 'Agendamento cancelado com sucesso.' };
}

export async function registrarPagamentoPresencial(formData: FormData) {
  const { user } = await exigirAdmin();
  const supabase = await createClient();

  const parsed = pagamentoPresencialSchema.safeParse({
    appointment_id: formData.get('appointment_id'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    status: formData.get('status') || 'paid'
  });

  if (!parsed.success) {
    return { ok: false, mensagem: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { error } = await supabase.from('presencial_payments').upsert({
    appointment_id: parsed.data.appointment_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    status: parsed.data.status,
    received_by: user.id,
    paid_at: parsed.data.status === 'paid' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'appointment_id' });

  if (error) return { ok: false, mensagem: 'Não foi possível registrar o pagamento presencial.' };

  await supabase.from('appointment_events').insert({
    appointment_id: parsed.data.appointment_id,
    event_type: 'payment_registered',
    description: 'Pagamento presencial registrado no painel administrativo.',
    created_by: user.id
  });

  revalidatePath('/admin/pagamentos');
  revalidatePath('/admin/faturamento');
  return { ok: true, mensagem: 'Pagamento presencial registrado.' };
}

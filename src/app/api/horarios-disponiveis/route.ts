import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calcularHorariosDisponiveis } from '@/lib/agendamentos/horarios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const serviceId = searchParams.get('serviceId');
  const data = searchParams.get('data');

  if (!barberId || !serviceId || !data) {
    return NextResponse.json({ horarios: [], erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: service }, { data: relation }] = await Promise.all([
    supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('barber_services')
      .select('id')
      .eq('barber_id', barberId)
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .maybeSingle()
  ]);

  if (!service || !relation) return NextResponse.json({ horarios: [] });

  const dataInicio = new Date(`${data}T00:00:00`);
  const dataFim = new Date(`${data}T23:59:59`);

  const [{ data: expediente }, { data: ocupados }, { data: bloqueados }] = await Promise.all([
    supabase.from('business_hours').select('*').eq('barber_id', barberId).eq('is_active', true),
    supabase.from('appointment_busy_slots').select('*').eq('barber_id', barberId).gte('start_at', dataInicio.toISOString()).lte('start_at', dataFim.toISOString()),
    supabase.from('blocked_busy_slots').select('*').eq('barber_id', barberId).gte('start_at', dataInicio.toISOString()).lte('start_at', dataFim.toISOString())
  ]);

  const horarios = calcularHorariosDisponiveis({
    dataISO: `${data}T00:00:00`,
    duracaoMinutos: Number(service.duration_minutes),
    expediente: expediente ?? [],
    ocupados: ocupados ?? [],
    bloqueados: bloqueados ?? []
  });

  return NextResponse.json({ horarios });
}

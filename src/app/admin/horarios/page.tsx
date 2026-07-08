import { CalendarX2, Clock3, Plus, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import {
  AlternarStatusHorarioForm,
  BloqueioHorarioForm,
  diasDaSemana,
  ExcluirBloqueioForm,
  ExcluirHorarioForm,
  HorarioAtendimentoForm
} from '@/components/forms/admin/HorarioAtendimentoForm';
import type { Barber, BlockedSlot, BusinessHour } from '@/lib/db/types';

type HorarioComBarbeiro = BusinessHour & {
  barbers?: { name: string } | null;
};

type BloqueioComBarbeiro = BlockedSlot & {
  barbers?: { name: string } | null;
};

function nomeDiaSemana(valor: number) {
  return diasDaSemana.find((dia) => dia.value === valor)?.label ?? 'Dia não informado';
}

function horaCurta(valor?: string | null) {
  return valor ? valor.slice(0, 5) : '';
}

function dataHoraPtBR(valor: string) {
  return format(new Date(valor), 'dd/MM/yyyy HH:mm');
}

export default async function HorariosAdminPage() {
  const supabase = await createClient();
  const agora = new Date().toISOString();

  const [barbeirosResult, horariosResult, bloqueiosResult] = await Promise.all([
    supabase.from('barbers').select('*').order('is_active', { ascending: false }).order('name'),
    supabase
      .from('business_hours')
      .select('*, barbers(name)')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('blocked_slots')
      .select('*, barbers(name)')
      .gte('end_at', agora)
      .order('start_at', { ascending: true })
      .limit(80)
  ]);

  const barbeiros = (barbeirosResult.data ?? []) as Barber[];
  const horarios = (horariosResult.data ?? []) as HorarioComBarbeiro[];
  const bloqueios = (bloqueiosResult.data ?? []) as BloqueioComBarbeiro[];

  return (
    <div className="grid gap-4 sm:gap-5">
      <div>
        <Badge><Clock3 className="h-3.5 w-3.5" /> Agenda operacional</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Horários e bloqueios</h1>
        <p className="mt-2 max-w-3xl text-zinc-300">
          Defina o expediente semanal de cada barbeiro, pausas internas e bloqueios específicos. Essas regras alimentam a tela de reserva e evitam horários fora do atendimento.
        </p>
      </div>

      {(barbeirosResult.error || horariosResult.error || bloqueiosResult.error) && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardTitle>Erro ao carregar horários</CardTitle>
          <CardDescription>
            {barbeirosResult.error?.message ?? horariosResult.error?.message ?? bloqueiosResult.error?.message}
          </CardDescription>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08]">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 sm:h-12 sm:w-12 sm:rounded-2xl text-brand-950 shadow-button">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Novo expediente semanal</CardTitle>
              <CardDescription>
                Exemplo: segunda-feira, 08:00 às 18:00, com pausa de 12:00 às 13:00.
              </CardDescription>
            </div>
          </div>
          <div className="mt-6">
            <HorarioAtendimentoForm barbeiros={barbeiros} />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white/[0.08] to-red-500/[0.08]">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-950/20">
              <CalendarX2 className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Novo bloqueio específico</CardTitle>
              <CardDescription>
                Use para folga, manutenção, compromisso externo ou qualquer período que não deve aparecer para reserva.
              </CardDescription>
            </div>
          </div>
          <div className="mt-6">
            <BloqueioHorarioForm barbeiros={barbeiros} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start">
          <div>
            <CardTitle>Expediente cadastrado</CardTitle>
            <CardDescription>
              Os horários ativos aparecem no cálculo de disponibilidade. Horários inativos ficam salvos, mas não liberam reservas.
            </CardDescription>
          </div>
          <Badge><ShieldCheck className="h-3.5 w-3.5" /> Protegido por RLS</Badge>
        </div>

        <div className="mt-4 sm:mt-5 grid gap-4">
          {horarios.map((horario) => (
            <div key={horario.id} className="rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
              <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {horario.barbers?.name ?? 'Barbeiro'} • {nomeDiaSemana(horario.day_of_week)}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    {horaCurta(horario.start_time)} às {horaCurta(horario.end_time)}
                    {horario.break_start && horario.break_end
                      ? ` • pausa ${horaCurta(horario.break_start)} às ${horaCurta(horario.break_end)}`
                      : ' • sem pausa cadastrada'}
                  </p>
                  <p className="mt-2 inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-brand-100">
                    {horario.is_active ? 'Ativo para reservas' : 'Inativo'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AlternarStatusHorarioForm horario={horario} />
                  <ExcluirHorarioForm horario={horario} />
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <HorarioAtendimentoForm barbeiros={barbeiros} horario={horario} />
              </div>
            </div>
          ))}
        </div>

        {horarios.length === 0 && (
          <p className="mt-4 sm:mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Nenhum expediente cadastrado. Sem expediente, os clientes não verão horários disponíveis para reserva.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Bloqueios futuros</CardTitle>
        <CardDescription>
          Lista de bloqueios ainda válidos. Ao remover um bloqueio, o período volta a ficar disponível se também estiver dentro do expediente e sem reserva ativa.
        </CardDescription>

        <div className="mt-4 sm:mt-5 grid gap-4">
          {bloqueios.map((bloqueio) => (
            <div key={bloqueio.id} className="flex flex-col justify-between gap-4 rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 sm:p-5 md:flex-row md:items-center">
              <div>
                <h3 className="text-base font-black text-white">{bloqueio.barbers?.name ?? 'Barbeiro'}</h3>
                <p className="mt-1 text-sm text-zinc-300">
                  {dataHoraPtBR(bloqueio.start_at)} até {dataHoraPtBR(bloqueio.end_at)}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {bloqueio.reason ?? 'Sem motivo informado.'}
                </p>
              </div>
              <ExcluirBloqueioForm bloqueio={bloqueio} />
            </div>
          ))}
        </div>

        {bloqueios.length === 0 && (
          <p className="mt-4 sm:mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300">
            Nenhum bloqueio futuro cadastrado.
          </p>
        )}
      </Card>
    </div>
  );
}

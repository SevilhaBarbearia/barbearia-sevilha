import { CalendarX2, Clock3, Plus, Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HorarioComBarbeiro = BusinessHour & {
  barbers?: { name: string } | null;
};

type BloqueioComBarbeiro = BlockedSlot & {
  barbers?: { name: string } | null;
};

type PageProps = {
  searchParams?: Promise<{ dia?: string; barbeiro?: string }>;
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

function normalizarDiaFiltro(valor?: string) {
  if (!valor || valor === 'hoje') return String(new Date().getDay());
  if (valor === 'todos') return 'todos';

  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 && numero <= 6 ? String(numero) : String(new Date().getDay());
}

function mesmoDiaSemana(valorISO: string, diaFiltro: string) {
  if (diaFiltro === 'todos') return true;
  return new Date(valorISO).getDay() === Number(diaFiltro);
}

export default async function HorariosAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const diaFiltro = normalizarDiaFiltro(params?.dia);
  const barbeiroFiltro = params?.barbeiro ?? 'todos';
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

  const horariosFiltrados = horarios.filter((horario) => {
    const passaDia = diaFiltro === 'todos' || horario.day_of_week === Number(diaFiltro);
    const passaBarbeiro = barbeiroFiltro === 'todos' || horario.barber_id === barbeiroFiltro;
    return passaDia && passaBarbeiro;
  });

  const bloqueiosFiltrados = bloqueios.filter((bloqueio) => {
    const passaDia = mesmoDiaSemana(bloqueio.start_at, diaFiltro);
    const passaBarbeiro = barbeiroFiltro === 'todos' || bloqueio.barber_id === barbeiroFiltro;
    return passaDia && passaBarbeiro;
  });

  const textoFiltroDia = diaFiltro === 'todos' ? 'Todos os dias' : nomeDiaSemana(Number(diaFiltro));

  return (
    <div className="grid gap-4 sm:gap-5">
      <div>
        <Badge><Clock3 className="h-3.5 w-3.5" /> Agenda operacional</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Horários e bloqueios</h1>
        <p className="mt-2 max-w-3xl text-zinc-300">
          Defina expediente semanal, pausas internas e bloqueios específicos. O filtro abaixo evita poluir a tela com todos os dias ao mesmo tempo.
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

      <Card className="border-brand-500/20 bg-brand-500/[0.07]">
        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <Label htmlFor="filtro-dia">Dia para exibir</Label>
            <Select id="filtro-dia" name="dia" defaultValue={diaFiltro}>
              <option value="todos">Todos os dias</option>
              {diasDaSemana.map((dia) => (
                <option key={dia.value} value={dia.value}>{dia.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-barbeiro">Barbeiro</Label>
            <Select id="filtro-barbeiro" name="barbeiro" defaultValue={barbeiroFiltro}>
              <option value="todos">Todos os barbeiros</option>
              {barbeiros.map((barbeiro) => (
                <option key={barbeiro.id} value={barbeiro.id}>{barbeiro.name}</option>
              ))}
            </Select>
          </div>

          <Button type="submit" className="w-full lg:w-auto">
            <Search className="h-4 w-4" /> Filtrar
          </Button>

          <ButtonLink href="/admin/horarios" variant="secondary" className="w-full lg:w-auto">
            Hoje
          </ButtonLink>
        </form>
        <p className="mt-4 text-sm text-zinc-300">
          Exibindo: <strong className="text-brand-100">{textoFiltroDia}</strong>
          {barbeiroFiltro !== 'todos' && ' • barbeiro selecionado'}.
        </p>
      </Card>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08]">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-brand-950 shadow-button sm:h-12 sm:w-12 sm:rounded-2xl">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Novo expediente semanal</CardTitle>
              <CardDescription>
                Cadastre o dia de atendimento do barbeiro. Depois use o filtro para revisar somente o dia desejado.
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
                Escolha o barbeiro, data e período exato do bloqueio. Não é necessário exibir todos os dias da semana na tela.
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
              A lista respeita o filtro de dia/barbeiro para manter a tela limpa. Horários inativos ficam salvos, mas não liberam reservas.
            </CardDescription>
          </div>
          <Badge><ShieldCheck className="h-3.5 w-3.5" /> Protegido por RLS</Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-5">
          {horariosFiltrados.map((horario) => (
            <details key={horario.id} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:rounded-[1.5rem] sm:p-5">
              <summary className="flex cursor-pointer list-none flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-base font-black text-white sm:text-lg">
                    {horario.barbers?.name ?? 'Barbeiro'} • {nomeDiaSemana(horario.day_of_week)}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    {horaCurta(horario.start_time)} às {horaCurta(horario.end_time)}
                    {horario.break_start && horario.break_end
                      ? ` • pausa ${horaCurta(horario.break_start)} às ${horaCurta(horario.break_end)}`
                      : ' • sem pausa cadastrada'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-brand-100">
                    {horario.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 group-open:hidden">Editar</span>
                </div>
              </summary>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  <AlternarStatusHorarioForm horario={horario} />
                  <ExcluirHorarioForm horario={horario} />
                </div>
                <HorarioAtendimentoForm barbeiros={barbeiros} horario={horario} />
              </div>
            </details>
          ))}
        </div>

        {horariosFiltrados.length === 0 && (
          <p className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100 sm:mt-5">
            Nenhum expediente encontrado para o filtro selecionado.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Bloqueios futuros</CardTitle>
        <CardDescription>
          Exibindo bloqueios conforme o dia e barbeiro selecionados no filtro. Ao remover um bloqueio, o período volta a ficar disponível se estiver dentro do expediente e sem reserva ativa.
        </CardDescription>

        <div className="mt-4 grid gap-3 sm:mt-5">
          {bloqueiosFiltrados.map((bloqueio) => (
            <div key={bloqueio.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:rounded-[1.5rem] sm:p-5 md:flex-row md:items-center">
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

        {bloqueiosFiltrados.length === 0 && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300 sm:mt-5">
            Nenhum bloqueio futuro encontrado para o filtro selecionado.
          </p>
        )}
      </Card>
    </div>
  );
}

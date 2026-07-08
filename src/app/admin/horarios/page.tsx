import { CalendarX2, Clock3, Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/server';
import { BloqueioHorarioForm, ExcluirBloqueioForm } from '@/components/forms/admin/HorarioAtendimentoForm';
import type { Barber, BlockedSlot } from '@/lib/db/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BloqueioComBarbeiro = BlockedSlot & {
  barbers?: { name: string } | null;
};

type PageProps = {
  searchParams?: Promise<{ data?: string; barbeiro?: string }>;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarDataFiltro(valor?: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor ?? '') ? String(valor) : hojeISO();
}

function intervaloDoDia(dataISO: string) {
  const inicio = new Date(`${dataISO}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString()
  };
}

function dataHoraPtBR(valor: string) {
  return format(new Date(valor), 'dd/MM/yyyy HH:mm');
}

export default async function HorariosAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dataFiltro = normalizarDataFiltro(params?.data);
  const barbeiroFiltro = params?.barbeiro ?? 'todos';
  const { inicio, fim } = intervaloDoDia(dataFiltro);
  const supabase = await createClient();

  const [barbeirosResult, bloqueiosResult] = await Promise.all([
    supabase.from('barbers').select('*').order('is_active', { ascending: false }).order('name'),
    supabase
      .from('blocked_slots')
      .select('*, barbers(name)')
      .gte('start_at', inicio)
      .lt('start_at', fim)
      .order('start_at', { ascending: true })
  ]);

  const barbeiros = (barbeirosResult.data ?? []) as Barber[];
  const bloqueios = (bloqueiosResult.data ?? []) as BloqueioComBarbeiro[];

  const bloqueiosFiltrados = bloqueios.filter((bloqueio) =>
    barbeiroFiltro === 'todos' || bloqueio.barber_id === barbeiroFiltro
  );

  return (
    <div className="grid gap-4 sm:gap-5">
      <div>
        <Badge><Clock3 className="h-3.5 w-3.5" /> Agenda operacional</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Horários e bloqueios</h1>
        <p className="mt-2 max-w-3xl text-zinc-300">
          Barbeiros ativos já ficam disponíveis de segunda a sábado no expediente padrão. Esta tela mostra somente bloqueios cadastrados, mantendo o painel limpo.
        </p>
      </div>

      {(barbeirosResult.error || bloqueiosResult.error) && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardTitle>Erro ao carregar bloqueios</CardTitle>
          <CardDescription>
            {barbeirosResult.error?.message ?? bloqueiosResult.error?.message}
          </CardDescription>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-white/[0.08] to-red-500/[0.08]">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-950/20">
            <CalendarX2 className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Novo bloqueio de horário</CardTitle>
            <CardDescription>
              Use bloqueios para folgas, compromissos, manutenção ou intervalos em que o barbeiro não deve receber reservas.
            </CardDescription>
          </div>
        </div>
        <div className="mt-6">
          <BloqueioHorarioForm barbeiros={barbeiros} />
        </div>
      </Card>

      <Card className="border-brand-500/20 bg-brand-500/[0.07]">
        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <div>
            <Label htmlFor="filtro-data">Dia para consultar bloqueios</Label>
            <Input id="filtro-data" type="date" name="data" defaultValue={dataFiltro} />
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
            Ver hoje
          </ButtonLink>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start">
          <div>
            <CardTitle>Bloqueios cadastrados</CardTitle>
            <CardDescription>
              Se não houver bloqueio no dia selecionado, a agenda permanece livre conforme o expediente padrão de segunda a sábado.
            </CardDescription>
          </div>
          <Badge><ShieldCheck className="h-3.5 w-3.5" /> Protegido por RLS</Badge>
        </div>

        <div className="mt-5 grid gap-3">
          {bloqueiosFiltrados.map((bloqueio) => (
            <div key={bloqueio.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:rounded-[1.5rem] sm:p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h3 className="text-base font-black text-white sm:text-lg">{bloqueio.barbers?.name ?? 'Barbeiro'}</h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    {dataHoraPtBR(bloqueio.start_at)} até {dataHoraPtBR(bloqueio.end_at)}
                  </p>
                  {bloqueio.reason && <p className="mt-2 text-sm text-zinc-400">{bloqueio.reason}</p>}
                </div>
                <ExcluirBloqueioForm bloqueio={bloqueio} />
              </div>
            </div>
          ))}
        </div>

        {bloqueiosFiltrados.length === 0 && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-300">
            Nenhum bloqueio cadastrado para este dia. A agenda está livre conforme o expediente padrão do barbeiro.
          </p>
        )}
      </Card>
    </div>
  );
}

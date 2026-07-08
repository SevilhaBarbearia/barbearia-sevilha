import { endOfDay, startOfDay } from 'date-fns';
import { CalendarCheck, Scissors, TrendingUp, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const hojeInicio = startOfDay(new Date()).toISOString();
  const hojeFim = endOfDay(new Date()).toISOString();

  const [{ count: reservasHoje }, { data: pagamentos }, { count: clientes }, { count: servicos }] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('start_at', hojeInicio).lte('start_at', hojeFim),
    supabase.from('presencial_payments').select('amount').eq('status', 'paid'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true)
  ]);

  const faturamento = pagamentos?.reduce((total, item) => total + Number(item.amount), 0) ?? 0;

  const cards = [
    { titulo: 'Reservas de hoje', valor: reservasHoje ?? 0, descricao: 'Atendimentos agendados para hoje', icon: CalendarCheck },
    { titulo: 'Clientes', valor: clientes ?? 0, descricao: 'Clientes cadastrados para contato', icon: UsersRound },
    { titulo: 'Serviços ativos', valor: servicos ?? 0, descricao: 'Serviços visíveis na reserva', icon: Scissors },
    { titulo: 'Faturamento pago', valor: formatarMoeda(faturamento), descricao: 'Somente pagamentos presenciais pagos', icon: TrendingUp }
  ];

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Administração</Badge>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">Resumo operacional com visual mais claro para tomar decisão rápida no balcão.</p>
        </div>
        <ButtonLink href="/admin/servicos" variant="secondary"><Scissors className="h-4 w-4" /> Gerenciar catálogo</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ titulo, valor, descricao, icon: Icone }) => (
          <Card key={titulo} className="group hover:-translate-y-1 hover:border-brand-500/35 hover:bg-white/[0.085]">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 sm:h-12 sm:w-12 sm:rounded-2xl text-brand-100 ring-1 ring-brand-500/25 transition group-hover:bg-brand-500 group-hover:text-brand-950">
                <Icone className="h-5 w-5" />
              </span>
            </div>
            <CardTitle className="mt-4 text-2xl sm:mt-5 sm:text-3xl">{valor}</CardTitle>
            <p className="mt-2 font-bold text-white">{titulo}</p>
            <CardDescription>{descricao}</CardDescription>
          </Card>
        ))}
      </div>

      <Card className="grid gap-4 bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08] md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <CardTitle>Próximo passo recomendado</CardTitle>
          <CardDescription>
            Mantenha serviços, barbeiros e horários bem preenchidos para que a tela de reserva pareça profissional para o cliente.
          </CardDescription>
        </div>
        <ButtonLink href="/admin/barbeiros">Cadastrar barbeiro</ButtonLink>
      </Card>
    </div>
  );
}

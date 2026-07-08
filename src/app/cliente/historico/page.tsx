import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { exigirPerfilCompleto } from '@/lib/auth/permissoes';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';

export default async function HistoricoPage() {
  const { user } = await exigirPerfilCompleto();
  const supabase = await createClient();

  const { data } = await supabase
    .from('appointments')
    .select('*, services(name), barbers(name), presencial_payments(amount, method, status)')
    .eq('client_id', user.id)
    .in('status', ['completed', 'no_show', 'canceled'])
    .order('start_at', { ascending: false });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">Histórico de atendimentos</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>{item.services?.name ?? 'Atendimento'}</CardTitle>
          <CardDescription>
            {format(new Date(item.start_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • {item.barbers?.name ?? 'Barbeiro'} • {formatarMoeda(Number(item.total_price))}
          </CardDescription>
        </Card>
      ))}
      {data?.length === 0 && <Card><CardDescription>Nenhum histórico encontrado.</CardDescription></Card>}
    </div>
  );
}

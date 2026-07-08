import { format } from 'date-fns';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';

export default async function PagamentosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('presencial_payments')
    .select('*, appointments(start_at, profiles(full_name), services(name))')
    .order('created_at', { ascending: false });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">Pagamentos presenciais</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>{formatarMoeda(Number(item.amount))} • {item.method}</CardTitle>
          <CardDescription>
            {item.status} • {item.appointments?.profiles?.full_name ?? 'Cliente'} • {item.appointments?.services?.name ?? 'Serviço'} • {item.paid_at ? format(new Date(item.paid_at), 'dd/MM/yyyy HH:mm') : 'sem data de pagamento'}
          </CardDescription>
        </Card>
      ))}
    </div>
  );
}

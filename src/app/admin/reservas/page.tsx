import { format } from 'date-fns';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { PagamentoPresencialForm } from '@/components/forms/PagamentoPresencialForm';
import { formatarMoeda } from '@/lib/utils';

export default async function ReservasAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('appointments')
    .select('*, profiles(full_name, phone), services(name), barbers(name), presencial_payments(status, amount, method)')
    .order('start_at', { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">Gerenciar reservas</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>{item.profiles?.full_name ?? 'Cliente'} • {item.services?.name ?? 'Serviço'}</CardTitle>
          <CardDescription>
            {format(new Date(item.start_at), 'dd/MM/yyyy HH:mm')} • {item.barbers?.name ?? 'Barbeiro'} • {formatarMoeda(Number(item.total_price))} • Status: {item.status}
          </CardDescription>
          <div className="mt-4 sm:mt-5 border-t border-white/10 pt-5">
            <PagamentoPresencialForm appointmentId={item.id} valorPadrao={Number(item.total_price)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

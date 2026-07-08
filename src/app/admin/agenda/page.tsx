import { endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

export default async function AgendaDiaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('appointments')
    .select('*, profiles(full_name, phone), services(name), barbers(name)')
    .gte('start_at', startOfDay(new Date()).toISOString())
    .lte('start_at', endOfDay(new Date()).toISOString())
    .order('start_at');

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">Agenda do dia</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>{format(new Date(item.start_at), 'HH:mm', { locale: ptBR })} • {item.profiles?.full_name}</CardTitle>
          <CardDescription>{item.services?.name} com {item.barbers?.name} • Telefone: {item.profiles?.phone ?? 'não informado'} • Status: {item.status}</CardDescription>
        </Card>
      ))}
      {data?.length === 0 && <Card><CardDescription>Nenhuma reserva para hoje.</CardDescription></Card>}
    </div>
  );
}

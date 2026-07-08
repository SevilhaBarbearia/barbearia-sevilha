import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cancelarAgendamento } from '@/lib/agendamentos/actions';
import { asFormAction } from '@/lib/actions/form-action';
import { exigirPerfilCompleto } from '@/lib/auth/permissoes';
import { createClient } from '@/lib/supabase/server';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatarMoeda } from '@/lib/utils';

export default async function MeusAgendamentosPage() {
  const { user } = await exigirPerfilCompleto();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, services(name), barbers(name)')
    .eq('client_id', user.id)
    .order('start_at', { ascending: false });

  return (
    <div className="grid gap-4">
      <div>
        <Badge>Cliente</Badge>
        <h1 className="mt-3 text-xl font-black text-white sm:text-3xl">Meus agendamentos</h1>
      </div>
      {appointments?.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle>{item.services?.name ?? 'Serviço'}</CardTitle>
              <CardDescription>
                {item.barbers?.name ?? 'Barbeiro'} • {format(new Date(item.start_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })} • {formatarMoeda(Number(item.total_price))}
              </CardDescription>
              <p className="mt-3 text-sm text-zinc-400">Status: <span className="text-brand-100">{item.status}</span></p>
            </div>
            {['pending', 'confirmed'].includes(item.status) && (
              <form action={asFormAction(cancelarAgendamento)}>
                <input type="hidden" name="appointment_id" value={item.id} />
                <input type="hidden" name="cancellation_reason" value="Cancelado pelo cliente." />
                <Button variant="danger">Cancelar</Button>
              </form>
            )}
          </div>
        </Card>
      ))}
      {appointments?.length === 0 && <Card><CardDescription>Você ainda não possui agendamentos.</CardDescription></Card>}
    </div>
  );
}

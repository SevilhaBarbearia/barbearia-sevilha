import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';

export default async function FaturamentoPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('presencial_payments').select('amount, method, status').eq('status', 'paid');
  const total = data?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const porMetodo = (data ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.method] = (acc[item.method] ?? 0) + Number(item.amount);
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">Faturamento básico</h1>
      <Card><CardTitle>{formatarMoeda(total)}</CardTitle><CardDescription>Somente pagamentos presenciais marcados como pagos.</CardDescription></Card>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(porMetodo).map(([metodo, valor]) => <Card key={metodo}><CardTitle>{formatarMoeda(valor)}</CardTitle><CardDescription>{metodo}</CardDescription></Card>)}
      </div>
    </div>
  );
}

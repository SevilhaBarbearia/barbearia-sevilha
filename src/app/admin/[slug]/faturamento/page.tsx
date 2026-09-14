import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershopManager } from "@/features/tenancy/server";

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revenue_summary", {
    tenant: barbershop.id,
  });
  if (error) throw new Error("Não foi possível carregar o faturamento.");
  const total = Number(data?.total ?? 0);
  const methods = (data?.methods ?? {}) as Record<string, number>;
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Faturamento</h1>
      <Card>
        <CardTitle>{formatarMoeda(total)}</CardTitle>
        <CardDescription>
          Total dos pagamentos marcados como pagos.
        </CardDescription>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(methods).map(([method, amount]) => (
          <Card key={method}>
            <CardTitle>{formatarMoeda(amount)}</CardTitle>
            <CardDescription>{method}</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  );
}

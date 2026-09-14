import { formatarData } from "@/lib/dates";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershopManager } from "@/features/tenancy/server";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("presencial_payments")
    .select("*, appointments(start_at, customers(full_name), services(name))")
    .eq("barbershop_id", barbershop.id)
    .order("created_at", { ascending: false });
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Pagamentos presenciais</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>
            {formatarMoeda(Number(item.amount))} • {item.method}
          </CardTitle>
          <CardDescription>
            {item.status} •{" "}
            {item.appointments?.customers?.full_name || "Cliente"} •{" "}
            {item.appointments?.services?.name || "Serviço"} •{" "}
            {item.paid_at
              ? formatarData(item.paid_at, barbershop.timezone)
              : "sem data de pagamento"}
          </CardDescription>
        </Card>
      ))}
      {!data?.length && (
        <Card>
          <CardDescription>Nenhum pagamento registrado.</CardDescription>
        </Card>
      )}
    </div>
  );
}

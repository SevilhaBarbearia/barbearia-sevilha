import { formatarData } from "@/lib/dates";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershop } from "@/features/tenancy/server";

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user } = await exigirPerfilCompleto(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "*, services(name), barbers(name), presencial_payments(amount, method, status)",
    )
    .eq("barbershop_id", barbershop.id)
    .eq("client_id", user.id)
    .in("status", ["completed", "no_show", "canceled"])
    .order("start_at", { ascending: false });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-black text-white sm:text-3xl">
        Histórico de atendimentos
      </h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>{item.services?.name ?? "Atendimento"}</CardTitle>
          <CardDescription>
            {formatarData(item.start_at, barbershop.timezone)} •{" "}
            {item.barbers?.name ?? "Profissional"} •{" "}
            {formatarMoeda(Number(item.total_price))}
          </CardDescription>
        </Card>
      ))}
      {!data?.length && (
        <Card>
          <CardDescription>
            Nenhum histórico encontrado nesta barbearia.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}

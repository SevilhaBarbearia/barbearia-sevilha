import { CalendarCheck, Scissors, TrendingUp, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershopManager } from "@/features/tenancy/server";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data: bounds, error: boundsError } = await supabase
    .rpc("barbershop_day_bounds", { tenant: barbershop.id })
    .single();
  if (boundsError || !bounds)
    throw new Error("Não foi possível consultar a data da barbearia.");
  const { start_at: start, end_at: end } = bounds as {
    start_at: string;
    end_at: string;
  };
  const [
    { count: appointments },
    { data: payments },
    { count: customers },
    { count: services },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("barbershop_id", barbershop.id)
      .gte("start_at", start)
      .lt("start_at", end),
    supabase.rpc("revenue_summary", { tenant: barbershop.id }),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("barbershop_id", barbershop.id),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true),
  ]);
  const revenue = Number(payments?.total ?? 0);
  const cards = [
    ["Reservas de hoje", appointments ?? 0, CalendarCheck],
    ["Clientes", customers ?? 0, UsersRound],
    ["Serviços ativos", services ?? 0, Scissors],
    ["Faturamento pago", formatarMoeda(revenue), TrendingUp],
  ] as const;
  return (
    <div className="grid gap-5">
      <div>
        <Badge>Administração</Badge>
        <h1 className="mt-3 text-3xl font-black text-white">
          {barbershop.name}
        </h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, Icon]) => (
          <Card key={title}>
            <Icon className="h-6 w-6 text-brand-100" />
            <CardTitle className="mt-4 text-3xl">{value}</CardTitle>
            <CardDescription>{title}</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  );
}

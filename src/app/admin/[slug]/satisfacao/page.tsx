import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";

export default async function SatisfactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointment_feedback")
    .select("rating, comment, submitted_at, barbers(name)")
    .eq("barbershop_id", barbershop.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .not("comment", "is", null)
    .limit(30);
  const answers = (data ?? []) as unknown as Array<{
    rating: number;
    comment: string | null;
    submitted_at: string;
    barbers: { name: string } | null;
  }>;
  const { data: summary, error: summaryError } = await supabase.rpc(
    "feedback_summary",
    { tenant: barbershop.id },
  );
  if (summaryError) throw new Error("Não foi possível carregar a satisfação.");
  const average = Number(summary?.average ?? 0);
  const recentAverage = Number(summary?.recent_average ?? 0);
  const byBarber = (summary?.barbers ?? []) as {
    barber_id: string;
    name: string;
    average: number;
    count: number;
  }[];
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Satisfação</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>{average.toFixed(1)} ★</CardTitle>
          <CardDescription>
            Média geral • {summary?.count ?? 0} respostas
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>{recentAverage.toFixed(1)} ★</CardTitle>
          <CardDescription>
            Últimos 30 dias • {summary?.recent_count ?? 0} respostas
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>{summary?.attention ?? 0}</CardTitle>
          <CardDescription>Avaliações que pedem atenção</CardDescription>
        </Card>
      </div>
      <Card>
        <CardTitle>Por profissional</CardTitle>
        <div className="mt-4 grid gap-2">
          {byBarber.map((value) => (
            <p
              key={value.barber_id}
              className="flex justify-between border-b border-white/10 py-3 text-zinc-300"
            >
              <span>
                {value.name} ({value.count} respostas)
              </span>
              <strong>{Number(value.average).toFixed(1)} ★</strong>
            </p>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Comentários recentes</CardTitle>
        <div className="mt-4 grid gap-3">
          {answers
            .filter((item) => item.comment)
            .slice(0, 30)
            .map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 p-4"
              >
                <strong className="text-brand-100">
                  {item.rating} ★ • {item.barbers?.name}
                </strong>
                <p className="mt-2 text-sm text-zinc-300">{item.comment}</p>
              </div>
            ))}
          {!answers.some((item) => item.comment) && (
            <CardDescription>Nenhum comentário recebido.</CardDescription>
          )}
        </div>
      </Card>
    </div>
  );
}

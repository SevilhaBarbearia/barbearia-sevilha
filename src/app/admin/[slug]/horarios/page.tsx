import { formatarData } from "@/lib/dates";
import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  BloqueioHorarioForm,
  ExcluirBloqueioForm,
} from "@/components/forms/admin/HorarioAtendimentoForm";
import { requireBarbershopManager } from "@/features/tenancy/server";
import type { Barber, BlockedSlot } from "@/lib/db/types";

type BlockWithBarber = BlockedSlot & { barbers?: { name: string } | null };

export default async function HoursPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const [{ data: barberData }, { data: blockData }] = await Promise.all([
    supabase
      .from("barbers")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("blocked_slots")
      .select("*, barbers(name)")
      .eq("barbershop_id", barbershop.id)
      .gte("end_at", new Date().toISOString())
      .order("start_at")
      .limit(100),
  ]);
  const barbers = (barberData ?? []) as Barber[];
  const blocks = (blockData ?? []) as BlockWithBarber[];
  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <Clock3 className="h-4 w-4" /> Agenda
        </Badge>
        <h1 className="mt-3 text-3xl font-black text-white">
          Horários e bloqueios
        </h1>
      </div>
      <Card>
        <CardTitle>Novo bloqueio</CardTitle>
        <div className="mt-6">
          <BloqueioHorarioForm slug={barbershop.slug} barbeiros={barbers} />
        </div>
      </Card>
      <Card>
        <CardTitle>Próximos bloqueios</CardTitle>
        <div className="mt-4 grid gap-3">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"
            >
              <div>
                <strong className="text-white">{block.barbers?.name}</strong>
                <p className="text-sm text-zinc-400">
                  {formatarData(block.start_at, barbershop.timezone)} até{" "}
                  {formatarData(block.end_at, barbershop.timezone)}
                </p>
              </div>
              <ExcluirBloqueioForm slug={barbershop.slug} bloqueio={block} />
            </div>
          ))}
          {!blocks.length && (
            <CardDescription>Nenhum bloqueio futuro.</CardDescription>
          )}
        </div>
      </Card>
    </div>
  );
}

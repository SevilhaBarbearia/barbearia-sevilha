import { formatarData } from "@/lib/dates";
import { ActionForm } from "@/components/forms/ActionForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { completeAppointment as completeAppointmentResult } from "@/features/appointments/admin-actions";
import { asFormAction } from "@/lib/actions/form-action";

const completeAppointment = asFormAction(completeAppointmentResult);

export default async function AgendaPage({
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
  const { data } = await supabase
    .from("appointments")
    .select("*, customers(full_name, phone), services(name), barbers(name)")
    .eq("barbershop_id", barbershop.id)
    .gte("start_at", start)
    .lt("start_at", end)
    .order("start_at");
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Agenda do dia</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>
                {formatarData(item.start_at, barbershop.timezone, true)} •{" "}
                {item.customers?.full_name}
              </CardTitle>
              <CardDescription>
                {item.services?.name} com {item.barbers?.name} •{" "}
                {item.customers?.phone || "sem telefone"} • {item.status}
              </CardDescription>
            </div>
            {["pending", "confirmed"].includes(item.status) && (
              <ActionForm action={completeAppointment}>
                <input type="hidden" name="slug" value={barbershop.slug} />
                <input type="hidden" name="appointment_id" value={item.id} />
                <Button type="submit">Concluir atendimento</Button>
              </ActionForm>
            )}
          </div>
        </Card>
      ))}
      {!data?.length && (
        <Card>
          <CardDescription>Nenhuma reserva para hoje.</CardDescription>
        </Card>
      )}
    </div>
  );
}

import { formatarData } from "@/lib/dates";
import { ActionForm } from "@/components/forms/ActionForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { PagamentoPresencialForm } from "@/components/forms/PagamentoPresencialForm";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { completeAppointment as completeAppointmentResult } from "@/features/appointments/admin-actions";
import { asFormAction } from "@/lib/actions/form-action";

const completeAppointment = asFormAction(completeAppointmentResult);

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "*, customers(full_name, phone), services(name), barbers(name), presencial_payments(status, amount, method)",
    )
    .eq("barbershop_id", barbershop.id)
    .order("start_at", { ascending: false })
    .limit(100);
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Reservas</h1>
      {data?.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <CardTitle>
                {item.customers?.full_name || "Cliente"} • {item.services?.name}
              </CardTitle>
              <CardDescription>
                {formatarData(item.start_at, barbershop.timezone)} •{" "}
                {item.barbers?.name} • {formatarMoeda(Number(item.total_price))}{" "}
                • {item.status}
              </CardDescription>
            </div>
            {["pending", "confirmed"].includes(item.status) && (
              <ActionForm action={completeAppointment}>
                <input type="hidden" name="slug" value={barbershop.slug} />
                <input type="hidden" name="appointment_id" value={item.id} />
                <Button>Concluir</Button>
              </ActionForm>
            )}
          </div>
          <div className="mt-5 border-t border-white/10 pt-5">
            <PagamentoPresencialForm
              slug={barbershop.slug}
              appointmentId={item.id}
              valorPadrao={Number(item.total_price)}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";
import { asFormAction } from "@/lib/actions/form-action";
import { cancelarAgendamento } from "@/lib/agendamentos/actions";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { formatarData } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";

const STATUS_LABELS: Record<
  string,
  string
> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não compareceu",
};

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

export default async function MeusAgendamentosPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const barbershop =
    await requireBarbershop(slug);

  const { user } =
    await exigirPerfilCompleto(
      slug,
    );

  const supabase =
    await createClient();

  const { data: appointments } =
    await supabase
      .from("appointments")
      .select(
        "*, services(name), barbers(name)",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "client_id",
        user.id,
      )
      .order(
        "start_at",
        {
          ascending: false,
        },
      );

  const reservado =
    firstParam(query.reservado) ===
    "1";

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge>
            <CalendarCheck className="h-3.5 w-3.5" />
            Cliente
          </Badge>

          <h1 className="ui-h2 mt-4 font-extrabold text-[var(--text)]">
            Meus agendamentos
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Consulte seus próximos horários e acompanhe o histórico.
          </p>
        </div>

        <ButtonLink
          href={`/${barbershop.slug}/reservar`}
          className="w-full sm:w-auto"
        >
          Novo agendamento
        </ButtonLink>
      </div>

      {reservado && (
        <div className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-extrabold">
              Reserva confirmada
            </p>

            <p className="mt-1 text-sm leading-6">
              Seu horário foi registrado com sucesso.
            </p>
          </div>
        </div>
      )}

      {appointments?.map(
        (item) => {
          const active = [
            "pending",
            "confirmed",
          ].includes(item.status);

          return (
            <Card
              key={item.id}
              className="overflow-hidden"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      {item.services?.name ??
                        "Serviço"}
                    </CardTitle>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#F1EDE6] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[
                        item.status
                      ] ??
                        item.status}
                    </span>
                  </div>

                  <CardDescription className="mt-2">
                    {item.barbers?.name ??
                      "Profissional"}
                  </CardDescription>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[var(--tenant-accent)]" />
                      {formatarData(
                        item.start_at,
                        barbershop.timezone,
                      )}
                    </span>

                    <span>
                      {formatarMoeda(
                        Number(
                          item.total_price,
                        ),
                      )}
                    </span>
                  </div>
                </div>

                {active && (
                  <ActionForm
                    action={asFormAction(
                      cancelarAgendamento,
                    )}
                  >
                    <input
                      type="hidden"
                      name="slug"
                      value={
                        barbershop.slug
                      }
                    />

                    <input
                      type="hidden"
                      name="appointment_id"
                      value={item.id}
                    />

                    <input
                      type="hidden"
                      name="cancellation_reason"
                      value="Cancelado pelo cliente."
                    />

                    <Button
                      variant="danger"
                      className="w-full md:w-auto"
                    >
                      Cancelar
                    </Button>
                  </ActionForm>
                )}
              </div>
            </Card>
          );
        },
      )}

      {!appointments?.length && (
        <Card>
          <CardTitle>
            Sua agenda está vazia
          </CardTitle>

          <CardDescription>
            Você ainda não possui agendamentos nesta barbearia.
          </CardDescription>

          <ButtonLink
            href={`/${barbershop.slug}/reservar`}
            className="mt-5"
          >
            Reservar meu primeiro horário
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}

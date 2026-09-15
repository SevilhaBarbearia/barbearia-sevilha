import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  UserX,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Badge } from "@/components/ui/Badge";
import {
  Button,
  ButtonLink,
} from "@/components/ui/Button";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Cancelado · No-show",
};

/*
 * O Supabase pode inferir uma relação como objeto único
 * ou como array, principalmente quando existem FKs compostas.
 *
 * Eu normalizo os dois formatos aqui em vez de utilizar `any`.
 */
function singleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

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

function appointmentStatusClass(
  status: string,
  active: boolean,
) {
  if (status === "no_show") {
    return "bg-red-50 text-red-700";
  }

  if (status === "canceled") {
    return "bg-rose-50 text-rose-700";
  }

  if (active) {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-[#F1EDE6] text-[var(--text-muted)]";
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
  const { slug } =
    await params;

  const query =
    await searchParams;

  const barbershop =
    await requireBarbershop(
      slug,
    );

  await exigirPerfilCompleto(
    slug,
  );

  const supabase =
    await createClient();

  /*
   * Antes de consultar a agenda eu tento vincular reservas
   * feitas anteriormente como guest.
   *
   * A associação ocorre no banco somente quando a identidade
   * autenticada corresponde aos critérios seguros definidos
   * pela migration 026.
   */
  const {
    error: claimError,
  } = await supabase.rpc(
    "claim_my_guest_appointments",
    {
      target_barbershop_id:
        barbershop.id,
    },
  );

  /*
   * Falhar ao reivindicar uma reserva antiga não deve derrubar
   * a página. Eu registro o problema no servidor e continuo
   * para consultar as reservas que o RLS permitir.
   */
  if (claimError) {
    console.error(
      "[customer-appointments:claim]",
      claimError.code ??
        "UNKNOWN",
      claimError.message,
    );
  }

  /*
   * Eu filtro apenas pelo tenant.
   *
   * Não uso mais:
   *
   *   .eq("client_id", user.id)
   *
   * porque reservas guest originalmente possuem client_id = null.
   *
   * A autorização de quais registros podem ser vistos fica no RLS:
   * - client_id da conta;
   * - ou customer vinculado à identidade autenticada;
   * - sempre respeitando o tenant.
   */
  const {
    data: appointments,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        customer_id,
        client_id,
        service_id,
        barber_id,
        start_at,
        end_at,
        status,
        total_price,
        public_reference,
        cancellation_reason,
        no_show_at,
        services!appointments_service_tenant_fk (
          name
        ),
        barbers!appointments_barber_tenant_fk (
          name
        )
      `,
    )
    .eq(
      "barbershop_id",
      barbershop.id,
    )
    .order(
      "start_at",
      {
        ascending: false,
      },
    );

  /*
   * A versão antiga ignorava completamente esse erro.
   *
   * Com isso um problema de RLS/PostgREST podia aparecer para
   * o cliente como "Sua agenda está vazia", o que é incorreto.
   */
  if (appointmentsError) {
    console.error(
      "[customer-appointments:list]",
      appointmentsError.code ??
        "UNKNOWN",
      appointmentsError.message,
    );
  }

  const reservado =
    firstParam(
      query.reservado,
    ) === "1";

  const items =
    appointments ?? [];

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

      {appointmentsError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-extrabold">
              Não foi possível carregar sua agenda
            </p>

            <p className="mt-1 text-sm leading-6">
              Isso é uma falha de carregamento e não significa que você não
              possui agendamentos. Atualize a página em instantes.
            </p>
          </div>
        </div>
      )}

      {!appointmentsError &&
        items.map((item) => {
          /*
           * Se o Supabase retornar a relação como array eu normalizo
           * para um único objeto antes de acessar o nome.
           */
          const service =
            singleRelation(
              item.services,
            );

          const barber =
            singleRelation(
              item.barbers,
            );

          const active =
            [
              "pending",
              "confirmed",
            ].includes(
              item.status,
            );

          return (
            <Card
              key={item.id}
              className="overflow-hidden"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      {service?.name ??
                        "Serviço"}
                    </CardTitle>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                        appointmentStatusClass(
                          item.status,
                          active,
                        ),
                      ].join(" ")}
                    >
                      {STATUS_LABELS[
                        item.status
                      ] ??
                        item.status}
                    </span>
                  </div>

                  <CardDescription className="mt-2">
                    {barber?.name ??
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

                    {item.public_reference && (
                      <span className="font-mono text-xs">
                        {item.public_reference}
                      </span>
                    )}
                  </div>

                  {item.status === "no_show" && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                      <UserX className="mt-0.5 h-5 w-5 shrink-0" />

                      <div>
                        <p className="font-extrabold">
                          Cancelado por não comparecimento
                        </p>

                        <p className="mt-1 text-sm leading-6">
                          Motivo: a barbearia registrou este atendimento como
                          <strong> No-show</strong>.
                        </p>

                        {item.no_show_at && (
                          <p className="mt-1 text-xs font-semibold text-red-700/80">
                            Registrado em{" "}
                            {formatarData(
                              item.no_show_at,
                              barbershop.timezone,
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {item.status === "canceled" &&
                    item.cancellation_reason && (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
                        <strong>
                          Motivo do cancelamento:
                        </strong>{" "}
                        {item.cancellation_reason}
                      </div>
                    )}
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
                      value={
                        item.id
                      }
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
        })}

      {!appointmentsError &&
        !items.length && (
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

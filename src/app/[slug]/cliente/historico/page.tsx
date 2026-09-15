import {
  AlertTriangle,
  History,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { formatarData } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";

function singleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const barbershop =
    await requireBarbershop(slug);

  await exigirPerfilCompleto(
    slug,
  );

  const supabase =
    await createClient();

  /*
   * Eu filtro o tenant e deixo a RLS decidir quais agendamentos
   * pertencem à identidade autenticada.
   *
   * Isso evita voltar ao problema antigo de depender exclusivamente
   * de appointments.client_id.
   */
  const {
    data,
    error,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        start_at,
        total_price,
        status,
        public_reference,
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
    .in(
      "status",
      [
        "completed",
        "no_show",
        "canceled",
      ],
    )
    .order(
      "start_at",
      {
        ascending: false,
      },
    );

  if (error) {
    console.error(
      "[customer-history:list]",
      error.code ??
        "UNKNOWN",
      error.message,
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <History className="h-3.5 w-3.5" />
          Histórico
        </Badge>

        <h1 className="ui-h2 mt-4 font-extrabold text-[var(--text)]">
          Atendimentos anteriores
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Consulte os serviços que já passaram pela sua agenda.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-extrabold">
              Não foi possível carregar o histórico
            </p>

            <p className="mt-1 text-sm leading-6">
              A falha de carregamento não significa que seu histórico foi
              apagado. Atualize a página em instantes.
            </p>
          </div>
        </div>
      )}

      {!error &&
        data?.map((item) => {
          const service =
            singleRelation(
              item.services,
            );

          const barber =
            singleRelation(
              item.barbers,
            );

          return (
            <Card key={item.id}>
              <CardTitle>
                {service?.name ??
                  "Atendimento"}
              </CardTitle>

              <CardDescription className="mt-2">
                {formatarData(
                  item.start_at,
                  barbershop.timezone,
                )}{" "}
                •{" "}
                {barber?.name ??
                  "Profissional"}{" "}
                •{" "}
                {formatarMoeda(
                  Number(
                    item.total_price,
                  ),
                )}
              </CardDescription>

              {item.public_reference && (
                <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">
                  {item.public_reference}
                </p>
              )}
            </Card>
          );
        })}

      {!error &&
        !data?.length && (
          <Card>
            <CardDescription>
              Nenhum histórico encontrado nesta barbearia.
            </CardDescription>
          </Card>
        )}
    </div>
  );
}

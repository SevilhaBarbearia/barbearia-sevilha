import {
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

  const { user } =
    await exigirPerfilCompleto(
      slug,
    );

  const supabase =
    await createClient();

  const { data } =
    await supabase
      .from("appointments")
      .select(
        "*, services(name), barbers(name), presencial_payments(amount, method, status)",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "client_id",
        user.id,
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

      {data?.map((item) => (
        <Card key={item.id}>
          <CardTitle>
            {item.services?.name ??
              "Atendimento"}
          </CardTitle>

          <CardDescription className="mt-2">
            {formatarData(
              item.start_at,
              barbershop.timezone,
            )}{" "}
            •{" "}
            {item.barbers?.name ??
              "Profissional"}{" "}
            •{" "}
            {formatarMoeda(
              Number(
                item.total_price,
              ),
            )}
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

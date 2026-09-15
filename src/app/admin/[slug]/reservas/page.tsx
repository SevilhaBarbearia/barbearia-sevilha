import {
  ClipboardList,
} from "lucide-react";

import {
  ReservationsBoard,
  type AdminReservation,
} from "@/components/admin/ReservationsBoard";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";

type ReservationBaseRow = {
  id: string;
  barber_id: string;
  customer_id: string;
  service_id: string;
  start_at: string;
  status: string;
  total_price: number | string;
  public_reference: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type NamedRow = {
  id: string;
  name: string;
};

type PaymentRow = {
  appointment_id: string;
  status: string;
  amount: number | string;
  method: string;
};

function formatLocalDate(
  value: string,
  timeZone: string,
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatLocalTime(
  value: string,
  timeZone: string,
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function logQueryError(
  name: string,
  error:
    | {
        code?: string | null;
        message?: string | null;
      }
    | null,
) {
  if (!error) return;

  console.error(
    `[admin-reservas:${name}]`,
    error.code ?? "UNKNOWN",
    error.message ?? "Falha na consulta.",
  );
}

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const { barbershop } =
    await requireBarbershopManager(slug);

  const supabase = await createClient();

  const [
    reservationsResult,
    boundsResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,barber_id,customer_id,service_id,start_at,status,total_price,public_reference",
      )
      .eq("barbershop_id", barbershop.id)
      .order("start_at", {
        ascending: false,
      })
      .limit(250),

    supabase
      .rpc("barbershop_day_bounds", {
        tenant: barbershop.id,
      })
      .single(),
  ]);

  logQueryError(
    "appointments",
    reservationsResult.error,
  );

  logQueryError(
    "day-bounds",
    boundsResult.error,
  );

  if (reservationsResult.error) {
    return (
      <div className="grid gap-6">
        <header>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
            <ClipboardList className="h-4 w-4" />
            Gestão
          </p>

          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Reservas
          </h1>
        </header>

        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-sm leading-6 text-amber-100/80">
          Não foi possível carregar as reservas agora. Nenhum dado foi alterado.
          Atualize a página em instantes.
        </div>
      </div>
    );
  }

  const rows =
    (reservationsResult.data ??
      []) as ReservationBaseRow[];

  const customerIds = Array.from(
    new Set(
      rows
        .map((item) => item.customer_id)
        .filter(Boolean),
    ),
  );

  const appointmentIds = rows.map(
    (item) => item.id,
  );

  const [
    customersResult,
    barbersResult,
    servicesResult,
    paymentsResult,
  ] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select(
            "id,full_name,phone,email",
          )
          .eq(
            "barbershop_id",
            barbershop.id,
          )
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as CustomerRow[],
          error: null,
        }),

    supabase
      .from("barbers")
      .select("id,name")
      .eq(
        "barbershop_id",
        barbershop.id,
      ),

    supabase
      .from("services")
      .select("id,name")
      .eq(
        "barbershop_id",
        barbershop.id,
      ),

    appointmentIds.length
      ? supabase
          .from(
            "presencial_payments",
          )
          .select(
            "appointment_id,status,amount,method",
          )
          .eq(
            "barbershop_id",
            barbershop.id,
          )
          .in(
            "appointment_id",
            appointmentIds,
          )
      : Promise.resolve({
          data: [] as PaymentRow[],
          error: null,
        }),
  ]);

  logQueryError(
    "customers",
    customersResult.error,
  );
  logQueryError(
    "barbers",
    barbersResult.error,
  );
  logQueryError(
    "services",
    servicesResult.error,
  );
  logQueryError(
    "payments",
    paymentsResult.error,
  );

  const customers =
    (customersResult.data ??
      []) as CustomerRow[];

  const barbers =
    (barbersResult.data ??
      []) as NamedRow[];

  const services =
    (servicesResult.data ??
      []) as NamedRow[];

  const payments =
    (paymentsResult.data ??
      []) as PaymentRow[];

  const customerById = new Map(
    customers.map((item) => [
      item.id,
      item,
    ]),
  );

  const barberById = new Map(
    barbers.map((item) => [
      item.id,
      item,
    ]),
  );

  const serviceById = new Map(
    services.map((item) => [
      item.id,
      item,
    ]),
  );

  const paymentByAppointmentId =
    new Map(
      payments.map((item) => [
        item.appointment_id,
        item,
      ]),
    );

  const reservations: AdminReservation[] =
    rows.map((item) => {
      const customer =
        customerById.get(
          item.customer_id,
        );

      const barber =
        barberById.get(
          item.barber_id,
        );

      const service =
        serviceById.get(
          item.service_id,
        );

      const payment =
        paymentByAppointmentId.get(
          item.id,
        );

      return {
        id: item.id,
        barberId:
          item.barber_id,
        barberName:
          barber?.name ??
          "Profissional",
        customerName:
          customer?.full_name ??
          "Cliente",
        customerPhone:
          customer?.phone ??
          null,
        customerEmail:
          customer?.email ??
          null,
        serviceName:
          service?.name ??
          "Serviço",
        startAt:
          item.start_at,
        startLabel:
          formatLocalTime(
            item.start_at,
            barbershop.timezone,
          ),
        dateLabel:
          formatLocalDate(
            item.start_at,
            barbershop.timezone,
          ),
        status: item.status,
        totalPrice: Number(
          item.total_price,
        ),
        publicReference:
          item.public_reference,
        payment: payment
          ? {
              status:
                payment.status,
              amount: Number(
                payment.amount,
              ),
              method:
                payment.method,
            }
          : null,
      };
    });

  const now = new Date();

  const fallbackStart =
    new Date(now);

  fallbackStart.setUTCHours(
    0,
    0,
    0,
    0,
  );

  const fallbackEnd =
    new Date(fallbackStart);

  fallbackEnd.setUTCDate(
    fallbackEnd.getUTCDate() +
      1,
  );

  const bounds =
    boundsResult.data
      ? (boundsResult.data as {
          start_at: string;
          end_at: string;
        })
      : {
          start_at:
            fallbackStart.toISOString(),
          end_at:
            fallbackEnd.toISOString(),
        };

  const partialData =
    Boolean(boundsResult.error) ||
    Boolean(customersResult.error) ||
    Boolean(barbersResult.error) ||
    Boolean(servicesResult.error) ||
    Boolean(paymentsResult.error);

  return (
    <div className="grid gap-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
          <ClipboardList className="h-4 w-4" />
          Gestão
        </p>

        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          Reservas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Consulte clientes, filtre por profissional e status, acompanhe
          pagamentos e conclua atendimentos sem sair da tela.
        </p>
      </header>

      {partialData && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100/80">
          Alguns detalhes complementares não puderam ser carregados agora. As
          reservas disponíveis continuam visíveis e nenhum dado foi alterado.
        </div>
      )}

      <ReservationsBoard
        slug={barbershop.slug}
        reservations={reservations}
        todayStart={bounds.start_at}
        todayEnd={bounds.end_at}
      />
    </div>
  );
}

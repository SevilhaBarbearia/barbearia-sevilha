import {
  ClipboardList,
} from "lucide-react";

import {
  ReservationsBoard,
  type AdminReservation,
} from "@/components/admin/ReservationsBoard";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";

type ReservationRow = {
  id: string;
  barber_id: string;
  start_at: string;
  status: string;
  total_price: number | string;
  public_reference: string | null;
  customers:
    | {
        full_name: string;
        phone: string | null;
        email: string | null;
      }
    | null;
  services:
    | {
        name: string;
      }
    | null;
  barbers:
    | {
        name: string;
      }
    | null;
  presencial_payments:
    | {
        status: string;
        amount: number | string;
        method: string;
      }
    | Array<{
        status: string;
        amount: number | string;
        method: string;
      }>
    | null;
};

function singleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatLocalDate(
  value: string,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatLocalTime(
  value: string,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
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
        `
          id,
          barber_id,
          start_at,
          status,
          total_price,
          public_reference,
          customers(
            full_name,
            phone,
            email
          ),
          services(name),
          barbers(name),
          presencial_payments(
            status,
            amount,
            method
          )
        `,
      )
      .eq("barbershop_id", barbershop.id)
      .order("start_at", { ascending: false })
      .limit(250),

    supabase
      .rpc("barbershop_day_bounds", {
        tenant: barbershop.id,
      })
      .single(),
  ]);

  if (reservationsResult.error) {
    throw new Error(
      "Não foi possível carregar as reservas.",
    );
  }

  if (boundsResult.error || !boundsResult.data) {
    throw new Error(
      "Não foi possível consultar a data da barbearia.",
    );
  }

  const rows =
    (reservationsResult.data ??
      []) as unknown as ReservationRow[];

  const reservations: AdminReservation[] =
    rows.map((item) => ({
      id: item.id,
      barberId: item.barber_id,
      barberName:
        item.barbers?.name ??
        "Profissional",
      customerName:
        item.customers?.full_name ??
        "Cliente",
      customerPhone:
        item.customers?.phone ?? null,
      customerEmail:
        item.customers?.email ?? null,
      serviceName:
        item.services?.name ??
        "Serviço",
      startAt: item.start_at,
      startLabel: formatLocalTime(
        item.start_at,
        barbershop.timezone,
      ),
      dateLabel: formatLocalDate(
        item.start_at,
        barbershop.timezone,
      ),
      status: item.status,
      totalPrice: Number(
        item.total_price,
      ),
      publicReference:
        item.public_reference,
      payment: (() => {
        const payment =
          singleRelation(
            item.presencial_payments,
          );

        return payment
          ? {
              status:
                payment.status,
              amount:
                Number(
                  payment.amount,
                ),
              method:
                payment.method,
            }
          : null;
      })(),
    }));

  const bounds =
    boundsResult.data as {
      start_at: string;
      end_at: string;
    };

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

      <ReservationsBoard
        slug={barbershop.slug}
        reservations={reservations}
        todayStart={bounds.start_at}
        todayEnd={bounds.end_at}
      />
    </div>
  );
}

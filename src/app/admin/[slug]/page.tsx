import Link from "next/link";
import {
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  Scissors,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";

type DashboardAppointment = {
  id: string;
  barber_id: string;
  start_at: string;
  status: string;
  total_price: number | string;
  barbers:
    | {
        name: string;
      }
    | null;
  presencial_payments:
    | {
        amount: number | string;
        method: string;
        status: string;
        paid_at: string | null;
      }
    | Array<{
        amount: number | string;
        method: string;
        status: string;
        paid_at: string | null;
      }>
    | null;
};

type PaymentRow = {
  amount: number | string;
  method: string;
  status: string;
  paid_at: string | null;
};

type UpcomingAppointment = {
  id: string;
  start_at: string;
  status: string;
  customers:
    | {
        full_name: string;
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
};

function singleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const PAYMENT_LABELS: Record<
  string,
  string
> = {
  pix: "Pix",
  cartao_credito:
    "Cartão de crédito",
  cartao_debito:
    "Cartão de débito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

function localDateKey(
  value: string | Date,
  timeZone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      typeof value === "string"
        ? new Date(value)
        : value,
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day",
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function localHour(
  value: string,
  timeZone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(value),
    );

  const hour = Number(
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value ?? 0,
  );

  return hour;
}

function shortDayLabel(
  dateKey: string,
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    ),
  );
}

function formatTime(
  value: string,
  timeZone: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  ).format(new Date(value));
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const { barbershop } =
    await requireBarbershopManager(
      slug,
    );

  const supabase =
    await createClient();

  const {
    data: bounds,
    error: boundsError,
  } = await supabase
    .rpc(
      "barbershop_day_bounds",
      {
        tenant:
          barbershop.id,
      },
    )
    .single();

  if (
    boundsError ||
    !bounds
  ) {
    throw new Error(
      "Não foi possível consultar a data da barbearia.",
    );
  }

  const {
    start_at: todayStart,
    end_at: todayEnd,
  } = bounds as {
    start_at: string;
    end_at: string;
  };

  const periodStart =
    new Date(todayStart);

  // Busco uma janela um pouco maior para o resumo mensal não perder
  // o primeiro dia em meses com 31 dias. O gráfico continua exibindo 30 dias.
  periodStart.setUTCDate(
    periodStart.getUTCDate() -
      35,
  );

  const [
    appointmentsResult,
    paymentsResult,
    customersResult,
    upcomingResult,
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
          barbers(name),
          presencial_payments(
            amount,
            method,
            status,
            paid_at
          )
        `,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .gte(
        "start_at",
        periodStart.toISOString(),
      )
      .lt(
        "start_at",
        todayEnd,
      )
      .order("start_at"),

    supabase
      .from(
        "presencial_payments",
      )
      .select(
        "amount,method,status,paid_at",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq("status", "paid")
      .gte(
        "paid_at",
        periodStart.toISOString(),
      )
      .lt(
        "paid_at",
        todayEnd,
      )
      .order("paid_at"),

    supabase
      .from("customers")
      .select(
        "id,created_at",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .gte(
        "created_at",
        periodStart.toISOString(),
      )
      .lt(
        "created_at",
        todayEnd,
      ),

    supabase
      .from("appointments")
      .select(
        `
          id,
          start_at,
          status,
          customers(full_name),
          services(name),
          barbers(name)
        `,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .in(
        "status",
        [
          "pending",
          "confirmed",
        ],
      )
      .gte(
        "start_at",
        todayStart,
      )
      .order("start_at")
      .limit(6),
  ]);

  const appointments =
    (appointmentsResult.data ??
      []) as unknown as DashboardAppointment[];

  const payments =
    (paymentsResult.data ??
      []) as PaymentRow[];

  const customers =
    customersResult.data ??
    [];

  const upcoming =
    (upcomingResult.data ??
      []) as unknown as UpcomingAppointment[];

  const todayKey =
    localDateKey(
      todayStart,
      barbershop.timezone,
    );

  const monthKey =
    todayKey.slice(0, 7);

  const dailyKeys: string[] =
    [];

  for (
    let offset = 29;
    offset >= 0;
    offset -= 1
  ) {
    const day =
      new Date(todayStart);

    day.setUTCDate(
      day.getUTCDate() -
        offset,
    );

    dailyKeys.push(
      localDateKey(
        day,
        barbershop.timezone,
      ),
    );
  }

  const dailyRevenueMap =
    new Map<
      string,
      number
    >(
      dailyKeys.map(
        (key) => [key, 0],
      ),
    );

  for (const payment of payments) {
    if (!payment.paid_at) {
      continue;
    }

    const key =
      localDateKey(
        payment.paid_at,
        barbershop.timezone,
      );

    dailyRevenueMap.set(
      key,
      (dailyRevenueMap.get(
        key,
      ) ?? 0) +
        Number(
          payment.amount,
        ),
    );
  }

  const revenueChart =
    dailyKeys.map(
      (key) => ({
        label:
          shortDayLabel(key),
        value:
          dailyRevenueMap.get(
            key,
          ) ?? 0,
      }),
    );

  const lastSeven =
    new Set(
      dailyKeys.slice(-7),
    );

  const revenueToday =
    payments.reduce(
      (sum, payment) => {
        if (
          !payment.paid_at ||
          localDateKey(
            payment.paid_at,
            barbershop.timezone,
          ) !== todayKey
        ) {
          return sum;
        }

        return (
          sum +
          Number(
            payment.amount,
          )
        );
      },
      0,
    );

  const revenueWeek =
    payments.reduce(
      (sum, payment) => {
        if (!payment.paid_at) {
          return sum;
        }

        const key =
          localDateKey(
            payment.paid_at,
            barbershop.timezone,
          );

        return lastSeven.has(
          key,
        )
          ? sum +
              Number(
                payment.amount,
              )
          : sum;
      },
      0,
    );

  const monthPayments =
    payments.filter(
      (payment) =>
        payment.paid_at &&
        localDateKey(
          payment.paid_at,
          barbershop.timezone,
        ).startsWith(
          monthKey,
        ),
    );

  const revenueMonth =
    monthPayments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount),
      0,
    );

  const ticketAverage =
    monthPayments.length
      ? revenueMonth /
        monthPayments.length
      : 0;

  const completedToday =
    appointments.filter(
      (appointment) =>
        appointment.status ===
          "completed" &&
        localDateKey(
          appointment.start_at,
          barbershop.timezone,
        ) === todayKey,
    ).length;

  const newCustomersMonth =
    customers.filter(
      (customer) =>
        localDateKey(
          customer.created_at,
          barbershop.timezone,
        ).startsWith(
          monthKey,
        ),
    ).length;

  const barberMap =
    new Map<
      string,
      {
        name: string;
        appointments: number;
        revenue: number;
      }
    >();

  for (
    const appointment
    of appointments
  ) {
    if (
      appointment.status !==
      "completed"
    ) {
      continue;
    }

    const name =
      appointment.barbers
        ?.name ??
      "Profissional";

    const current =
      barberMap.get(
        appointment.barber_id,
      ) ?? {
        name,
        appointments: 0,
        revenue: 0,
      };

    current.appointments +=
      1;

    const payment =
      singleRelation(
        appointment.presencial_payments,
      );

    if (
      payment &&
      payment.status ===
        "paid"
    ) {
      current.revenue +=
        Number(
          payment.amount,
        );
    }

    barberMap.set(
      appointment.barber_id,
      current,
    );
  }

  const barberPerformance =
    Array.from(
      barberMap.values(),
    )
      .sort(
        (a, b) =>
          b.appointments -
          a.appointments,
      )
      .slice(0, 6);

  const paymentMap =
    new Map<
      string,
      {
        count: number;
        amount: number;
      }
    >();

  for (const payment of payments) {
    const current =
      paymentMap.get(
        payment.method,
      ) ?? {
        count: 0,
        amount: 0,
      };

    current.count += 1;
    current.amount +=
      Number(
        payment.amount,
      );

    paymentMap.set(
      payment.method,
      current,
    );
  }

  const paymentMethods =
    Array.from(
      paymentMap.entries(),
    )
      .map(
        ([
          key,
          value,
        ]) => ({
          key,
          label:
            PAYMENT_LABELS[
              key
            ] ?? key,
          count:
            value.count,
          amount:
            value.amount,
        }),
      )
      .sort(
        (a, b) =>
          b.count - a.count,
      );

  const peakMap =
    new Map<
      number,
      number
    >();

  for (
    const appointment
    of appointments
  ) {
    if (
      appointment.status ===
      "canceled"
    ) {
      continue;
    }

    const hour =
      localHour(
        appointment.start_at,
        barbershop.timezone,
      );

    peakMap.set(
      hour,
      (peakMap.get(
        hour,
      ) ?? 0) + 1,
    );
  }

  const peakHours =
    Array.from(
      {
        length: 13,
      },
      (_, index) =>
        index + 8,
    ).map(
      (hour) => ({
        label: `${String(
          hour,
        ).padStart(
          2,
          "0",
        )}h`,
        value:
          peakMap.get(
            hour,
          ) ?? 0,
      }),
    );

  const metrics = [
    {
      label:
        "Faturamento hoje",
      value:
        formatarMoeda(
          revenueToday,
        ),
      detail: `${formatarMoeda(
        revenueWeek,
      )} nos últimos 7 dias`,
      icon: TrendingUp,
      href: `/admin/${barbershop.slug}/faturamento`,
    },
    {
      label:
        "Atendimentos concluídos",
      value:
        completedToday,
      detail:
        "concluídos hoje",
      icon: Scissors,
      href: `/admin/${barbershop.slug}/reservas`,
    },
    {
      label:
        "Ticket médio",
      value:
        formatarMoeda(
          ticketAverage,
        ),
      detail:
        "média do mês",
      icon:
        CircleDollarSign,
      href: `/admin/${barbershop.slug}/pagamentos`,
    },
    {
      label:
        "Novos clientes",
      value:
        newCustomersMonth,
      detail:
        "neste mês",
      icon: UserPlus,
      href: `/admin/${barbershop.slug}/reservas`,
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
            Visão geral
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Indicadores da{" "}
            {barbershop.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300">
            Hoje:{" "}
            {formatarMoeda(
              revenueToday,
            )}
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300">
            7 dias:{" "}
            {formatarMoeda(
              revenueWeek,
            )}
          </span>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 font-semibold text-amber-200">
            Mês:{" "}
            {formatarMoeda(
              revenueMonth,
            )}
          </span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          ({
            label,
            value,
            detail,
            icon: Icon,
            href,
          }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-[1.4rem] border border-white/10 bg-[#1B2939] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-1 hover:border-amber-300/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              aria-label={`${label}: ${String(value)}. Abrir detalhes.`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    {label}
                  </p>

                  <strong className="mt-3 block text-2xl font-black text-white sm:text-3xl">
                    {value}
                  </strong>

                  <p className="mt-2 text-xs font-semibold text-emerald-300">
                    {detail}
                  </p>
                </div>

                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-amber-300 transition group-hover:bg-amber-300/10">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 transition group-hover:text-amber-200/70">
                Abrir detalhes
              </p>
            </Link>
          ),
        )}
      </section>

      <DashboardCharts
        revenue={revenueChart}
        barbers={
          barberPerformance
        }
        payments={
          paymentMethods
        }
        peakHours={peakHours}
      />

      <section className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-white">
              Próximos agendamentos
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Próximos clientes na agenda.
            </p>
          </div>

          <CalendarCheck className="h-5 w-5 text-amber-300" />
        </div>

        <div className="mt-5 grid gap-2">
          {upcoming.map(
            (item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-white">
                    {item.customers
                      ?.full_name ??
                      "Cliente"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.services
                      ?.name ??
                      "Serviço"}{" "}
                    •{" "}
                    {item.barbers
                      ?.name ??
                      "Profissional"}
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-extrabold text-amber-200">
                  <Clock3 className="h-4 w-4" />
                  {formatTime(
                    item.start_at,
                    barbershop.timezone,
                  )}
                </span>
              </div>
            ),
          )}

          {!upcoming.length && (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              Nenhum próximo agendamento encontrado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

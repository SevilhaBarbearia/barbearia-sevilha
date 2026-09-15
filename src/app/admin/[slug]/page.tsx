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

type AppointmentRow = {
  id: string;
  barber_id: string;
  customer_id: string;
  service_id: string;
  start_at: string;
  status: string;
  total_price: number | string;
};

type PaymentRow = {
  appointment_id: string;
  amount: number | string;
  method: string;
  status: string;
  paid_at: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  created_at: string;
};

type NamedRow = {
  id: string;
  name: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

function localDateKey(
  value: string | Date,
  timeZone: string,
) {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function localHour(
  value: string,
  timeZone: string,
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? NaN,
  );

  return Number.isFinite(hour) ? hour : null;
}

function shortDayLabel(dateKey: string) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  if (![year, month, day].every(Number.isFinite)) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

function formatTime(
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
    `[admin-dashboard:${name}]`,
    error.code ?? "UNKNOWN",
    error.message ?? "Falha na consulta.",
  );
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
    await requireBarbershopManager(slug);

  const supabase = await createClient();

  const now = new Date();

  const rangeStart = new Date(now);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 36);

  const rangeEnd = new Date(now);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  /*
   * Consultas deliberadamente sem embeds do PostgREST.
   *
   * O schema multi-tenant possui FKs simples + FKs compostas para garantir
   * isolamento. Evitar relacionamentos aninhados aqui elimina ambiguidade
   * entre essas FKs e permite que o dashboard degrade parcialmente em vez
   * de derrubar toda a administração.
   */
  const [
    appointmentsResult,
    paymentsResult,
    customersResult,
    barbersResult,
    servicesResult,
    upcomingResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,barber_id,customer_id,service_id,start_at,status,total_price",
      )
      .eq("barbershop_id", barbershop.id)
      .gte("start_at", rangeStart.toISOString())
      .lt("start_at", rangeEnd.toISOString())
      .order("start_at"),

    supabase
      .from("presencial_payments")
      .select("appointment_id,amount,method,status,paid_at")
      .eq("barbershop_id", barbershop.id)
      .eq("status", "paid")
      .gte("paid_at", rangeStart.toISOString())
      .lt("paid_at", rangeEnd.toISOString())
      .order("paid_at"),

    supabase
      .from("customers")
      .select("id,full_name,created_at")
      .eq("barbershop_id", barbershop.id)
      .gte("created_at", rangeStart.toISOString())
      .lt("created_at", rangeEnd.toISOString()),

    supabase
      .from("barbers")
      .select("id,name")
      .eq("barbershop_id", barbershop.id),

    supabase
      .from("services")
      .select("id,name")
      .eq("barbershop_id", barbershop.id),

    supabase
      .from("appointments")
      .select(
        "id,barber_id,customer_id,service_id,start_at,status,total_price",
      )
      .eq("barbershop_id", barbershop.id)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", now.toISOString())
      .order("start_at")
      .limit(6),
  ]);

  logQueryError("appointments", appointmentsResult.error);
  logQueryError("payments", paymentsResult.error);
  logQueryError("customers", customersResult.error);
  logQueryError("barbers", barbersResult.error);
  logQueryError("services", servicesResult.error);
  logQueryError("upcoming", upcomingResult.error);

  const appointments =
    (appointmentsResult.data ?? []) as AppointmentRow[];

  const payments =
    (paymentsResult.data ?? []) as PaymentRow[];

  const customers =
    (customersResult.data ?? []) as CustomerRow[];

  const barbers =
    (barbersResult.data ?? []) as NamedRow[];

  const services =
    (servicesResult.data ?? []) as NamedRow[];

  const upcoming =
    (upcomingResult.data ?? []) as AppointmentRow[];

  const upcomingCustomerIds = Array.from(
    new Set(
      upcoming
        .map((item) => item.customer_id)
        .filter(Boolean),
    ),
  );

  const { data: upcomingCustomersData, error: upcomingCustomersError } =
    upcomingCustomerIds.length
      ? await supabase
          .from("customers")
          .select("id,full_name")
          .eq("barbershop_id", barbershop.id)
          .in("id", upcomingCustomerIds)
      : {
          data: [] as Array<{
            id: string;
            full_name: string;
          }>,
          error: null,
        };

  logQueryError(
    "upcoming-customers",
    upcomingCustomersError,
  );

  const barberNameById = new Map(
    barbers.map((item) => [item.id, item.name]),
  );

  const serviceNameById = new Map(
    services.map((item) => [item.id, item.name]),
  );

  const customerNameById = new Map(
    (upcomingCustomersData ?? []).map((item) => [
      item.id,
      item.full_name,
    ]),
  );

  const paymentByAppointmentId = new Map(
    payments.map((payment) => [
      payment.appointment_id,
      payment,
    ]),
  );

  const todayKey = localDateKey(
    now,
    barbershop.timezone,
  );

  const monthKey = todayKey.slice(0, 7);

  const dailyKeys: string[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);

    const key = localDateKey(
      day,
      barbershop.timezone,
    );

    if (key) {
      dailyKeys.push(key);
    }
  }

  const dailyRevenueMap = new Map<string, number>(
    dailyKeys.map((key) => [key, 0]),
  );

  for (const payment of payments) {
    if (!payment.paid_at) continue;

    const key = localDateKey(
      payment.paid_at,
      barbershop.timezone,
    );

    if (!key || !dailyRevenueMap.has(key)) {
      continue;
    }

    dailyRevenueMap.set(
      key,
      (dailyRevenueMap.get(key) ?? 0) +
        Number(payment.amount),
    );
  }

  const revenueChart = dailyKeys.map((key) => ({
    label: shortDayLabel(key),
    value: dailyRevenueMap.get(key) ?? 0,
  }));

  const lastSeven = new Set(dailyKeys.slice(-7));

  const revenueToday = payments.reduce(
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

      return sum + Number(payment.amount);
    },
    0,
  );

  const revenueWeek = payments.reduce(
    (sum, payment) => {
      if (!payment.paid_at) return sum;

      const key = localDateKey(
        payment.paid_at,
        barbershop.timezone,
      );

      return lastSeven.has(key)
        ? sum + Number(payment.amount)
        : sum;
    },
    0,
  );

  const monthPayments = payments.filter(
    (payment) =>
      payment.paid_at &&
      localDateKey(
        payment.paid_at,
        barbershop.timezone,
      ).startsWith(monthKey),
  );

  const revenueMonth = monthPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount),
    0,
  );

  const ticketAverage =
    monthPayments.length > 0
      ? revenueMonth / monthPayments.length
      : 0;

  const completedToday = appointments.filter(
    (appointment) =>
      appointment.status === "completed" &&
      localDateKey(
        appointment.start_at,
        barbershop.timezone,
      ) === todayKey,
  ).length;

  const newCustomersMonth = customers.filter(
    (customer) =>
      localDateKey(
        customer.created_at,
        barbershop.timezone,
      ).startsWith(monthKey),
  ).length;

  const barberMap = new Map<
    string,
    {
      name: string;
      appointments: number;
      revenue: number;
    }
  >();

  for (const appointment of appointments) {
    if (appointment.status !== "completed") {
      continue;
    }

    const current =
      barberMap.get(appointment.barber_id) ?? {
        name:
          barberNameById.get(appointment.barber_id) ??
          "Profissional",
        appointments: 0,
        revenue: 0,
      };

    current.appointments += 1;

    const payment =
      paymentByAppointmentId.get(appointment.id);

    if (payment?.status === "paid") {
      current.revenue += Number(payment.amount);
    }

    barberMap.set(appointment.barber_id, current);
  }

  const barberPerformance = Array.from(
    barberMap.values(),
  )
    .sort(
      (a, b) =>
        b.appointments - a.appointments,
    )
    .slice(0, 6);

  const paymentMap = new Map<
    string,
    {
      count: number;
      amount: number;
    }
  >();

  for (const payment of payments) {
    const current =
      paymentMap.get(payment.method) ?? {
        count: 0,
        amount: 0,
      };

    current.count += 1;
    current.amount += Number(payment.amount);

    paymentMap.set(payment.method, current);
  }

  const paymentMethods = Array.from(
    paymentMap.entries(),
  )
    .map(([key, value]) => ({
      key,
      label: PAYMENT_LABELS[key] ?? key,
      count: value.count,
      amount: value.amount,
    }))
    .sort((a, b) => b.count - a.count);

  const peakMap = new Map<number, number>();

  for (const appointment of appointments) {
    if (appointment.status === "canceled") {
      continue;
    }

    const hour = localHour(
      appointment.start_at,
      barbershop.timezone,
    );

    if (hour === null) {
      continue;
    }

    peakMap.set(
      hour,
      (peakMap.get(hour) ?? 0) + 1,
    );
  }

  const peakHours = Array.from(
    { length: 13 },
    (_, index) => index + 8,
  ).map((hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    value: peakMap.get(hour) ?? 0,
  }));

  const metrics = [
    {
      label: "Faturamento hoje",
      value: formatarMoeda(revenueToday),
      detail: `${formatarMoeda(
        revenueWeek,
      )} nos últimos 7 dias`,
      icon: TrendingUp,
      href: `/admin/${barbershop.slug}/faturamento`,
    },
    {
      label: "Atendimentos concluídos",
      value: completedToday,
      detail: "concluídos hoje",
      icon: Scissors,
      href: `/admin/${barbershop.slug}/reservas`,
    },
    {
      label: "Ticket médio",
      value: formatarMoeda(ticketAverage),
      detail: "média do mês",
      icon: CircleDollarSign,
      href: `/admin/${barbershop.slug}/pagamentos`,
    },
    {
      label: "Novos clientes",
      value: newCustomersMonth,
      detail: "neste mês",
      icon: UserPlus,
      href: `/admin/${barbershop.slug}/reservas`,
    },
  ] as const;

  const partialData =
    Boolean(appointmentsResult.error) ||
    Boolean(paymentsResult.error) ||
    Boolean(customersResult.error) ||
    Boolean(barbersResult.error) ||
    Boolean(servicesResult.error) ||
    Boolean(upcomingResult.error) ||
    Boolean(upcomingCustomersError);

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
            Indicadores da {barbershop.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300">
            Hoje: {formatarMoeda(revenueToday)}
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300">
            7 dias: {formatarMoeda(revenueWeek)}
          </span>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 font-semibold text-amber-200">
            Mês: {formatarMoeda(revenueMonth)}
          </span>
        </div>
      </header>

      {partialData && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100/80"
        >
          Alguns indicadores não puderam ser carregados agora. O painel
          administrativo continua disponível e as demais informações foram
          mantidas.
        </div>
      )}

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
              aria-label={`${label}: ${String(
                value,
              )}. Abrir detalhes.`}
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
        barbers={barberPerformance}
        payments={paymentMethods}
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
          {upcoming.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-bold text-white">
                  {customerNameById.get(item.customer_id) ??
                    "Cliente"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {serviceNameById.get(item.service_id) ??
                    "Serviço"}{" "}
                  •{" "}
                  {barberNameById.get(item.barber_id) ??
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
          ))}

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

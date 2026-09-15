import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  UsersRound,
  XCircle,
} from "lucide-react";

import {
  AgendaBoard,
  type AgendaBarberColumn,
  type AgendaSegment,
} from "@/components/admin/AgendaBoard";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";

type AppointmentBaseRow = {
  id: string;
  barber_id: string;
  customer_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number | string;
  public_reference: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string | null;
};

type ServiceRow = {
  id: string;
  name: string;
};

type PaymentRow = {
  appointment_id: string;
  status: string;
  method: string;
  amount: number | string;
};

type AgendaAppointment = {
  id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number | string;
  public_reference: string | null;
  customers:
    | {
        full_name: string;
        phone: string | null;
      }
    | null;
  services:
    | {
        name: string;
      }
    | null;
  presencial_payments:
    | {
        status: string;
        method: string;
        amount: number | string;
      }
    | null;
};

type BusinessHourRow = {
  barber_id: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
};

type BarberRow = {
  id: string;
  name: string;
};

function clockToMinutes(
  value: string | null,
) {
  if (!value) return null;

  const [hour, minute] = value
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hour * 60 + minute;
}

function localMinutes(
  value: string,
  timeZone: string,
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return 0;
  }

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? 0,
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour * 60 + minute;
}

function minutesToClock(
  minutes: number,
) {
  const hour = Math.floor(
    minutes / 60,
  );

  const minute = minutes % 60;

  return `${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(
    2,
    "0",
  )}`;
}

function longDate(
  value: string,
  timeZone: string,
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Hoje";
  }

  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function buildColumnSegments(
  barberId: string,
  appointments: AgendaAppointment[],
  businessHour: BusinessHourRow | undefined,
  timeZone: string,
): AgendaSegment[] {
  const barberAppointments =
    appointments
      .filter(
        (appointment) =>
          appointment.barber_id === barberId &&
          appointment.status !== "canceled",
      )
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime(),
      );

  if (!businessHour) {
    return barberAppointments.map(
      (appointment) => ({
        kind: "appointment" as const,
        appointment: {
          id: appointment.id,
          status: appointment.status,
          startLabel: minutesToClock(
            localMinutes(
              appointment.start_at,
              timeZone,
            ),
          ),
          endLabel: minutesToClock(
            localMinutes(
              appointment.end_at,
              timeZone,
            ),
          ),
          customerName:
            appointment.customers?.full_name ??
            "Cliente",
          phone:
            appointment.customers?.phone ??
            null,
          serviceName:
            appointment.services?.name ??
            "Serviço",
          totalPrice: Number(
            appointment.total_price,
          ),
          publicReference:
            appointment.public_reference,
          payment:
            appointment.presencial_payments
              ? {
                  status:
                    appointment.presencial_payments
                      .status,
                  method:
                    appointment.presencial_payments
                      .method,
                  amount: Number(
                    appointment.presencial_payments
                      .amount,
                  ),
                }
              : null,
        },
      }),
    );
  }

  const start = clockToMinutes(
    businessHour.start_time,
  );

  const end = clockToMinutes(
    businessHour.end_time,
  );

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return [];
  }

  type Interval =
    | {
        kind: "break";
        start: number;
        end: number;
      }
    | {
        kind: "appointment";
        start: number;
        end: number;
        appointment: AgendaAppointment;
      };

  const intervals: Interval[] =
    barberAppointments.map(
      (appointment) => ({
        kind: "appointment" as const,
        start: localMinutes(
          appointment.start_at,
          timeZone,
        ),
        end: localMinutes(
          appointment.end_at,
          timeZone,
        ),
        appointment,
      }),
    );

  const breakStart = clockToMinutes(
    businessHour.break_start,
  );

  const breakEnd = clockToMinutes(
    businessHour.break_end,
  );

  if (
    breakStart !== null &&
    breakEnd !== null &&
    breakEnd > breakStart
  ) {
    intervals.push({
      kind: "break",
      start: breakStart,
      end: breakEnd,
    });
  }

  intervals.sort(
    (a, b) =>
      a.start - b.start,
  );

  const segments: AgendaSegment[] = [];
  let cursor = start;

  for (const interval of intervals) {
    const intervalStart = Math.max(
      start,
      interval.start,
    );

    const intervalEnd = Math.min(
      end,
      interval.end,
    );

    if (intervalEnd <= intervalStart) {
      continue;
    }

    if (intervalStart > cursor) {
      segments.push({
        kind: "free",
        startLabel:
          minutesToClock(cursor),
        endLabel:
          minutesToClock(
            intervalStart,
          ),
      });
    }

    if (interval.kind === "break") {
      segments.push({
        kind: "break",
        startLabel:
          minutesToClock(
            intervalStart,
          ),
        endLabel:
          minutesToClock(
            intervalEnd,
          ),
      });
    } else {
      const appointment =
        interval.appointment;

      segments.push({
        kind: "appointment",
        appointment: {
          id: appointment.id,
          status: appointment.status,
          startLabel:
            minutesToClock(
              interval.start,
            ),
          endLabel:
            minutesToClock(
              interval.end,
            ),
          customerName:
            appointment.customers?.full_name ??
            "Cliente",
          phone:
            appointment.customers?.phone ??
            null,
          serviceName:
            appointment.services?.name ??
            "Serviço",
          totalPrice: Number(
            appointment.total_price,
          ),
          publicReference:
            appointment.public_reference,
          payment:
            appointment.presencial_payments
              ? {
                  status:
                    appointment.presencial_payments
                      .status,
                  method:
                    appointment.presencial_payments
                      .method,
                  amount: Number(
                    appointment.presencial_payments
                      .amount,
                  ),
                }
              : null,
        },
      });
    }

    cursor = Math.max(
      cursor,
      intervalEnd,
    );
  }

  if (cursor < end) {
    segments.push({
      kind: "free",
      startLabel:
        minutesToClock(cursor),
      endLabel:
        minutesToClock(end),
    });
  }

  return segments;
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
    `[admin-agenda:${name}]`,
    error.code ?? "UNKNOWN",
    error.message ?? "Falha na consulta.",
  );
}

export default async function AgendaPage({
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

  const {
    data: bounds,
    error: boundsError,
  } = await supabase
    .rpc("barbershop_day_bounds", {
      tenant: barbershop.id,
    })
    .single();

  if (boundsError || !bounds) {
    logQueryError("day-bounds", boundsError);

    return (
      <div className="grid gap-5">
        <h1 className="text-2xl font-black text-white">
          Agenda do dia
        </h1>

        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-sm leading-6 text-amber-100/80">
          Não foi possível calcular o período da agenda agora. Tente atualizar a
          página em instantes.
        </div>
      </div>
    );
  }

  const {
    start_at: start,
    end_at: end,
  } = bounds as {
    start_at: string;
    end_at: string;
  };

  const weekday = new Date(start).toLocaleString(
    "en-US",
    {
      timeZone:
        barbershop.timezone,
      weekday: "short",
    },
  );

  const dayOfWeek = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekday);

  const [
    appointmentsResult,
    barbersResult,
    hoursResult,
    customersResult,
    servicesResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,barber_id,customer_id,service_id,start_at,end_at,status,total_price,public_reference",
      )
      .eq("barbershop_id", barbershop.id)
      .gte("start_at", start)
      .lt("start_at", end)
      .order("start_at"),

    supabase
      .from("barbers")
      .select("id,name")
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("business_hours")
      .select(
        "barber_id,start_time,end_time,break_start,break_end",
      )
      .eq("barbershop_id", barbershop.id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true),

    supabase
      .from("customers")
      .select("id,full_name,phone")
      .eq("barbershop_id", barbershop.id),

    supabase
      .from("services")
      .select("id,name")
      .eq("barbershop_id", barbershop.id),

    supabase
      .from("presencial_payments")
      .select(
        "appointment_id,status,method,amount",
      )
      .eq("barbershop_id", barbershop.id),
  ]);

  logQueryError(
    "appointments",
    appointmentsResult.error,
  );
  logQueryError(
    "barbers",
    barbersResult.error,
  );
  logQueryError(
    "hours",
    hoursResult.error,
  );
  logQueryError(
    "customers",
    customersResult.error,
  );
  logQueryError(
    "services",
    servicesResult.error,
  );
  logQueryError(
    "payments",
    paymentsResult.error,
  );

  const appointmentRows =
    (appointmentsResult.data ??
      []) as AppointmentBaseRow[];

  const customers =
    (customersResult.data ??
      []) as CustomerRow[];

  const services =
    (servicesResult.data ??
      []) as ServiceRow[];

  const payments =
    (paymentsResult.data ??
      []) as PaymentRow[];

  const customerById = new Map(
    customers.map((item) => [
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

  const appointments: AgendaAppointment[] =
    appointmentRows.map((item) => ({
      id: item.id,
      barber_id: item.barber_id,
      start_at: item.start_at,
      end_at: item.end_at,
      status: item.status,
      total_price:
        item.total_price,
      public_reference:
        item.public_reference,
      customers:
        customerById.get(
          item.customer_id,
        ) ?? null,
      services:
        serviceById.get(
          item.service_id,
        ) ?? null,
      presencial_payments:
        paymentByAppointmentId.get(
          item.id,
        ) ?? null,
    }));

  const barbers =
    (barbersResult.data ??
      []) as BarberRow[];

  const hours =
    (hoursResult.data ??
      []) as BusinessHourRow[];

  const columns: AgendaBarberColumn[] =
    barbers.map((barber) => ({
      id: barber.id,
      name: barber.name,
      segments:
        buildColumnSegments(
          barber.id,
          appointments,
          hours.find(
            (hour) =>
              hour.barber_id ===
              barber.id,
          ),
          barbershop.timezone,
        ),
    }));

  const active =
    appointments.filter((item) =>
      [
        "pending",
        "confirmed",
      ].includes(item.status),
    ).length;

  const completed =
    appointments.filter(
      (item) =>
        item.status ===
        "completed",
    ).length;

  const canceled =
    appointments.filter(
      (item) =>
        item.status ===
        "canceled",
    ).length;

  const summary = [
    {
      label: "Ativos",
      value: active,
      icon: Clock3,
    },
    {
      label: "Concluídos",
      value: completed,
      icon: CheckCircle2,
    },
    {
      label: "Cancelados",
      value: canceled,
      icon: XCircle,
    },
    {
      label: "Profissionais",
      value: barbers.length,
      icon: UsersRound,
    },
  ] as const;

  const partialData =
    Boolean(appointmentsResult.error) ||
    Boolean(barbersResult.error) ||
    Boolean(hoursResult.error) ||
    Boolean(customersResult.error) ||
    Boolean(servicesResult.error) ||
    Boolean(paymentsResult.error);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
            <CalendarDays className="h-4 w-4" />
            Agenda
          </p>

          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Agenda do dia
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {longDate(
              start,
              barbershop.timezone,
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map(
            ({
              label,
              value,
              icon: Icon,
            }) => (
              <div
                key={label}
                className="min-w-28 rounded-2xl border border-white/10 bg-[#1B2939] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <Icon className="h-3.5 w-3.5" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
                    {label}
                  </span>
                </div>

                <strong className="mt-2 block text-xl text-white">
                  {value}
                </strong>
              </div>
            ),
          )}
        </div>
      </header>

      {partialData && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100/80">
          Parte dos dados da agenda não pôde ser carregada. O painel continua
          disponível e nenhum dado foi alterado.
        </div>
      )}

      <div className="rounded-[1.4rem] border border-cyan-300/15 bg-cyan-300/[0.045] px-4 py-3 text-sm leading-6 text-cyan-100/75">
        A agenda mostra blocos de tempo legíveis:{" "}
        <strong className="text-emerald-200">
          Livre
        </strong>
        ,{" "}
        <strong className="text-amber-200">
          Intervalo
        </strong>{" "}
        e os atendimentos. Clique em um atendimento para abrir os detalhes e
        concluir com pagamento.
      </div>

      <AgendaBoard
        slug={barbershop.slug}
        columns={columns}
      />
    </div>
  );
}

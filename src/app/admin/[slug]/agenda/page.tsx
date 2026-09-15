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
    | Array<{
        status: string;
        method: string;
        amount: number | string;
      }>
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

function singleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function clockToMinutes(
  value: string | null,
) {
  if (!value) return null;

  const [
    hour,
    minute,
  ] = value
    .slice(0, 5)
    .split(":")
    .map(Number);

  return (
    hour * 60 + minute
  );
}

function localMinutes(
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

  const minute = Number(
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value ?? 0,
  );

  return (
    hour * 60 + minute
  );
}

function minutesToClock(
  minutes: number,
) {
  const hour =
    Math.floor(
      minutes / 60,
    );

  const minute =
    minutes % 60;

  return `${String(
    hour,
  ).padStart(
    2,
    "0",
  )}:${String(
    minute,
  ).padStart(
    2,
    "0",
  )}`;
}

function longDate(
  value: string,
  timeZone: string,
) {
  const text =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone,
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    ).format(new Date(value));

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
          appointment.barber_id ===
            barberId &&
          appointment.status !==
            "canceled",
      )
      .sort(
        (a, b) =>
          new Date(
            a.start_at,
          ).getTime() -
          new Date(
            b.start_at,
          ).getTime(),
      );

  if (!businessHour) {
    return barberAppointments.map(
      (appointment) => ({
        kind:
          "appointment" as const,
        appointment: {
          id: appointment.id,
          status:
            appointment.status,
          startLabel:
            minutesToClock(
              localMinutes(
                appointment.start_at,
                timeZone,
              ),
            ),
          endLabel:
            minutesToClock(
              localMinutes(
                appointment.end_at,
                timeZone,
              ),
            ),
          customerName:
            appointment.customers
              ?.full_name ??
            "Cliente",
          phone:
            appointment.customers
              ?.phone ?? null,
          serviceName:
            appointment.services
              ?.name ??
            "Serviço",
          totalPrice:
            Number(
              appointment.total_price,
            ),
          publicReference:
            appointment.public_reference,
          payment: (() => {
            const payment =
              singleRelation(
                appointment.presencial_payments,
              );

            return payment
              ? {
                  status:
                    payment.status,
                  method:
                    payment.method,
                  amount:
                    Number(
                      payment.amount,
                    ),
                }
              : null;
          })(),
        },
      }),
    );
  }

  const start =
    clockToMinutes(
      businessHour.start_time,
    );

  const end =
    clockToMinutes(
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
        kind:
          "appointment" as const,
        start:
          localMinutes(
            appointment.start_at,
            timeZone,
          ),
        end:
          localMinutes(
            appointment.end_at,
            timeZone,
          ),
        appointment,
      }),
    );

  const breakStart =
    clockToMinutes(
      businessHour.break_start,
    );

  const breakEnd =
    clockToMinutes(
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

  const segments: AgendaSegment[] =
    [];

  let cursor = start;

  for (
    const interval
    of intervals
  ) {
    const intervalStart =
      Math.max(
        start,
        interval.start,
      );

    const intervalEnd =
      Math.min(
        end,
        interval.end,
      );

    if (
      intervalEnd <=
      intervalStart
    ) {
      continue;
    }

    if (
      intervalStart >
      cursor
    ) {
      segments.push({
        kind: "free",
        startLabel:
          minutesToClock(
            cursor,
          ),
        endLabel:
          minutesToClock(
            intervalStart,
          ),
      });
    }

    if (
      interval.kind ===
      "break"
    ) {
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
        kind:
          "appointment",
        appointment: {
          id: appointment.id,
          status:
            appointment.status,
          startLabel:
            minutesToClock(
              interval.start,
            ),
          endLabel:
            minutesToClock(
              interval.end,
            ),
          customerName:
            appointment.customers
              ?.full_name ??
            "Cliente",
          phone:
            appointment.customers
              ?.phone ?? null,
          serviceName:
            appointment.services
              ?.name ??
            "Serviço",
          totalPrice:
            Number(
              appointment.total_price,
            ),
          publicReference:
            appointment.public_reference,
          payment: (() => {
            const payment =
              singleRelation(
                appointment.presencial_payments,
              );

            return payment
              ? {
                  status:
                    payment.status,
                  method:
                    payment.method,
                  amount:
                    Number(
                      payment.amount,
                    ),
                }
              : null;
          })(),
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
        minutesToClock(
          cursor,
        ),
      endLabel:
        minutesToClock(
          end,
        ),
    });
  }

  return segments;
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
    start_at: start,
    end_at: end,
  } = bounds as {
    start_at: string;
    end_at: string;
  };

  const weekday =
    new Date(start)
      .toLocaleString(
        "en-US",
        {
          timeZone:
            barbershop.timezone,
          weekday: "short",
        },
      );

  const dayOfWeek =
    [
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
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `
          id,
          barber_id,
          start_at,
          end_at,
          status,
          total_price,
          public_reference,
          customers(
            full_name,
            phone
          ),
          services(name),
          presencial_payments(
            status,
            method,
            amount
          )
        `,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .gte(
        "start_at",
        start,
      )
      .lt(
        "start_at",
        end,
      )
      .order("start_at"),

    supabase
      .from("barbers")
      .select("id,name")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq("is_active", true)
      .order("name"),

    supabase
      .from(
        "business_hours",
      )
      .select(
        "barber_id,start_time,end_time,break_start,break_end",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "day_of_week",
        dayOfWeek,
      )
      .eq("is_active", true),
  ]);

  const appointments =
    (appointmentsResult.data ??
      []) as unknown as AgendaAppointment[];

  const barbers =
    (barbersResult.data ??
      []) as BarberRow[];

  const hours =
    (hoursResult.data ??
      []) as BusinessHourRow[];

  const columns: AgendaBarberColumn[] =
    barbers.map(
      (barber) => ({
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
      }),
    );

  const active =
    appointments.filter(
      (item) =>
        [
          "pending",
          "confirmed",
        ].includes(
          item.status,
        ),
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
      label:
        "Profissionais",
      value: barbers.length,
      icon: UsersRound,
    },
  ] as const;

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

      <div className="rounded-[1.4rem] border border-cyan-300/15 bg-cyan-300/[0.045] px-4 py-3 text-sm leading-6 text-cyan-100/75">
        A agenda agora mostra blocos de tempo legíveis:{" "}
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

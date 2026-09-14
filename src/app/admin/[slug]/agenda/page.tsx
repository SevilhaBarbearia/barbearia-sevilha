import {
  CalendarDays,
  Clock3,
  Scissors,
  UserRound,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";

import {
  completeAppointment as completeAppointmentResult,
} from "@/features/appointments/admin-actions";

import { requireBarbershopManager } from "@/features/tenancy/server";
import { asFormAction } from "@/lib/actions/form-action";

import type {
  AppointmentStatus,
  Barber,
} from "@/lib/db/types";

import { createClient } from "@/lib/supabase/server";

const completeAppointment = asFormAction(
  completeAppointmentResult,
);

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  pending:
    "border-amber-400/30 bg-amber-400/10 text-amber-100",

  confirmed:
    "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",

  completed:
    "border-sky-400/30 bg-sky-400/10 text-sky-100",

  canceled:
    "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",

  no_show:
    "border-red-400/30 bg-red-400/10 text-red-100",
};

type AgendaAppointment = {
  id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;

  customers: {
    full_name: string;
    phone: string | null;
  } | null;

  services: {
    name: string;
  } | null;

  barbers: {
    name: string;
  } | null;
};

type BusinessHourRow = {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
};

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
];

const OCCUPIED_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
];

function clockToMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const [hour, minute] = value
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hour * 60 + minute;
}

function minutesToClock(minutes: number) {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");

  const minute = (minutes % 60)
    .toString()
    .padStart(2, "0");

  return `${hour}:${minute}`;
}

function localMinutes(
  value: string,
  timeZone: string,
) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const hour = Number(
    parts.find(
      (part) => part.type === "hour",
    )?.value ?? 0,
  );

  const minute = Number(
    parts.find(
      (part) => part.type === "minute",
    )?.value ?? 0,
  );

  return hour * 60 + minute;
}

function localDayOfWeek(
  value: string,
  timeZone: string,
) {
  const weekday = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      weekday: "short",
    },
  ).format(new Date(value));

  return [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekday);
}

function formatLongDate(
  value: string,
  timeZone: string,
) {
  const result = new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone,
      weekday: "long",
      day: "2-digit",
      month: "long",
    },
  ).format(new Date(value));

  return (
    result.charAt(0).toUpperCase() +
    result.slice(1)
  );
}

function appointmentStartsAt(
  appointment: AgendaAppointment,
  slot: number,
  timeZone: string,
) {
  return (
    localMinutes(
      appointment.start_at,
      timeZone,
    ) === slot
  );
}

function appointmentCoversSlot(
  appointment: AgendaAppointment,
  slot: number,
  timeZone: string,
) {
  const start = localMinutes(
    appointment.start_at,
    timeZone,
  );

  const end = localMinutes(
    appointment.end_at,
    timeZone,
  );

  return start <= slot && end > slot;
}

function StatusPill({
  status,
}: {
  status: AppointmentStatus;
}) {
  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-black
        uppercase
        tracking-[0.12em]
        ${STATUS_CLASS[status]}
      `}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function CompleteButton({
  slug,
  appointmentId,
}: {
  slug: string;
  appointmentId: string;
}) {
  return (
    <ActionForm
      action={completeAppointment}
      className="mt-3"
    >
      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      <input
        type="hidden"
        name="appointment_id"
        value={appointmentId}
      />

      <Button
        type="submit"
        className="min-h-9 w-full px-3 py-2 text-xs"
      >
        Concluir atendimento
      </Button>
    </ActionForm>
  );
}

function AppointmentDetails({
  appointment,
  slug,
  compact = false,
}: {
  appointment: AgendaAppointment;
  slug: string;
  compact?: boolean;
}) {
  const active = ACTIVE_STATUSES.includes(
    appointment.status,
  );

  return (
    <div
      className={`
        rounded-xl
        border
        p-3
        ${active
          ? "border-brand-500/30 bg-brand-500/[0.08]"
          : "border-white/10 bg-black/15"
        }
      `}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">
            {appointment.customers?.full_name ||
              "Cliente"}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
            <Scissors className="h-3.5 w-3.5 shrink-0" />

            <span className="truncate">
              {appointment.services?.name ||
                "Serviço"}
            </span>
          </p>
        </div>

        <StatusPill
          status={appointment.status}
        />
      </div>

      {!compact &&
        appointment.customers?.phone && (
          <p className="mt-2 text-xs text-zinc-400">
            {appointment.customers.phone}
          </p>
        )}

      {!compact && active && (
        <CompleteButton
          slug={slug}
          appointmentId={appointment.id}
        />
      )}
    </div>
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

  const dayOfWeek = localDayOfWeek(
    start,
    barbershop.timezone,
  );

  const [
    appointmentsResult,
    barbersResult,
    businessHoursResult,
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
          customers(
            full_name,
            phone
          ),
          services(
            name
          ),
          barbers(
            name
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
      .select("*")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "is_active",
        true,
      )
      .order("name"),

    supabase
      .from("business_hours")
      .select(
        `
          barber_id,
          day_of_week,
          start_time,
          end_time,
          break_start,
          break_end,
          is_active
        `,
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "day_of_week",
        dayOfWeek,
      )
      .eq(
        "is_active",
        true,
      ),
  ]);

  const appointments =
    (appointmentsResult.data ??
      []) as unknown as AgendaAppointment[];

  const barbers =
    (barbersResult.data ??
      []) as Barber[];

  const businessHours =
    (businessHoursResult.data ??
      []) as BusinessHourRow[];

  const occupiedAppointments =
    appointments.filter((appointment) =>
      OCCUPIED_STATUSES.includes(
        appointment.status,
      ),
    );

  const activeAppointments =
    appointments.filter((appointment) =>
      ACTIVE_STATUSES.includes(
        appointment.status,
      ),
    );

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "completed",
    );

  const canceledAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "canceled",
    );

  const hourStarts = businessHours
    .map((hour) =>
      clockToMinutes(hour.start_time),
    )
    .filter(
      (value): value is number =>
        value !== null,
    );

  const hourEnds = businessHours
    .map((hour) =>
      clockToMinutes(hour.end_time),
    )
    .filter(
      (value): value is number =>
        value !== null,
    );

  const appointmentStarts =
    occupiedAppointments.map(
      (appointment) =>
        localMinutes(
          appointment.start_at,
          barbershop.timezone,
        ),
    );

  const appointmentEnds =
    occupiedAppointments.map(
      (appointment) =>
        localMinutes(
          appointment.end_at,
          barbershop.timezone,
        ),
    );

  const firstMinute = Math.min(
    ...(hourStarts.length
      ? hourStarts
      : appointmentStarts.length
        ? appointmentStarts
        : [0]),
  );

  const lastMinute = Math.max(
    ...(hourEnds.length
      ? hourEnds
      : appointmentEnds.length
        ? appointmentEnds
        : [0]),
  );

  const slots: number[] = [];

  if (lastMinute > firstMinute) {
    const roundedStart =
      Math.floor(firstMinute / 15) * 15;

    const roundedEnd =
      Math.ceil(lastMinute / 15) * 15;

    for (
      let minute = roundedStart;
      minute < roundedEnd;
      minute += 15
    ) {
      slots.push(minute);
    }
  }

  const mobileGroups = Array.from(
    occupiedAppointments.reduce(
      (groups, appointment) => {
        const minute = localMinutes(
          appointment.start_at,
          barbershop.timezone,
        );

        const items =
          groups.get(minute) ?? [];

        items.push(appointment);

        groups.set(
          minute,
          items,
        );

        return groups;
      },
      new Map<
        number,
        AgendaAppointment[]
      >(),
    ),
  ).sort(
    ([a], [b]) => a - b,
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge>
            <CalendarDays className="h-4 w-4" />
            Agenda
          </Badge>

          <h1 className="mt-3 text-3xl font-black text-white">
            Agenda do dia
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            {formatLongDate(
              start,
              barbershop.timezone,
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[390px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">
            <strong className="block text-xl text-white">
              {activeAppointments.length}
            </strong>

            <span className="text-[11px] text-zinc-400">
              Ativos
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">
            <strong className="block text-xl text-white">
              {completedAppointments.length}
            </strong>

            <span className="text-[11px] text-zinc-400">
              Concluídos
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">
            <strong className="block text-xl text-white">
              {barbers.length}
            </strong>

            <span className="text-[11px] text-zinc-400">
              Barbeiros
            </span>
          </div>
        </div>
      </div>

      {barbers.length === 0 ? (
        <Card>
          <CardDescription>
            Nenhum barbeiro ativo foi encontrado
            para esta barbearia.
          </CardDescription>
        </Card>
      ) : occupiedAppointments.length ===
        0 ? (
        <Card>
          <CardDescription>
            Nenhuma reserva ativa ou realizada
            para hoje.
          </CardDescription>
        </Card>
      ) : (
        <>
          <Card className="md:hidden">
            <CardTitle>
              Reservas por horário
            </CardTitle>

            <CardDescription>
              Em cada horário você vê todos os
              barbeiros que possuem reserva.
            </CardDescription>

            <div className="mt-5 grid gap-4">
              {mobileGroups.map(
                ([minute, items]) => (
                  <section
                    key={minute}
                    className="rounded-2xl border border-white/10 bg-black/15 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-brand-300" />

                      <h2 className="text-lg font-black text-white">
                        {minutesToClock(
                          minute,
                        )}
                      </h2>

                      <span className="text-xs text-zinc-500">
                        {items.length}{" "}
                        {items.length === 1
                          ? "reserva"
                          : "reservas"}
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {items.map(
                        (appointment) => (
                          <div
                            key={
                              appointment.id
                            }
                          >
                            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-zinc-300">
                              <UserRound className="h-3.5 w-3.5" />

                              {appointment
                                .barbers
                                ?.name ||
                                "Barbeiro"}
                            </div>

                            <AppointmentDetails
                              appointment={
                                appointment
                              }
                              slug={
                                barbershop.slug
                              }
                            />
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          </Card>

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="border-b border-white/10 p-5">
              <CardTitle>
                Mapa da agenda
              </CardTitle>

              <CardDescription>
                A grade mostra simultaneamente
                a ocupação de cada barbeiro em
                intervalos de 15 minutos.
              </CardDescription>
            </div>

            <div className="overflow-x-auto">
              <div
                className="min-w-max"
                style={{
                  display: "grid",
                  gridTemplateColumns: `88px repeat(${barbers.length}, minmax(230px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-20 border-b border-r border-white/10 bg-zinc-950 p-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
                  Hora
                </div>

                {barbers.map(
                  (barber) => (
                    <div
                      key={barber.id}
                      className="border-b border-r border-white/10 bg-zinc-950 p-3"
                    >
                      <p className="flex items-center gap-2 text-sm font-black text-white">
                        <UserRound className="h-4 w-4 text-brand-300" />

                        {barber.name}
                      </p>
                    </div>
                  ),
                )}

                {slots.map(
                  (slot) => (
                    <div
                      key={`row-${slot}`}
                      className="contents"
                    >
                      <div className="sticky left-0 z-10 border-b border-r border-white/10 bg-zinc-950/95 p-3 text-sm font-black text-zinc-300 backdrop-blur">
                        {minutesToClock(
                          slot,
                        )}
                      </div>

                      {barbers.map(
                        (barber) => {
                          const barberHours =
                            businessHours.filter(
                              (hour) =>
                                hour.barber_id ===
                                barber.id,
                            );

                          const inWorkingHours =
                            barberHours.some(
                              (hour) => {
                                const startMinute =
                                  clockToMinutes(
                                    hour.start_time,
                                  );

                                const endMinute =
                                  clockToMinutes(
                                    hour.end_time,
                                  );

                                return (
                                  startMinute !==
                                  null &&
                                  endMinute !==
                                  null &&
                                  slot >=
                                  startMinute &&
                                  slot <
                                  endMinute
                                );
                              },
                            );

                          const inBreak =
                            barberHours.some(
                              (hour) => {
                                const breakStart =
                                  clockToMinutes(
                                    hour.break_start,
                                  );

                                const breakEnd =
                                  clockToMinutes(
                                    hour.break_end,
                                  );

                                return (
                                  breakStart !==
                                  null &&
                                  breakEnd !==
                                  null &&
                                  slot >=
                                  breakStart &&
                                  slot <
                                  breakEnd
                                );
                              },
                            );

                          const coveringAppointment =
                            occupiedAppointments.find(
                              (
                                appointment,
                              ) =>
                                appointment.barber_id ===
                                barber.id &&
                                appointmentCoversSlot(
                                  appointment,
                                  slot,
                                  barbershop.timezone,
                                ),
                            );

                          const isStarting =
                            coveringAppointment &&
                            appointmentStartsAt(
                              coveringAppointment,
                              slot,
                              barbershop.timezone,
                            );

                          return (
                            <div
                              key={`${slot}-${barber.id}`}
                              className="min-h-[76px] border-b border-r border-white/10 p-2"
                            >
                              {coveringAppointment &&
                                isStarting ? (
                                <AppointmentDetails
                                  appointment={
                                    coveringAppointment
                                  }
                                  slug={
                                    barbershop.slug
                                  }
                                />
                              ) : coveringAppointment ? (
                                <div className="rounded-xl border border-brand-500/15 bg-brand-500/[0.04] p-2.5 text-xs text-zinc-300">
                                  <p className="font-bold text-white">
                                    Em atendimento
                                  </p>

                                  <p className="mt-1 truncate">
                                    {coveringAppointment
                                      .customers
                                      ?.full_name ||
                                      "Cliente"}
                                  </p>

                                  <p className="mt-1 text-zinc-500">
                                    até{" "}
                                    {minutesToClock(
                                      localMinutes(
                                        coveringAppointment.end_at,
                                        barbershop.timezone,
                                      ),
                                    )}
                                  </p>
                                </div>
                              ) : inBreak ? (
                                <div className="flex h-full min-h-[58px] items-center justify-center rounded-xl border border-dashed border-amber-500/15 bg-amber-500/[0.035] text-xs font-bold text-amber-200/70">
                                  Intervalo
                                </div>
                              ) : inWorkingHours ? (
                                <div className="flex h-full min-h-[58px] items-center justify-center rounded-xl border border-dashed border-emerald-500/15 bg-emerald-500/[0.025] text-xs font-bold text-emerald-200/60">
                                  Livre
                                </div>
                              ) : (
                                <div className="flex h-full min-h-[58px] items-center justify-center text-xs text-zinc-600">
                                  Fora do
                                  expediente
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {canceledAppointments.length >
        0 && (
          <p className="text-xs text-zinc-500">
            {canceledAppointments.length}{" "}
            {canceledAppointments.length ===
              1
              ? "reserva cancelada hoje não ocupa mais a agenda."
              : "reservas canceladas hoje não ocupam mais a agenda."}
          </p>
        )}
    </div>
  );
}
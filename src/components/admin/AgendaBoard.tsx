"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  CalendarClock,
  CheckCircle2,
  Coffee,
  Phone,
  Scissors,
  UserRound,
  UserX,
} from "lucide-react";

import { AdminModal } from "@/components/admin/AdminModal";
import { AppointmentOutcomeActions } from "@/components/admin/AppointmentOutcomeActions";
import { CompleteAppointmentModal } from "@/components/admin/CompleteAppointmentModal";
import { formatarMoeda } from "@/lib/utils";

export type AgendaAppointmentView = {
  id: string;
  status: string;
  startLabel: string;
  endLabel: string;
  customerName: string;
  phone: string | null;
  serviceName: string;
  totalPrice: number;
  publicReference: string | null;
  payment:
    | {
        status: string;
        method: string;
        amount: number;
      }
    | null;
};

export type AgendaSegment =
  | {
      kind: "free";
      startLabel: string;
      endLabel: string;
    }
  | {
      kind: "break";
      startLabel: string;
      endLabel: string;
    }
  | {
      kind: "appointment";
      appointment: AgendaAppointmentView;
    };

export type AgendaBarberColumn = {
  id: string;
  name: string;
  segments: AgendaSegment[];
};

const STATUS_LABELS: Record<
  string,
  string
> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  no_show: "No-show",
  canceled: "Cancelado",
};

const PAYMENT_LABELS: Record<
  string,
  string
> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito:
    "Cartão de crédito",
  cartao_debito:
    "Cartão de débito",
  outro: "Outro",
};

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "completed"
      ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200"
      : status === "confirmed"
        ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200"
        : status === "no_show"
          ? "border-red-300/20 bg-red-300/[0.08] text-red-200"
          : "border-amber-300/20 bg-amber-300/[0.08] text-amber-200";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${styles}`}
    >
      {STATUS_LABELS[
        status
      ] ?? status}
    </span>
  );
}

export function AgendaBoard({
  slug,
  columns,
}: {
  slug: string;
  columns: AgendaBarberColumn[];
}) {
  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(null);

  /*
   * Eu guardo somente o ID selecionado.
   *
   * Quando uma Server Action revalida a agenda, as props recebem o novo
   * status e o modal também se atualiza. Isso evita manter uma cópia antiga
   * da reserva depois de cancelar, concluir ou registrar no-show.
   */
  const selected = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    for (const column of columns) {
      for (const segment of column.segments) {
        if (
          segment.kind === "appointment" &&
          segment.appointment.id === selectedId
        ) {
          return segment.appointment;
        }
      }
    }

    return null;
  }, [columns, selectedId]);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {columns.map(
          (column) => (
            <section
              key={column.id}
              className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_18px_55px_rgba(0,0,0,0.18)]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
                    <UserRound className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <h2 className="truncate font-extrabold text-white">
                      {column.name}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Linha do tempo do dia
                    </p>
                  </div>
                </div>

                <CalendarClock className="h-4 w-4 text-slate-500" />
              </header>

              <div className="grid gap-2 p-3 sm:p-4">
                {column.segments.map(
                  (
                    segment,
                    index,
                  ) => {
                    if (
                      segment.kind ===
                      "free"
                    ) {
                      return (
                        <div
                          key={`free-${index}-${segment.startLabel}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] px-3 py-2.5"
                        >
                          <span className="text-xs font-extrabold text-emerald-200">
                            Livre
                          </span>

                          <span className="text-xs font-semibold text-emerald-100/60">
                            {
                              segment.startLabel
                            }{" "}
                            –{" "}
                            {
                              segment.endLabel
                            }
                          </span>
                        </div>
                      );
                    }

                    if (
                      segment.kind ===
                      "break"
                    ) {
                      return (
                        <div
                          key={`break-${index}-${segment.startLabel}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-3 py-2.5"
                        >
                          <span className="flex items-center gap-2 text-xs font-extrabold text-amber-200">
                            <Coffee className="h-3.5 w-3.5" />
                            Intervalo
                          </span>

                          <span className="text-xs font-semibold text-amber-100/60">
                            {
                              segment.startLabel
                            }{" "}
                            –{" "}
                            {
                              segment.endLabel
                            }
                          </span>
                        </div>
                      );
                    }

                    const appointment =
                      segment.appointment;

                    return (
                      <button
                        key={
                          appointment.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedId(
                            appointment.id,
                          )
                        }
                        className="group rounded-2xl border border-white/10 bg-[#223246] p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-[#26394F] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-extrabold text-amber-300">
                              {
                                appointment.startLabel
                              }{" "}
                              –{" "}
                              {
                                appointment.endLabel
                              }
                            </p>

                            <p className="mt-2 font-extrabold text-white">
                              {
                                appointment.customerName
                              }
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <Scissors className="h-3.5 w-3.5" />
                              {
                                appointment.serviceName
                              }
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              appointment.status
                            }
                          />
                        </div>

                        {appointment.phone && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="h-3.5 w-3.5" />
                            {
                              appointment.phone
                            }
                          </p>
                        )}

                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 transition group-hover:text-amber-200/70">
                          Clique para detalhes
                        </p>
                      </button>
                    );
                  },
                )}

                {!column.segments
                  .length && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                    Sem expediente ou agendamentos para hoje.
                  </div>
                )}
              </div>
            </section>
          ),
        )}
      </div>

      <AdminModal
        open={Boolean(
          selected,
        )}
        onClose={() =>
          setSelectedId(null)
        }
        title="Detalhes do atendimento"
        description="Informações completas da reserva selecionada."
        size="md"
      >
        {selected && (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-white">
                    {
                      selected.customerName
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {
                      selected.serviceName
                    }
                  </p>
                </div>

                <StatusBadge
                  status={
                    selected.status
                  }
                />
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>
                  Horário:{" "}
                  <strong className="text-white">
                    {
                      selected.startLabel
                    }{" "}
                    –{" "}
                    {
                      selected.endLabel
                    }
                  </strong>
                </p>

                <p>
                  Valor:{" "}
                  <strong className="text-white">
                    {formatarMoeda(
                      selected.totalPrice,
                    )}
                  </strong>
                </p>

                {selected.phone && (
                  <p>
                    Telefone:{" "}
                    <strong className="text-white">
                      {
                        selected.phone
                      }
                    </strong>
                  </p>
                )}

                {selected.publicReference && (
                  <p>
                    Código:{" "}
                    <strong className="text-white">
                      {
                        selected.publicReference
                      }
                    </strong>
                  </p>
                )}
              </div>
            </div>

            {selected.status === "no_show" && (
              <div className="rounded-2xl border border-red-300/20 bg-red-300/[0.07] p-4 text-sm text-red-100">
                <p className="flex items-center gap-2 font-extrabold">
                  <UserX className="h-4 w-4" />
                  Cancelado por não comparecimento
                </p>

                <p className="mt-2 leading-6 text-red-100/70">
                  Este atendimento foi registrado como no-show e permanece no
                  histórico para relatórios de ausência.
                </p>
              </div>
            )}

            {selected.payment && (
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 text-sm text-cyan-100">
                <p className="flex items-center gap-2 font-extrabold">
                  <CheckCircle2 className="h-4 w-4" />
                  Pagamento registrado
                </p>

                <p className="mt-2 text-cyan-100/70">
                  {PAYMENT_LABELS[
                    selected.payment
                      .method
                  ] ??
                    selected.payment
                      .method}{" "}
                  •{" "}
                  {formatarMoeda(
                    selected.payment
                      .amount,
                  )}
                </p>
              </div>
            )}

            {[
              "pending",
              "confirmed",
            ].includes(
              selected.status,
            ) && (
              <>
                <CompleteAppointmentModal
                  slug={slug}
                  appointmentId={
                    selected.id
                  }
                  customerName={
                    selected.customerName
                  }
                  serviceName={
                    selected.serviceName
                  }
                  amount={
                    selected.totalPrice
                  }
                />

                <AppointmentOutcomeActions
                  slug={slug}
                  appointmentId={
                    selected.id
                  }
                  customerName={
                    selected.customerName
                  }
                />
              </>
            )}
          </div>
        )}
      </AdminModal>
    </>
  );
}

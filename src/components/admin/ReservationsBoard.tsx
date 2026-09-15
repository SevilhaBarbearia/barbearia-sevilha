"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CreditCard,
  Mail,
  Phone,
  Scissors,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import { AdminModal } from "@/components/admin/AdminModal";
import { CompleteAppointmentModal } from "@/components/admin/CompleteAppointmentModal";
import {
  Input,
  Select,
} from "@/components/ui/Input";
import {
  formatarMoeda,
  formatarTelefone,
} from "@/lib/utils";

export type AdminReservation = {
  id: string;
  barberId: string;
  barberName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceName: string;
  startAt: string;
  startLabel: string;
  dateLabel: string;
  status: string;
  totalPrice: number;
  publicReference: string | null;
  payment:
    | {
        status: string;
        amount: number;
        method: string;
      }
    | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não compareceu",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  outro: "Outro",
};

function statusClass(status: string) {
  if (status === "completed") {
    return "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200";
  }

  if (status === "confirmed") {
    return "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200";
  }

  if (status === "canceled" || status === "no_show") {
    return "border-red-300/20 bg-red-300/[0.08] text-red-200";
  }

  return "border-amber-300/20 bg-amber-300/[0.08] text-amber-200";
}

function PaymentBadge({
  payment,
}: {
  payment: AdminReservation["payment"];
}) {
  if (payment?.status === "paid") {
    return (
      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-200">
        Pago
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-400/15 bg-slate-400/[0.06] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
      Sem pagamento
    </span>
  );
}

export function ReservationsBoard({
  slug,
  reservations,
  todayStart,
  todayEnd,
}: {
  slug: string;
  reservations: AdminReservation[];
  todayStart: string;
  todayEnd: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [barberId, setBarberId] = useState("all");
  const [selectedReservation, setSelectedReservation] =
    useState<AdminReservation | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const barbers = useMemo(() => {
    const map = new Map<string, string>();

    for (const reservation of reservations) {
      map.set(reservation.barberId, reservation.barberName);
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [reservations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reservations.filter((reservation) => {
      if (status !== "all" && reservation.status !== status) {
        return false;
      }

      if (barberId !== "all" && reservation.barberId !== barberId) {
        return false;
      }

      if (!query) return true;

      return [
        reservation.customerName,
        reservation.customerPhone,
        reservation.customerEmail,
        reservation.serviceName,
        reservation.barberName,
        reservation.publicReference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [reservations, search, status, barberId]);

  const todayStartTime = new Date(todayStart).getTime();
  const todayEndTime = new Date(todayEnd).getTime();

  const barberSummaries = useMemo(
    () =>
      barbers.map((barber) => {
        const items = reservations.filter((reservation) => {
          const time = new Date(reservation.startAt).getTime();

          return (
            reservation.barberId === barber.id &&
            time >= todayStartTime &&
            time < todayEndTime
          );
        });

        const completed = items.filter(
          (item) => item.status === "completed",
        );

        const revenue = completed.reduce(
          (sum, item) =>
            sum +
            (item.payment?.status === "paid"
              ? item.payment.amount
              : 0),
          0,
        );

        return {
          ...barber,
          items,
          completed,
          revenue,
        };
      }),
    [barbers, reservations, todayStartTime, todayEndTime],
  );

  const barberDetail = barberSummaries.find(
    (barber) => barber.id === selectedBarber,
  );

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {barberSummaries.map((barber) => (
          <button
            key={barber.id}
            type="button"
            onClick={() => setSelectedBarber(barber.id)}
            className="group rounded-[1.35rem] border border-white/10 bg-[#1B2939] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-[#203044] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
                <UserRound className="h-4 w-4" />
              </span>

              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600 group-hover:text-amber-200/70">
                Ver detalhes
              </span>
            </div>

            <p className="mt-4 font-extrabold text-white">
              {barber.name}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {barber.completed.length} atendimentos concluídos hoje
            </p>

            <p className="mt-3 text-sm font-extrabold text-emerald-300">
              {formatarMoeda(barber.revenue)}
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_220px]">
          <label className="relative">
            <span className="sr-only">Buscar reserva</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, telefone, serviço ou código..."
              className="pl-10"
            />
          </label>

          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="canceled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </Select>

          <Select
            value={barberId}
            onChange={(event) => setBarberId(event.target.value)}
          >
            <option value="all">Todos os barbeiros</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} reservas encontradas
        </p>
      </section>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((reservation) => (
          <button
            key={reservation.id}
            type="button"
            onClick={() => setSelectedReservation(reservation)}
            className="group rounded-[1.4rem] border border-white/10 bg-[#1B2939] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-[#203044] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-extrabold text-white">
                  {reservation.customerName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {reservation.serviceName} • {reservation.barberName}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass(
                    reservation.status,
                  )}`}
                >
                  {STATUS_LABELS[reservation.status] ?? reservation.status}
                </span>
                <PaymentBadge payment={reservation.payment} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
                {reservation.dateLabel} às {reservation.startLabel}
              </span>

              <span className="font-extrabold text-white">
                {formatarMoeda(reservation.totalPrice)}
              </span>
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 transition group-hover:text-amber-200/70">
              Clique para abrir os detalhes
            </p>
          </button>
        ))}

        {!filtered.length && (
          <div className="rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center text-sm text-slate-500 lg:col-span-2 2xl:col-span-3">
            Nenhuma reserva encontrada com esses filtros.
          </div>
        )}
      </div>

      <AdminModal
        open={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        title="Detalhes da reserva"
        description="Cliente, atendimento, pagamento e código da reserva."
        size="md"
      >
        {selectedReservation && (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-white">
                    {selectedReservation.customerName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedReservation.serviceName} com{" "}
                    {selectedReservation.barberName}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass(
                    selectedReservation.status,
                  )}`}
                >
                  {STATUS_LABELS[selectedReservation.status] ??
                    selectedReservation.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-300" />
                  {selectedReservation.dateLabel} às{" "}
                  {selectedReservation.startLabel}
                </p>

                {selectedReservation.customerPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-300" />
                    {formatarTelefone(selectedReservation.customerPhone)}
                  </p>
                )}

                {selectedReservation.customerEmail && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-amber-300" />
                    {selectedReservation.customerEmail}
                  </p>
                )}

                <p className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-amber-300" />
                  {formatarMoeda(selectedReservation.totalPrice)}
                </p>

                {selectedReservation.publicReference && (
                  <p className="font-mono text-xs text-slate-500">
                    Código: {selectedReservation.publicReference}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="flex items-center gap-2 font-extrabold text-white">
                <CreditCard className="h-4 w-4 text-amber-300" />
                Pagamento
              </p>

              {selectedReservation.payment ? (
                <p className="mt-2 text-sm text-slate-400">
                  {PAYMENT_LABELS[selectedReservation.payment.method] ??
                    selectedReservation.payment.method}{" "}
                  • {formatarMoeda(selectedReservation.payment.amount)} •{" "}
                  {selectedReservation.payment.status === "paid"
                    ? "Pago"
                    : selectedReservation.payment.status}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Nenhum pagamento registrado.
                </p>
              )}
            </div>

            {["pending", "confirmed"].includes(
              selectedReservation.status,
            ) && (
              <CompleteAppointmentModal
                slug={slug}
                appointmentId={selectedReservation.id}
                customerName={selectedReservation.customerName}
                serviceName={selectedReservation.serviceName}
                amount={selectedReservation.totalPrice}
              />
            )}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(barberDetail)}
        onClose={() => setSelectedBarber(null)}
        title={barberDetail ? barberDetail.name : "Profissional"}
        description="Resumo dos atendimentos de hoje."
        size="lg"
      >
        {barberDetail && (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <UsersRound className="h-4 w-4 text-amber-300" />
                <strong className="mt-3 block text-2xl text-white">
                  {barberDetail.items.length}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Reservas hoje
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Scissors className="h-4 w-4 text-cyan-300" />
                <strong className="mt-3 block text-2xl text-white">
                  {barberDetail.completed.length}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Concluídos
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CreditCard className="h-4 w-4 text-emerald-300" />
                <strong className="mt-3 block text-xl text-white">
                  {formatarMoeda(barberDetail.revenue)}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Recebido hoje
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {barberDetail.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedBarber(null);
                    setSelectedReservation(item);
                  }}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-amber-300/25 hover:bg-white/[0.06] sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-bold text-white">
                      {item.customerName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.startLabel} • {item.serviceName}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm font-extrabold text-white">
                      {formatarMoeda(
                        item.payment?.status === "paid"
                          ? item.payment.amount
                          : 0,
                      )}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      {item.payment
                        ? PAYMENT_LABELS[item.payment.method] ??
                          item.payment.method
                        : "Sem pagamento"}
                    </p>
                  </div>
                </button>
              ))}

              {!barberDetail.items.length && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Nenhuma reserva para este profissional hoje.
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}

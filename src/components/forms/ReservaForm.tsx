"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarDays,
  Check,
  LockKeyhole,
  MessageSquareText,
  Scissors,
  UserRound,
} from "lucide-react";

import { SeletorHorario } from "@/components/agendamento/SeletorHorario";
import { ActionForm } from "@/components/forms/ActionForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { asFormAction } from "@/lib/actions/form-action";
import { criarAgendamento } from "@/lib/agendamentos/actions";
import type { Barber, Service } from "@/lib/db/types";
import { formatarMoeda } from "@/lib/utils";

type BarberComServicos = Barber & {
  barber_services?: Array<{
    service_id: string;
    is_active: boolean;
  }> | null;
};

type InitialSelection = {
  serviceId?: string;
  barberId?: string;
  date?: string;
  startAt?: string;
};

function BotaoConfirmar({
  disabled,
}: {
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending || disabled}
      className="w-full text-sm sm:text-base"
    >
      {pending ? "Confirmando reserva..." : "Confirmar reserva"}
    </Button>
  );
}

function StepHeader({
  step,
  title,
  icon: Icon,
}: {
  step: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {step}
        </p>
        <Label className="mb-0 text-base">
          {title}
        </Label>
      </div>
    </div>
  );
}

export function ReservaForm({
  services,
  barbers,
  slug,
  authenticated,
  profileComplete,
  initialSelection,
}: {
  services: Service[];
  barbers: BarberComServicos[];
  slug: string;
  authenticated: boolean;
  profileComplete: boolean;
  initialSelection?: InitialSelection;
}) {
  const initialServiceId =
    initialSelection?.serviceId &&
    services.some((service) => service.id === initialSelection.serviceId)
      ? initialSelection.serviceId
      : services[0]?.id ?? "";

  const [serviceId, setServiceId] = useState(initialServiceId);

  const barbeirosDoServico = useMemo(() => {
    if (!serviceId) return [];

    return barbers.filter((barbeiro) =>
      barbeiro.barber_services?.some(
        (vinculo) =>
          vinculo.service_id === serviceId &&
          vinculo.is_active,
      ),
    );
  }, [barbers, serviceId]);

  const initialBarberId =
    initialSelection?.barberId &&
    barbeirosDoServico.some(
      (barber) => barber.id === initialSelection.barberId,
    )
      ? initialSelection.barberId
      : barbeirosDoServico[0]?.id ?? "";

  const [barberId, setBarberId] = useState(initialBarberId);
  const [data, setData] = useState(initialSelection?.date ?? "");
  const [startAt, setStartAt] = useState(initialSelection?.startAt ?? "");

  useEffect(() => {
    const barbeiroContinuaDisponivel = barbeirosDoServico.some(
      (barbeiro) => barbeiro.id === barberId,
    );

    if (!barbeiroContinuaDisponivel) {
      setBarberId(barbeirosDoServico[0]?.id ?? "");
      setStartAt("");
    }
  }, [barbeirosDoServico, barberId]);

  if (services.length === 0 || barbers.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Ainda não existem serviços ou profissionais ativos para reserva.
      </div>
    );
  }

  const semBarbeiroParaServico =
    Boolean(serviceId) &&
    barbeirosDoServico.length === 0;

  const selectionReady =
    Boolean(
      serviceId &&
      barberId &&
      data &&
      startAt,
    ) &&
    !semBarbeiroParaServico;

  const params = new URLSearchParams();

  if (serviceId) params.set("service", serviceId);
  if (barberId) params.set("barber", barberId);
  if (data) params.set("date", data);
  if (startAt) params.set("start", startAt);

  const queryString = params.toString();

  const bookingPath = `/${slug}/reservar${
    queryString ? `?${queryString}` : ""
  }`;

  const loginHref = `/${slug}/login?next=${encodeURIComponent(
    bookingPath,
  )}`;

  const profileHref = `/${slug}/completar-cadastro?next=${encodeURIComponent(
    bookingPath,
  )}`;

  return (
    <ActionForm
      action={asFormAction(criarAgendamento)}
      className="grid gap-4"
    >
      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      <div className="mb-1 grid grid-cols-4 gap-2">
        {["Serviço", "Profissional", "Horário", "Confirmar"].map(
          (item, index) => (
            <div
              key={item}
              className="min-w-0"
            >
              <div
                className={[
                  "h-1.5 rounded-full transition",
                  index === 0 ||
                  (index === 1 && serviceId) ||
                  (index === 2 && barberId && data) ||
                  (index === 3 && selectionReady)
                    ? "bg-[var(--tenant-accent)]"
                    : "bg-[var(--border)]",
                ].join(" ")}
              />

              <p className="mt-1 hidden truncate text-[10px] font-bold text-[var(--text-muted)] sm:block">
                {item}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="ui-booking-step rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_12px_35px_rgba(68,48,26,0.05)] sm:p-5">
        <StepHeader
          step="Etapa 1"
          title="Escolha o serviço"
          icon={Scissors}
        />

        <Select
          name="service_id"
          value={serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            setStartAt("");
          }}
          required
        >
          {services.map((servico) => (
            <option
              key={servico.id}
              value={servico.id}
            >
              {servico.name} · {formatarMoeda(Number(servico.price))} ·{" "}
              {servico.duration_minutes} min
            </option>
          ))}
        </Select>
      </div>

      <div className="ui-booking-step rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_12px_35px_rgba(68,48,26,0.05)] sm:p-5">
        <StepHeader
          step="Etapa 2"
          title="Escolha o profissional"
          icon={UserRound}
        />

        {semBarbeiroParaServico ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Este serviço ainda não possui um profissional ativo vinculado.
          </div>
        ) : (
          <Select
            name="barber_id"
            value={barberId}
            onChange={(event) => {
              setBarberId(event.target.value);
              setStartAt("");
            }}
            required
          >
            {barbeirosDoServico.map((barber) => (
              <option
                key={barber.id}
                value={barber.id}
              >
                {barber.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="ui-booking-step rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_12px_35px_rgba(68,48,26,0.05)] sm:p-5">
        <StepHeader
          step="Etapa 3"
          title="Escolha data e horário"
          icon={CalendarDays}
        />

        <div className="grid gap-4">
          <Input
            type="date"
            value={data}
            onChange={(event) => {
              setData(event.target.value);
              setStartAt("");
            }}
            required
            disabled={semBarbeiroParaServico}
          />

          <SeletorHorario
            barberId={barberId}
            serviceId={serviceId}
            data={data}
            slug={slug}
            value={startAt}
            onValueChange={setStartAt}
          />
        </div>
      </div>

      <div className="ui-booking-step rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_12px_35px_rgba(68,48,26,0.05)] sm:p-5">
        <StepHeader
          step="Opcional"
          title="Observações"
          icon={MessageSquareText}
        />

        <Textarea
          name="client_notes"
          placeholder="Ex.: prefiro degradê baixo, cabelo mais curto nas laterais..."
          rows={4}
        />
      </div>

      {!authenticated && (
        <div className="rounded-3xl border border-[var(--border)] bg-[#252623] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--tenant-accent)]">
              <LockKeyhole className="h-5 w-5" />
            </span>

            <div>
              <p className="font-extrabold">
                Entre somente para confirmar
              </p>
              <p className="mt-1 text-sm leading-6 text-white/65">
                Sua escolha fica preservada. O login é necessário apenas antes
                de concluir a reserva.
              </p>
            </div>
          </div>

          <ButtonLink
            href={loginHref}
            className={[
              "mt-5 w-full",
              !selectionReady
                ? "pointer-events-none opacity-50"
                : "",
            ].join(" ")}
          >
            <Check className="h-4 w-4" />
            Entrar para confirmar
          </ButtonLink>
        </div>
      )}

      {authenticated && !profileComplete && (
        <div className="rounded-3xl border border-[var(--border)] bg-[#252623] p-5 text-white">
          <p className="font-extrabold">
            Falta só completar seus dados
          </p>

          <p className="mt-1 text-sm leading-6 text-white/65">
            Vamos usar nome e telefone apenas para identificar e acompanhar sua
            reserva.
          </p>

          <ButtonLink
            href={profileHref}
            className={[
              "mt-5 w-full",
              !selectionReady
                ? "pointer-events-none opacity-50"
                : "",
            ].join(" ")}
          >
            Completar cadastro
          </ButtonLink>
        </div>
      )}

      {authenticated && profileComplete && (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Tudo pronto. Revise suas escolhas e confirme a reserva.
          </div>

          <BotaoConfirmar
            disabled={!selectionReady}
          />
        </>
      )}
    </ActionForm>
  );
}

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
  CheckCircle2,
  Contact,
  MessageSquareText,
  Scissors,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { SeletorHorario } from "@/components/agendamento/SeletorHorario";
import { ActionForm } from "@/components/forms/ActionForm";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Input";
import { asFormAction } from "@/lib/actions/form-action";
import {
  criarAgendamento,
  criarAgendamentoComCadastro,
  criarAgendamentoConvidado,
} from "@/lib/agendamentos/actions";
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

type InitialContact = {
  name?: string;
  phone?: string;
  email?: string;
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
      {pending
        ? "Confirmando reserva..."
        : "Confirmar reserva"}
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
  initialContact,
}: {
  services: Service[];
  barbers: BarberComServicos[];
  slug: string;
  authenticated: boolean;
  profileComplete: boolean;
  initialSelection?: InitialSelection;
  initialContact?: InitialContact;
}) {
  const initialServiceId =
    initialSelection?.serviceId &&
    services.some(
      (service) =>
        service.id === initialSelection.serviceId,
    )
      ? initialSelection.serviceId
      : services[0]?.id ?? "";

  const [serviceId, setServiceId] =
    useState(initialServiceId);

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
      (barber) =>
        barber.id === initialSelection.barberId,
    )
      ? initialSelection.barberId
      : barbeirosDoServico[0]?.id ?? "";

  const [barberId, setBarberId] =
    useState(initialBarberId);

  const [data, setData] =
    useState(initialSelection?.date ?? "");

  const [startAt, setStartAt] =
    useState(initialSelection?.startAt ?? "");

  useEffect(() => {
    const barbeiroContinuaDisponivel =
      barbeirosDoServico.some(
        (barbeiro) => barbeiro.id === barberId,
      );

    if (!barbeiroContinuaDisponivel) {
      setBarberId(
        barbeirosDoServico[0]?.id ?? "",
      );
      setStartAt("");
    }
  }, [barbeirosDoServico, barberId]);

  if (
    services.length === 0 ||
    barbers.length === 0
  ) {
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

  const precisaDados =
    !authenticated || !profileComplete;

  const action = !authenticated
    ? criarAgendamentoConvidado
    : profileComplete
      ? criarAgendamento
      : criarAgendamentoComCadastro;

  return (
    <ActionForm
      action={asFormAction(action)}
      className="grid gap-4"
    >
      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      <div className="mb-1 grid grid-cols-5 gap-2">
        {[
          "Serviço",
          "Profissional",
          "Horário",
          "Contato",
          "Confirmar",
        ].map((item, index) => (
          <div key={item} className="min-w-0">
            <div
              className={[
                "h-1.5 rounded-full transition",
                index === 0 ||
                (index === 1 && serviceId) ||
                (index === 2 && barberId && data) ||
                (index === 3 && selectionReady) ||
                (index === 4 &&
                  selectionReady &&
                  (!precisaDados || authenticated))
                  ? "bg-[var(--tenant-accent)]"
                  : "bg-[var(--border)]",
              ].join(" ")}
            />

            <p className="mt-1 hidden truncate text-[10px] font-bold text-[var(--text-muted)] sm:block">
              {item}
            </p>
          </div>
        ))}
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
              {servico.name} ·{" "}
              {formatarMoeda(
                Number(servico.price),
              )}{" "}
              · {servico.duration_minutes} min
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
            {barbeirosDoServico.map(
              (barber) => (
                <option
                  key={barber.id}
                  value={barber.id}
                >
                  {barber.name}
                </option>
              ),
            )}
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
            disabled={
              semBarbeiroParaServico
            }
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

      {precisaDados && (
        <div className="ui-booking-step rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_12px_35px_rgba(68,48,26,0.05)] sm:p-5">
          <StepHeader
            step="Etapa 4"
            title={
              authenticated
                ? "Complete seus dados"
                : "Como podemos identificar sua reserva?"
            }
            icon={Contact}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="full_name">
                Nome
              </Label>

              <Input
                id="full_name"
                name="full_name"
                defaultValue={
                  initialContact?.name ?? ""
                }
                autoComplete="name"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">
                WhatsApp / telefone
              </Label>

              <Input
                id="phone"
                name="phone"
                defaultValue={
                  initialContact?.phone ?? ""
                }
                autoComplete="tel"
                inputMode="tel"
                placeholder="(83) 99999-9999"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                E-mail
              </Label>

              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={
                  initialContact?.email ?? ""
                }
                autoComplete="email"
                placeholder="Opcional"
              />
            </div>
          </div>

          {!authenticated && (
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[var(--text-muted)]">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--tenant-accent)]" />
              Você não precisa criar conta para reservar. O telefone identifica
              sua reserva e o e-mail é opcional.
            </p>
          )}
        </div>
      )}

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

      <div className="rounded-3xl border border-[var(--border)] bg-[#252623] p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--tenant-accent)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>

          <div>
            <p className="font-extrabold">
              {authenticated
                ? "Tudo pronto para confirmar"
                : "Reserve sem criar conta"}
            </p>

            <p className="mt-1 text-sm leading-6 text-white/65">
              {authenticated
                ? profileComplete
                  ? "Revise suas escolhas e confirme o horário."
                  : "Seus dados serão salvos na sua conta junto com a reserva."
                : "Após confirmar, exibiremos um código da reserva. Guarde esse código junto com o telefone informado."}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <BotaoConfirmar
            disabled={!selectionReady}
          />
        </div>
      </div>
    </ActionForm>
  );
}

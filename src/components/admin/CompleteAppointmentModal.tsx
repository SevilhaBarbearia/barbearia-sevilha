"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  WalletCards,
} from "lucide-react";

import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Select,
} from "@/components/ui/Input";
import { completeAppointmentWithPayment } from "@/features/appointments/admin-actions";
import { formatarMoeda } from "@/lib/utils";

type CompletionState = {
  ok: boolean;
  mensagem: string;
};

const initialState: CompletionState = {
  ok: false,
  mensagem: "",
};

export function CompleteAppointmentModal({
  slug,
  appointmentId,
  customerName,
  serviceName,
  amount,
  triggerLabel = "Concluir atendimento",
}: {
  slug: string;
  appointmentId: string;
  customerName: string;
  serviceName: string;
  amount: number;
  triggerLabel?: string;
}) {
  const [open, setOpen] =
    useState(false);

  const router =
    useRouter();

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    async (
      _previous:
        CompletionState,
      formData: FormData,
    ): Promise<CompletionState> =>
      completeAppointmentWithPayment(
        formData,
      ),
    initialState,
  );

  useEffect(() => {
    if (!state.ok) return;

    router.refresh();

    const timer = window.setTimeout(
      () => setOpen(false),
      900,
    );

    return () =>
      window.clearTimeout(timer);
  }, [router, state.ok]);

  return (
    <>
      <Button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="w-full"
      >
        <CheckCircle2 className="h-4 w-4" />
        {triggerLabel}
      </Button>

      <AdminModal
        open={open}
        onClose={() =>
          !pending &&
          setOpen(false)
        }
        title="Concluir atendimento"
        description="A conclusão e o pagamento serão gravados juntos. Se uma etapa falhar, nenhuma alteração é salva."
        size="md"
      >
        <form
          action={formAction}
          className="grid gap-5"
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

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-300">
              Atendimento
            </p>

            <p className="mt-2 font-extrabold text-white">
              {customerName}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {serviceName}
            </p>
          </div>

          <div>
            <Label>
              Valor recebido
            </Label>

            <Input
              name="amount"
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              defaultValue={amount.toFixed(
                2,
              )}
              required
            />

            <p className="mt-2 text-xs text-slate-400">
              Valor esperado:{" "}
              {formatarMoeda(
                amount,
              )}
            </p>
          </div>

          <div>
            <Label>
              Meio de pagamento
            </Label>

            <Select
              name="method"
              defaultValue="pix"
              required
            >
              <option value="pix">
                Pix
              </option>

              <option value="cartao_credito">
                Cartão de crédito
              </option>

              <option value="cartao_debito">
                Cartão de débito
              </option>

              <option value="dinheiro">
                Dinheiro
              </option>

              <option value="outro">
                Outro
              </option>
            </Select>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm leading-6 text-emerald-100">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              Ao confirmar, a
              reserva ficará como
              <strong>
                {" "}
                Concluída
              </strong>{" "}
              e o pagamento como
              <strong>
                {" "}
                Pago
              </strong>
              .
            </span>
          </div>

          {state.mensagem && (
            <div
              role="status"
              className={[
                "rounded-2xl border px-4 py-3 text-sm font-semibold",
                state.ok
                  ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
                  : "border-red-400/20 bg-red-400/[0.08] text-red-100",
              ].join(" ")}
            >
              {state.mensagem}
            </div>
          )}

          <Button
            disabled={pending}
            className="w-full"
          >
            <CreditCard className="h-4 w-4" />

            {pending
              ? "Concluindo..."
              : "Confirmar pagamento e concluir"}
          </Button>
        </form>
      </AdminModal>
    </>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  abrirSessaoSuporte,
  type ActionResult,
} from "@/features/platform/tenant-actions";

const initial: ActionResult = { ok: false, mensagem: "" };

const SCOPES: Array<{ value: string; label: string }> = [
  { value: "schedule_read", label: "Agenda" },
  { value: "customer_summary_read", label: "Resumo do cliente" },
  { value: "customer_contact_read", label: "Contato do cliente" },
  { value: "payment_read", label: "Pagamentos" },
  { value: "settings_read", label: "Configuracoes" },
];

export function SupportSessionForm({
  slug,
  barbershopId,
}: {
  slug: string;
  barbershopId: string;
}) {
  const [state, action, pending] = useActionState(
    abrirSessaoSuporte,
    initial,
  );

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="barbershop_id" value={barbershopId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="sup-reason">
            Motivo (obrigatorio, min 5 caracteres)
          </Label>

          <Input
            id="sup-reason"
            name="reason"
            maxLength={500}
            required
          />
        </div>

        <div>
          <Label htmlFor="sup-ticket">Referencia do ticket (opcional)</Label>

          <Input
            id="sup-ticket"
            name="ticket_reference"
            maxLength={120}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="sup-duration">Duracao (min 5, max 30)</Label>

        <Select id="sup-duration" name="duration_minutes" defaultValue="15">
          <option value="5">5 minutos</option>
          <option value="10">10 minutos</option>
          <option value="15">15 minutos</option>
          <option value="20">20 minutos</option>
          <option value="30">30 minutos</option>
        </Select>
      </div>

      <div>
        <Label>Escopos permitidos</Label>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <label
              key={s.value}
              className="inline-flex items-center gap-2 text-sm text-white"
            >
              <input type="checkbox" name="scopes" value={s.value} />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {state?.mensagem && (
        <p
          role="alert"
          className={
            state.ok
              ? "rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100"
              : "rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
          }
        >
          {state.mensagem}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Abrindo..." : "Abrir sessao de suporte"}
        </Button>
      </div>
    </form>
  );
}

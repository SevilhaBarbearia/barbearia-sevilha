"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  alterarAssinatura,
  type ActionResult,
} from "@/features/platform/tenant-actions";

const initial: ActionResult = { ok: false, mensagem: "" };

export function SubscriptionForm({
  slug,
  barbershopId,
  currentPlanId,
  currentStatus,
  plans,
}: {
  slug: string;
  barbershopId: string;
  currentPlanId: string;
  currentStatus: string;
  plans: Array<{ id: string; code: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    alterarAssinatura,
    initial,
  );

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="barbershop_id" value={barbershopId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="plan_id">Plano</Label>

          <Select id="plan_id" name="plan_id" defaultValue={currentPlanId}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>

          <Select id="status" name="status" defaultValue={currentStatus}>
            <option value="trial">Trial</option>
            <option value="active">Ativo</option>
            <option value="past_due">Em atraso</option>
            <option value="suspended">Suspenso</option>
            <option value="canceled">Cancelado</option>
            <option value="expired">Expirado</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="reason">
          Motivo (obrigatorio para suspender/cancelar)
        </Label>

        <Input id="reason" name="reason" maxLength={500} />
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
          {pending ? "Salvando..." : "Salvar assinatura"}
        </Button>
      </div>
    </form>
  );
}

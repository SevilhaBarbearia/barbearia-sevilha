"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  alterarUiVersion,
  type ActionResult,
} from "@/features/platform/tenant-actions";

const initial: ActionResult = { ok: false, mensagem: "" };

export function UiVersionForm({
  slug,
  barbershopId,
  currentVersion,
}: {
  slug: string;
  barbershopId: string;
  currentVersion: "legacy" | "warm-premium";
}) {
  const [state, action, pending] = useActionState(alterarUiVersion, initial);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="barbershop_id" value={barbershopId} />

      <div>
        <Label>Versao visual</Label>

        <div className="mt-2 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="ui_version"
              value="warm-premium"
              defaultChecked={currentVersion === "warm-premium"}
            />
            warm-premium
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="ui_version"
              value="legacy"
              defaultChecked={currentVersion === "legacy"}
            />
            legacy
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="ui-reason">Motivo (opcional)</Label>

        <Input id="ui-reason" name="reason" maxLength={500} />
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
          {pending ? "Trocando..." : "Trocar versao"}
        </Button>
      </div>
    </form>
  );
}

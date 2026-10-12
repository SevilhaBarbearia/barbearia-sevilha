"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import {
  definirFeature,
  limparOverrideFeature,
  type ActionResult,
} from "@/features/platform/tenant-actions";

const initial: ActionResult = { ok: false, mensagem: "" };

export function FeatureToggleForm({
  slug,
  barbershopId,
  featureCode,
  effectiveEnabled,
  hasOverride,
}: {
  slug: string;
  barbershopId: string;
  featureCode: string;
  effectiveEnabled: boolean;
  hasOverride: boolean;
}) {
  const [setState, setAction, setPending] = useActionState(
    definirFeature,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    limparOverrideFeature,
    initial,
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <form action={setAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="barbershop_id" value={barbershopId} />
        <input type="hidden" name="feature_code" value={featureCode} />
        <input
          type="hidden"
          name="enabled"
          value={effectiveEnabled ? "false" : "true"}
        />

        <Button type="submit" disabled={setPending}>
          {setPending
            ? "..."
            : effectiveEnabled
              ? "Desativar"
              : "Ativar"}
        </Button>
      </form>

      {hasOverride && (
        <form action={clearAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="barbershop_id" value={barbershopId} />
          <input type="hidden" name="feature_code" value={featureCode} />

          <Button type="submit" disabled={clearPending}>
            {clearPending ? "..." : "Voltar ao padrao do plano"}
          </Button>
        </form>
      )}

      {(setState?.mensagem || clearState?.mensagem) && (
        <span
          className={
            setState?.ok || clearState?.ok
              ? "text-xs text-emerald-200"
              : "text-xs text-red-200"
          }
        >
          {setState?.mensagem || clearState?.mensagem}
        </span>
      )}
    </div>
  );
}

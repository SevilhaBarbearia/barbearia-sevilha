"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import {
  encerrarSessaoSuporte,
  type ActionResult,
} from "@/features/platform/tenant-actions";

const initial: ActionResult = { ok: false, mensagem: "" };

export function CloseSupportSessionButton({
  slug,
  sessionId,
}: {
  slug: string;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    encerrarSessaoSuporte,
    initial,
  );

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="session_id" value={sessionId} />

      <Button type="submit" disabled={pending}>
        {pending ? "..." : "Encerrar"}
      </Button>

      {state?.mensagem && (
        <span
          className={
            state.ok ? "text-xs text-emerald-200" : "text-xs text-red-200"
          }
        >
          {state.mensagem}
        </span>
      )}
    </form>
  );
}

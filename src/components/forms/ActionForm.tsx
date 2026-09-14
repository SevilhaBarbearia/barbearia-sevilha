"use client";

import { useActionState, type ComponentProps, type ReactNode } from "react";

type State = { ok: boolean; mensagem: string };
type Props = Omit<ComponentProps<"form">, "action" | "children"> & {
  action: (data: FormData) => unknown | Promise<unknown>;
  children: ReactNode;
};

export function ActionForm({ action, children, ...props }: Props) {
  const [state, submit, pending] = useActionState(
    async (_previous: State, data: FormData): Promise<State> => {
      const result = await action(data);
      if (result && typeof result === "object" && "mensagem" in result) {
        return {
          ok: "ok" in result && result.ok === true,
          mensagem: String(result.mensagem),
        };
      }
      return { ok: true, mensagem: "" };
    },
    { ok: false, mensagem: "" },
  );
  return (
    <form {...props} action={submit}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {pending && (
        <p role="status" className="text-sm text-zinc-300">
          Salvando...
        </p>
      )}
      {state.mensagem && (
        <p
          role="status"
          className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}
        >
          {state.mensagem}
        </p>
      )}
    </form>
  );
}

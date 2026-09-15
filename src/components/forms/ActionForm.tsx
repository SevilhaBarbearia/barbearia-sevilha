"use client";

import {
  useActionState,
  type ComponentProps,
  type ReactNode,
} from "react";

type State = {
  ok: boolean;
  mensagem: string;
};

type Props = Omit<
  ComponentProps<"form">,
  "action" | "children"
> & {
  action: (
    data: FormData,
  ) =>
    | unknown
    | Promise<unknown>;
  children: ReactNode;
};

export function ActionForm({
  action,
  children,
  ...props
}: Props) {
  const [
    state,
    submit,
    pending,
  ] = useActionState(
    async (
      _previous: State,
      data: FormData,
    ): Promise<State> => {
      const result =
        await action(data);

      if (
        result &&
        typeof result ===
          "object" &&
        "mensagem" in result
      ) {
        return {
          ok:
            "ok" in result &&
            result.ok === true,

          mensagem: String(
            result.mensagem,
          ),
        };
      }

      return {
        ok: true,
        mensagem: "",
      };
    },
    {
      ok: false,
      mensagem: "",
    },
  );

  return (
    <form
      {...props}
      action={submit}
    >
      <fieldset
        disabled={pending}
        className="contents"
      >
        {children}
      </fieldset>

      {pending && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--tenant-accent)] border-r-transparent" />
          Processando...
        </p>
      )}

      {state.mensagem && (
        <p
          role="status"
          className={[
            "mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {state.mensagem}
        </p>
      )}
    </form>
  );
}

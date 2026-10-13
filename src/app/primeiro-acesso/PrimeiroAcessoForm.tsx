"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  definirSenhaEOEntrar,
  type PrimeiroAcessoState,
} from "@/features/platform/primeiro-acesso-actions";

export function PrimeiroAcessoForm({
  slug,
  email,
}: {
  slug: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<PrimeiroAcessoState, FormData>(
    definirSenhaEOEntrar,
    null,
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const refPassword = useRef<HTMLInputElement>(null);
  const refConfirm = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && !state.ok && state.campo) {
      const map = { password: refPassword, confirm: refConfirm } as const;
      map[state.campo]?.current?.focus();
    }
  }, [state]);

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-300/20";
  const labelClass =
    "mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />

      <div>
        <p className="text-xs text-slate-500">Convite para</p>
        <p className="mt-1 font-mono text-sm text-slate-200">{email}</p>
      </div>

      <div>
        <label htmlFor="pa-password" className={labelClass}>
          Nova senha
        </label>
        <input
          ref={refPassword}
          id="pa-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={1024}
          required
          className={inputClass}
        />
        <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
          Mínimo 8 caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="pa-confirm" className={labelClass}>
          Confirmar senha
        </label>
        <input
          ref={refConfirm}
          id="pa-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          maxLength={1024}
          required
          className={inputClass}
        />
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
        >
          {state.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-amber-300 text-sm font-extrabold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Definir senha e entrar"}
      </button>
    </form>
  );
}

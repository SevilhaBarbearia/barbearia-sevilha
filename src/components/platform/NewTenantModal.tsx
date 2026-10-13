"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";

import {
  createBarbershop,
  type CreateBarbershopState,
} from "@/features/platform/actions";

export function NewTenantModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-extrabold text-black transition hover:bg-amber-200"
      >
        <Building2 className="h-4 w-4" />
        Nova barbearia
      </button>

      {open && <ModalContent onClose={() => setOpen(false)} />}
    </>
  );
}

function ModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    CreateBarbershopState | null,
    FormData
  >(createBarbershop, null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const refName = useRef<HTMLInputElement>(null);
  const refSlug = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && !state.ok && state.campo) {
      const map = { name: refName, slug: refSlug, owner_email: refEmail } as const;
      map[state.campo as keyof typeof map]?.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      const t = setTimeout(onClose, 1600);
      return () => clearTimeout(t);
    }
  }, [state, router, onClose]);

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-300/20";
  const labelClass =
    "mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[1.5rem] border border-white/10 bg-[#1B2939] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.5)] sm:p-7">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              Nova barbearia
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              A conta do proprietário precisa existir no Supabase Auth antes.
              Novos tenants recebem trial de 15 dias.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !pending && onClose()}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form action={action} className="grid gap-4">
          <div>
            <label htmlFor="nt-name" className={labelClass}>Nome</label>
            <input
              ref={refName}
              id="nt-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Barbearia Imperial"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="nt-slug" className={labelClass}>Slug</label>
            <input
              ref={refSlug}
              id="nt-slug"
              name="slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
              }
              required
              maxLength={60}
              placeholder="barbearia-imperial"
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
              Letras minúsculas, números e hífens. É o endereço público da
              barbearia.
            </p>
          </div>

          <div>
            <label htmlFor="nt-email" className={labelClass}>
              E-mail do proprietário
            </label>
            <input
              ref={refEmail}
              id="nt-email"
              name="owner_email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              maxLength={254}
              placeholder="dono@barbearia.com"
              className={inputClass}
            />
          </div>

          {state && state.mensagem && (
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

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => !pending && onClose()}
              disabled={pending}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-extrabold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Criando..." : "Criar barbearia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

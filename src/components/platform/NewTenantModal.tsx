"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Copy, ExternalLink, X } from "lucide-react";

import {
  createTenantWithInvite,
  type CreateTenantWithInviteState,
} from "@/features/platform/actions";

export function NewTenantModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-extrabold text-black transition hover:bg-amber-200 sm:px-5"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span>Nova barbearia</span>
      </button>

      {open && <ModalContent onClose={() => setOpen(false)} />}
    </>
  );
}

function ModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    CreateTenantWithInviteState | null,
    FormData
  >(createTenantWithInvite, null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [copied, setCopied] = useState("");

  const refName = useRef<HTMLInputElement>(null);
  const refSlug = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && !state.ok && state.campo) {
      const map = {
        name: refName,
        slug: refSlug,
        owner_email: refEmail,
      } as const;
      map[state.campo as keyof typeof map]?.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-300/20";
  const labelClass =
    "mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white sm:text-lg">
              Nova barbearia
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              O dono recebe um link de convite para criar a própria senha. Não
              existe senha temporária.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !pending && onClose()}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!state?.ok ? (
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
                  E-mail do dono
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
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                  Um e-mail só pode ser dono de uma barbearia. O dono define a
                  senha pelo link.
                </p>
              </div>

              {state && state.mensagem && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
                >
                  {state.mensagem}
                </p>
              )}

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  {pending ? "Criando..." : "Criar e gerar convite"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-100">
                {state.mensagem}
              </div>

              <LinkRow
                label="Link de convite do dono"
                hint="Válido por 24h. Envie por WhatsApp, Telegram ou SMS."
                value={state.invite_url}
                copied={copied === "invite"}
                onCopy={() => copy("invite", state.invite_url)}
              />

              <LinkRow
                label="Painel administrativo"
                hint="Endereço do dono para gerenciar a barbearia."
                value={state.admin_url}
                copied={copied === "admin"}
                onCopy={() => copy("admin", state.admin_url)}
              />

              <LinkRow
                label="Página pública"
                hint="Endereço que os clientes acessam para agendar."
                value={state.public_url}
                copied={copied === "public"}
                onCopy={() => copy("public", state.public_url)}
              />

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-extrabold text-black transition hover:bg-amber-200"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  hint,
  value,
  copied,
  onCopy,
}: {
  label: string;
  hint: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 max-h-28 overflow-y-auto break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-5 text-slate-300">
        {value}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-300/20"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>

        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-slate-500">{hint}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Search, X } from "lucide-react";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  archivedAt: string | null;
  uiVersion: string;
  createdAt: string;
  planName: string | null;
  status: string | null;
  trialEndsAt: string | null;
  membersCount: number;
  adminUrl: string;
  publicUrl: string;
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  past_due: "Em atraso",
  suspended: "Suspenso",
  canceled: "Cancelado",
  expired: "Expirado",
};

function statusClass(status: string | null) {
  if (status === "active")
    return "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200";
  if (status === "trial")
    return "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200";
  if (status === "past_due")
    return "border-amber-300/20 bg-amber-300/[0.08] text-amber-200";
  if (status === "suspended" || status === "canceled" || status === "expired")
    return "border-red-300/20 bg-red-300/[0.08] text-red-200";
  return "border-slate-400/15 bg-slate-400/[0.06] text-slate-300";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function TenantTable({ tenants }: { tenants: TenantRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [linksFor, setLinksFor] = useState<TenantRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (status !== "all" && (t.status ?? "—") !== status) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.planName ?? "").toLowerCase().includes(q)
      );
    });
  }, [tenants, query, status]);

  return (
    <>
      <div className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
        <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[1fr_200px]">
          <label className="relative">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, slug ou plano..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-300/40 focus:outline-none"
            />
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white focus:border-amber-300/40 focus:outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="trial">Trial</option>
            <option value="active">Ativo</option>
            <option value="past_due">Em atraso</option>
            <option value="suspended">Suspenso</option>
            <option value="canceled">Cancelado</option>
            <option value="expired">Expirado</option>
          </select>
        </div>

        <p className="px-4 pt-3 text-xs text-slate-500">
          {filtered.length} de {tenants.length} barbearias
        </p>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                <th className="px-4 py-3">Barbearia</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Membros</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.06] transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500">
                      /{t.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {t.planName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass(
                        t.status,
                      )}`}
                    >
                      {STATUS_LABELS[t.status ?? ""] ?? t.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.membersCount}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setLinksFor(t)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Links
                      </button>
                      <Link
                        href={`/plataforma/${t.slug}`}
                        className="rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-300/15"
                      >
                        Abrir
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Nenhuma barbearia encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 lg:hidden">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-white">{t.name}</div>
                  <div className="mt-0.5 truncate font-mono text-xs text-slate-500">
                    /{t.slug}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass(
                    t.status,
                  )}`}
                >
                  {STATUS_LABELS[t.status ?? ""] ?? t.status ?? "—"}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setLinksFor(t)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Links
                </button>
                <Link
                  href={`/plataforma/${t.slug}`}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-300/[0.06] text-xs font-bold text-amber-200 transition hover:bg-amber-300/15"
                >
                  Abrir
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
              Nenhuma barbearia encontrada.
            </div>
          )}
        </div>
      </div>

      {linksFor && (
        <LinksModal tenant={linksFor} onClose={() => setLinksFor(null)} />
      )}
    </>
  );
}

function LinksModal({
  tenant,
  onClose,
}: {
  tenant: TenantRow;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState("");

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white">
              Links da barbearia
            </h2>
            <p className="mt-1 truncate text-xs text-slate-400">
              {tenant.name} · /{tenant.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-4">
            <LinkField
              label="Painel administrativo"
              hint="Endereço do dono para gerenciar a barbearia."
              value={tenant.adminUrl}
              copied={copied === "admin"}
              onCopy={() => copy("admin", tenant.adminUrl)}
            />

            <LinkField
              label="Página pública"
              hint="Endereço que os clientes acessam para agendar."
              value={tenant.publicUrl}
              copied={copied === "public"}
              onCopy={() => copy("public", tenant.publicUrl)}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-extrabold text-black transition hover:bg-amber-200"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkField({
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

      <div className="mt-2 max-h-24 overflow-y-auto break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-5 text-slate-300">
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

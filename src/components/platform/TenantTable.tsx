"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
};

const STATUS_LABELS: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  past_due: "Em atraso",
  suspended: "Suspenso",
  canceled: "Cancelado",
  expired: "Expirado",
};

function statusClass(status: string | null, isActive: boolean) {
  if (status === "active") return "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200";
  if (status === "trial") return "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200";
  if (status === "past_due") return "border-amber-300/20 bg-amber-300/[0.08] text-amber-200";
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
    <div className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
      <div className="grid gap-3 border-b border-white/10 p-4 lg:grid-cols-[1fr_200px]">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
              <th className="px-4 py-3">Barbearia</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Membros</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3 text-right">Ação</th>
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
                  {t.archivedAt && (
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-red-300">
                      Arquivado
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {t.planName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${statusClass(
                      t.status,
                      t.isActive,
                    )}`}
                  >
                    {STATUS_LABELS[t.status ?? ""] ?? t.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{t.membersCount}</td>
                <td className="px-4 py-3 text-slate-400">
                  {formatDate(t.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/plataforma/${t.slug}`}
                    className="rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-300/15"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma barbearia encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

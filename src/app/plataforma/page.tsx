import { Building2, CircleDot, Clock, TrendingUp } from "lucide-react";

import { PlatformShell } from "@/components/platform/PlatformShell";
import { KpiCard } from "@/components/platform/KpiCard";
import { NewTenantModal } from "@/components/platform/NewTenantModal";
import { TenantTable, type TenantRow } from "@/components/platform/TenantTable";
import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const [shopsResult, membersResult] = await Promise.all([
    supabase
      .from("barbershops")
      .select(
        `
          id, name, slug, is_active, archived_at, ui_version, created_at,
          subscriptions (
            status, trial_ends_at,
            plans ( name )
          )
        `,
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("barbershop_members")
      .select("barbershop_id")
      .eq("is_active", true),
  ]);

  const membersByShop = new Map<string, number>();
  for (const row of membersResult.data ?? []) {
    membersByShop.set(
      row.barbershop_id,
      (membersByShop.get(row.barbershop_id) ?? 0) + 1,
    );
  }

  const tenants: TenantRow[] = (shopsResult.data ?? []).map((shop) => {
    const sub = Array.isArray(shop.subscriptions)
      ? shop.subscriptions[0]
      : shop.subscriptions;
    const plan = Array.isArray(sub?.plans) ? sub?.plans[0] : sub?.plans;

    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      isActive: shop.is_active,
      archivedAt: shop.archived_at,
      uiVersion: shop.ui_version,
      createdAt: shop.created_at,
      planName: plan?.name ?? null,
      status: sub?.status ?? null,
      trialEndsAt: sub?.trial_ends_at ?? null,
      membersCount: membersByShop.get(shop.id) ?? 0,
    };
  });

  const naoArquivados = tenants.filter((t) => !t.archivedAt).length;
  const ativos = tenants.filter(
    (t) => t.status === "active" && !t.archivedAt,
  ).length;
  const emTrial = tenants.filter((t) => t.status === "trial").length;
  const suspensos = tenants.filter((t) => t.status === "suspended").length;

  return (
    <PlatformShell current="tenants">
      <div className="grid gap-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
              Visão geral
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Barbearias
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Gerencie tenants, planos, funcionalidades e sessões de suporte.
            </p>
          </div>

          <NewTenantModal />
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total" value={naoArquivados} detail="Cadastradas no sistema" icon={Building2} tone="amber" />
          <KpiCard label="Ativos" value={ativos} detail="Com assinatura em dia" icon={CircleDot} tone="emerald" />
          <KpiCard label="Em trial" value={emTrial} detail="Em período de teste" icon={Clock} tone="cyan" />
          <KpiCard label="Suspensos" value={suspensos} detail="Requerem atenção" icon={TrendingUp} tone="red" />
        </section>

        <TenantTable tenants={tenants} />
      </div>
    </PlatformShell>
  );
}

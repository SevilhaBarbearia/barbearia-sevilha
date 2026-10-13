import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PlatformShell } from "@/components/platform/PlatformShell";
import { CloseSupportSessionButton } from "@/components/platform/CloseSupportSessionButton";
import { FeatureToggleForm } from "@/components/platform/FeatureToggleForm";
import { SubscriptionForm } from "@/components/platform/SubscriptionForm";
import { SupportSessionForm } from "@/components/platform/SupportSessionForm";
import { UiVersionForm } from "@/components/platform/UiVersionForm";
import { EditTenantForm } from "@/components/platform/EditTenantForm";
import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

type FeatureRow = { id: string; code: string; name: string; description: string | null };

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString("pt-BR"); } catch { return value; }
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
      <header className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-extrabold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function PlatformTenantPage({ params }: { params: Params }) {
  await requirePlatformAdmin();
  const { slug } = await params;
  const supabase = await createClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select(
      `id, name, slug, is_active, ui_version, created_at, archived_at, archive_reason, logo_url,
       organizations (id, name),
       subscriptions (id, status, trial_started_at, trial_ends_at, activated_at,
                      suspended_at, canceled_at, suspension_reason, cancellation_reason,
                      plan_id, plans (id, code, name))`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!barbershop) notFound();

  const sub = Array.isArray(barbershop.subscriptions)
    ? barbershop.subscriptions[0]
    : barbershop.subscriptions;
  const plan = Array.isArray(sub?.plans) ? sub?.plans[0] : sub?.plans;
  const org = Array.isArray(barbershop.organizations)
    ? barbershop.organizations[0]
    : barbershop.organizations;

  const { data: businessSettings } = await supabase
    .from("business_settings")
    .select("email, logo_url")
    .eq("barbershop_id", barbershop.id)
    .maybeSingle();

  const [
    { data: features },
    { data: overrides },
    { data: planFeatures },
    { data: audits },
    { data: sessions },
    { data: plans },
  ] = await Promise.all([
    supabase.from("platform_features").select("id, code, name, description").eq("is_active", true).order("code"),
    supabase.from("barbershop_feature_overrides").select("feature_id, enabled").eq("barbershop_id", barbershop.id),
    sub?.plan_id
      ? supabase.from("plan_features").select("feature_id, enabled").eq("plan_id", sub.plan_id)
      : Promise.resolve({ data: [] as Array<{ feature_id: string; enabled: boolean }> }),
    supabase
      .from("platform_audit_logs")
      .select("id, action, entity_type, entity_id, actor_email_snapshot, reason, created_at")
      .eq("barbershop_id", barbershop.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("platform_support_sessions")
      .select("id, reason, scopes, expires_at, closed_at, closed_reason, created_at")
      .eq("barbershop_id", barbershop.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("plans").select("id, code, name").eq("is_active", true).order("name"),
  ]);

  const overrideById = new Map((overrides ?? []).map((o) => [o.feature_id, o]));
  const planById = new Map((planFeatures ?? []).map((p) => [p.feature_id, p]));
  const featureViews = (features ?? []).map((f: FeatureRow) => {
    const o = overrideById.get(f.id);
    const p = planById.get(f.id);
    if (o) return { ...f, effective: o.enabled, source: "override" as const };
    if (p) return { ...f, effective: p.enabled, source: "plano" as const };
    return { ...f, effective: false, source: "ausente" as const };
  });

  const now = new Date().toISOString();
  const activeSessions = (sessions ?? []).filter((s) => !s.closed_at && s.expires_at > now);
  const pastSessions = (sessions ?? []).filter((s) => s.closed_at || s.expires_at <= now);

  return (
    <PlatformShell current="tenants">
      <div className="grid gap-6">
        <header>
          <Link
            href="/plataforma"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-amber-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para barbearias
          </Link>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-300">
                {org?.name ?? "Sem organização"}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {barbershop.name}
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500">
                /{barbershop.slug} · criada em {fmt(barbershop.created_at)}
              </p>
            </div>
            {barbershop.archived_at && (
              <span className="rounded-full border border-red-300/20 bg-red-300/[0.08] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-red-200">
                Arquivada em {fmt(barbershop.archived_at)}
              </span>
            )}
          </div>
        </header>

        <Section
          title="Dados cadastrais"
          description="Nome, slug, e-mail de contato e logo do tenant."
        >
          <EditTenantForm
            slug={barbershop.slug}
            barbershopId={barbershop.id}
            initialName={barbershop.name}
            initialSlug={barbershop.slug}
            initialEmail={(businessSettings as { email?: string | null } | null)?.email ?? ""}
            initialLogoUrl={(businessSettings as { logo_url?: string | null } | null)?.logo_url ?? barbershop.logo_url ?? ""}
          />
        </Section>

        <Section title="Comercial" description="Plano, status e ciclo de vida da assinatura.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Plano atual</dt>
              <dd className="mt-1 text-white">{plan ? `${plan.name} (${plan.code})` : "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Status</dt>
              <dd className="mt-1 text-white">{sub?.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Trial</dt>
              <dd className="mt-1 text-slate-300">{fmt(sub?.trial_started_at)} → {fmt(sub?.trial_ends_at)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Suspenso / Cancelado</dt>
              <dd className="mt-1 text-slate-300">{fmt(sub?.suspended_at)} / {fmt(sub?.canceled_at)}</dd>
            </div>
          </dl>

          {sub && plans && plans.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <SubscriptionForm
                slug={barbershop.slug}
                barbershopId={barbershop.id}
                currentPlanId={sub.plan_id}
                currentStatus={sub.status}
                plans={plans}
              />
            </div>
          )}
        </Section>

        <Section title="Versão visual" description="Rollback individual de UI. Só visual — não altera regras nem dados.">
          <p className="mb-4 text-sm">
            Atual:{" "}
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-200">
              {barbershop.ui_version}
            </span>
          </p>
          <UiVersionForm
            slug={barbershop.slug}
            barbershopId={barbershop.id}
            currentVersion={barbershop.ui_version}
          />
        </Section>

        <Section title="Funcionalidades" description="Override por tenant tem precedência sobre o plano.">
          <div className="grid gap-2">
            {featureViews.map((f) => (
              <div key={f.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{f.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">{f.code}</div>
                    {f.description && (
                      <div className="mt-1 text-xs text-slate-400">{f.description}</div>
                    )}
                  </div>
                  <div className="text-right text-[10px] font-bold uppercase tracking-[0.08em]">
                    <div className={f.effective ? "text-emerald-300" : "text-slate-500"}>
                      {f.effective ? "Ativa" : "Inativa"}
                    </div>
                    <div className="mt-0.5 text-slate-600">fonte: {f.source}</div>
                  </div>
                </div>
                <FeatureToggleForm
                  slug={barbershop.slug}
                  barbershopId={barbershop.id}
                  featureCode={f.code}
                  effectiveEnabled={f.effective}
                  hasOverride={f.source === "override"}
                />
              </div>
            ))}
            {featureViews.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma feature cadastrada.</p>
            )}
          </div>
        </Section>

        <Section title="Sessão de suporte" description="Acesso temporário, escopado e auditado.">
          {activeSessions.length > 0 && (
            <div className="mb-5 grid gap-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Ativas</div>
              {activeSessions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm">
                  <div>
                    <div className="text-white">{s.reason}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {s.scopes.join(", ")} · expira {fmt(s.expires_at)}
                    </div>
                  </div>
                  <CloseSupportSessionButton slug={barbershop.slug} sessionId={s.id} />
                </div>
              ))}
            </div>
          )}

          <SupportSessionForm slug={barbershop.slug} barbershopId={barbershop.id} />

          {pastSessions.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Histórico recente</div>
              <ul className="mt-2 grid gap-1 text-xs text-slate-400">
                {pastSessions.map((s) => (
                  <li key={s.id}>
                    {fmt(s.created_at)} · {s.reason} · expirou {fmt(s.expires_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Auditoria recente" description="Últimos 20 eventos registrados pela plataforma.">
          <ul className="grid gap-2 text-xs">
            {(audits ?? []).map((a) => (
              <li key={a.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white">{a.action}</span>
                  <span className="text-slate-500">{fmt(a.created_at)}</span>
                </div>
                <div className="mt-1 text-slate-400">
                  {a.entity_type}
                  {a.entity_id ? ` · ${a.entity_id}` : ""}
                  {a.actor_email_snapshot ? ` · por ${a.actor_email_snapshot}` : ""}
                </div>
                {a.reason && <div className="mt-1 text-slate-300">"{a.reason}"</div>}
              </li>
            ))}
            {(!audits || audits.length === 0) && (
              <li className="text-slate-500">Nenhum evento registrado ainda.</li>
            )}
          </ul>
        </Section>
      </div>
    </PlatformShell>
  );
}

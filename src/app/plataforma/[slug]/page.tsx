import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CloseSupportSessionButton } from "@/components/platform/CloseSupportSessionButton";
import { FeatureToggleForm } from "@/components/platform/FeatureToggleForm";
import { SubscriptionForm } from "@/components/platform/SubscriptionForm";
import { SupportSessionForm } from "@/components/platform/SupportSessionForm";
import { UiVersionForm } from "@/components/platform/UiVersionForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tenant | Plataforma",
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string }>;

type FeatureRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default async function PlatformTenantPage({
  params,
}: {
  params: Params;
}) {
  await requirePlatformAdmin();

  const { slug } = await params;
  const supabase = await createClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select(
      `
        id, name, slug, is_active, ui_version, created_at,
        archived_at, archive_reason,
        organizations (id, name),
        subscriptions (
          id, status, trial_started_at, trial_ends_at,
          activated_at, suspended_at, canceled_at,
          suspension_reason, cancellation_reason,
          plan_id,
          plans (id, code, name)
        )
      `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!barbershop) notFound();

  const subscription = Array.isArray(barbershop.subscriptions)
    ? barbershop.subscriptions[0]
    : barbershop.subscriptions;

  const plan = Array.isArray(subscription?.plans)
    ? subscription?.plans[0]
    : subscription?.plans;

  const [
    { data: features },
    { data: overrides },
    { data: planFeatures },
    { data: audits },
    { data: sessions },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from("platform_features")
      .select("id, code, name, description")
      .eq("is_active", true)
      .order("code"),

    supabase
      .from("barbershop_feature_overrides")
      .select("feature_id, enabled, reason, updated_at")
      .eq("barbershop_id", barbershop.id),

    subscription?.plan_id
      ? supabase
          .from("plan_features")
          .select("feature_id, enabled")
          .eq("plan_id", subscription.plan_id)
      : Promise.resolve({ data: [] as Array<{ feature_id: string; enabled: boolean }> }),

    supabase
      .from("platform_audit_logs")
      .select(
        "id, action, entity_type, entity_id, actor_email_snapshot, reason, created_at, metadata",
      )
      .eq("barbershop_id", barbershop.id)
      .order("created_at", { ascending: false })
      .limit(30),

    supabase
      .from("platform_support_sessions")
      .select(
        "id, reason, scopes, expires_at, closed_at, closed_reason, created_at",
      )
      .eq("barbershop_id", barbershop.id)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("plans")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const overridesByFeature = new Map(
    (overrides ?? []).map((o) => [o.feature_id, o]),
  );
  const planFeaturesByFeature = new Map(
    (planFeatures ?? []).map((p) => [p.feature_id, p]),
  );

  type FeatureView = FeatureRow & {
    effective: boolean;
    source: "override" | "plano" | "ausente";
    overrideEnabled: boolean | null;
  };

  const featureViews: FeatureView[] = (features ?? []).map((f) => {
    const override = overridesByFeature.get(f.id);
    const planFeature = planFeaturesByFeature.get(f.id);

    if (override) {
      return {
        ...f,
        effective: override.enabled,
        source: "override",
        overrideEnabled: override.enabled,
      };
    }
    if (planFeature) {
      return {
        ...f,
        effective: planFeature.enabled,
        source: "plano",
        overrideEnabled: null,
      };
    }
    return {
      ...f,
      effective: false,
      source: "ausente",
      overrideEnabled: null,
    };
  });

  const nowIso = new Date().toISOString();
  const sessoesAtivas = (sessions ?? []).filter(
    (s) => !s.closed_at && s.expires_at > nowIso,
  );
  const sessoesHistorico = (sessions ?? []).filter(
    (s) => s.closed_at || s.expires_at <= nowIso,
  );

  return (
    <main className="fundo-premium min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div>
          <Link
            href="/plataforma"
            className="text-sm text-zinc-300 hover:text-white"
          >
            ← Voltar para a plataforma
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-white">
              {barbershop.name}
            </h1>
            <p className="text-sm text-zinc-300">
              /{barbershop.slug} •{" "}
              {barbershop.organizations?.name ?? "sem organizacao"}
            </p>
          </div>

          <div className="text-right text-xs text-zinc-400">
            <div>Criado em {formatDate(barbershop.created_at)}</div>
            {barbershop.archived_at && (
              <div className="text-red-300">
                Arquivado em {formatDate(barbershop.archived_at)}
              </div>
            )}
          </div>
        </div>

        {/* Comercial */}
        <Card>
          <CardTitle>Comercial</CardTitle>

          <CardDescription>
            Plano, status e ciclo de vida da assinatura.
          </CardDescription>

          <dl className="mt-4 grid gap-2 text-sm text-zinc-200 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-60">
                Plano atual
              </dt>
              <dd>{plan ? `${plan.name} (${plan.code})` : "sem plano"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-60">
                Status
              </dt>
              <dd>{subscription?.status ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-60">
                Trial
              </dt>
              <dd>
                {formatDate(subscription?.trial_started_at)} →{" "}
                {formatDate(subscription?.trial_ends_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide opacity-60">
                Suspenso / Cancelado
              </dt>
              <dd>
                {formatDate(subscription?.suspended_at)} /{" "}
                {formatDate(subscription?.canceled_at)}
              </dd>
            </div>
            {subscription?.suspension_reason && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Motivo da suspensao
                </dt>
                <dd>{subscription.suspension_reason}</dd>
              </div>
            )}
            {subscription?.cancellation_reason && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  Motivo do cancelamento
                </dt>
                <dd>{subscription.cancellation_reason}</dd>
              </div>
            )}
          </dl>

          {subscription && plans && plans.length > 0 && (
            <SubscriptionForm
              slug={barbershop.slug}
              barbershopId={barbershop.id}
              currentPlanId={subscription.plan_id}
              currentStatus={subscription.status}
              plans={plans}
            />
          )}
        </Card>

        {/* UI Version */}
        <Card>
          <CardTitle>Versao visual</CardTitle>

          <CardDescription>
            Rollback individual da UI do tenant. Somente visual — nao altera
            regras de negocio, RLS, reservas ou correcoes de seguranca.
          </CardDescription>

          <p className="mt-3 text-sm text-zinc-200">
            Atual:{" "}
            <span className="font-bold text-white">
              {barbershop.ui_version}
            </span>
          </p>

          <UiVersionForm
            slug={barbershop.slug}
            barbershopId={barbershop.id}
            currentVersion={barbershop.ui_version}
          />
        </Card>

        {/* Features */}
        <Card>
          <CardTitle>Funcionalidades</CardTitle>

          <CardDescription>
            Override por tenant tem precedencia sobre o plano. Sem override
            nem plano, a feature fica ausente (nunca inventa numero).
          </CardDescription>

          <div className="mt-4 grid gap-3">
            {featureViews.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {f.name}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-zinc-400">
                      {f.code}
                    </div>
                    {f.description && (
                      <div className="mt-1 text-xs text-zinc-400">
                        {f.description}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs">
                    <div
                      className={
                        f.effective
                          ? "text-emerald-300"
                          : "text-zinc-400"
                      }
                    >
                      {f.effective ? "Ativa" : "Inativa"}
                    </div>
                    <div className="text-zinc-500">
                      fonte: {f.source}
                    </div>
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
              <p className="text-sm text-zinc-400">
                Nenhuma feature cadastrada.
              </p>
            )}
          </div>
        </Card>

        {/* Sessao de suporte */}
        <Card>
          <CardTitle>Sessao de suporte</CardTitle>

          <CardDescription>
            Acesso temporario, escopado e auditado. Nao vira owner/manager do
            tenant e nao da acesso operacional irrestrito.
          </CardDescription>

          {sessoesAtivas.length > 0 && (
            <div className="mt-4 grid gap-2">
              <div className="text-xs uppercase tracking-wide text-zinc-400">
                Ativas
              </div>

              {sessoesAtivas.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm"
                >
                  <div>
                    <div className="text-white">{s.reason}</div>
                    <div className="text-xs text-zinc-400">
                      {s.scopes.join(", ")} · expira{" "}
                      {formatDate(s.expires_at)}
                    </div>
                  </div>

                  <CloseSupportSessionButton
                    slug={barbershop.slug}
                    sessionId={s.id}
                  />
                </div>
              ))}
            </div>
          )}

          <SupportSessionForm
            slug={barbershop.slug}
            barbershopId={barbershop.id}
          />

          {sessoesHistorico.length > 0 && (
            <div className="mt-6">
              <div className="text-xs uppercase tracking-wide text-zinc-400">
                Historico recente
              </div>

              <ul className="mt-2 grid gap-1 text-xs text-zinc-400">
                {sessoesHistorico.map((s) => (
                  <li key={s.id}>
                    {formatDate(s.created_at)} · {s.reason} · expirou{" "}
                    {formatDate(s.expires_at)}
                    {s.closed_reason ? ` · ${s.closed_reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Auditoria */}
        <Card>
          <CardTitle>Auditoria recente</CardTitle>

          <CardDescription>
            Ultimos 30 eventos registrados pela plataforma neste tenant.
          </CardDescription>

          <ul className="mt-4 grid gap-2 text-xs">
            {(audits ?? []).map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white">{a.action}</span>
                  <span className="text-zinc-500">
                    {formatDate(a.created_at)}
                  </span>
                </div>

                <div className="mt-1 text-zinc-400">
                  {a.entity_type}
                  {a.entity_id ? ` · ${a.entity_id}` : ""}
                  {a.actor_email_snapshot
                    ? ` · por ${a.actor_email_snapshot}`
                    : ""}
                </div>

                {a.reason && (
                  <div className="mt-1 text-zinc-300">"{a.reason}"</div>
                )}
              </li>
            ))}

            {(!audits || audits.length === 0) && (
              <li className="text-zinc-400">
                Nenhum evento registrado ainda.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}

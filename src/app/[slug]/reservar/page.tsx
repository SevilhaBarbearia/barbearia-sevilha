import {
  CalendarCheck,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import { ReservaForm } from "@/components/forms/ReservaForm";
import { NavPublica } from "@/components/layout/NavPublica";
import { Badge } from "@/components/ui/Badge";
import { requireBarbershop } from "@/features/tenancy/server";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function firstParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const barbershop =
    await requireBarbershop(slug);

  const { user, profile } =
    await obterUsuarioAtual();

  const supabase =
    await createClient();

  const [
    { data: services },
    { data: barbers },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("barbers")
      .select(
        "*, barber_services(service_id, is_active)",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("business_settings")
      .select(
        "business_name,logo_url",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .maybeSingle(),
  ]);

  const brandName =
    settings?.business_name ||
    barbershop.name;

  const logoUrl =
    settings?.logo_url ||
    barbershop.logo_url;

  const profileComplete = Boolean(
    profile?.phone &&
      profile.full_name,
  );

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica
        slug={barbershop.slug}
        name={brandName}
        logoUrl={logoUrl}
      />

      <section className="ui-barber-ambient">
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr] lg:items-start">
            <div>
              <Badge>
                <CalendarCheck className="h-3.5 w-3.5" />
                Reserva guiada
              </Badge>

              <h1 className="ui-h1 mt-5 font-extrabold text-[var(--text)]">
                Escolha seu horário
              </h1>

              <p className="ui-body mt-3 max-w-2xl text-[var(--text-muted)]">
                Escolha serviço, profissional, data e horário. Não é necessário
                ter conta Google para fazer uma reserva.
              </p>
            </div>

            <div className="hidden rounded-3xl border border-[var(--border)] bg-white/90 p-5 shadow-[0_14px_38px_rgba(68,48,26,0.07)] lg:block">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tenant-accent)]" />

                <div>
                  <p className="font-extrabold text-[var(--text)]">
                    Reserva simples
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Para reservar sem conta, basta informar nome e telefone.
                    O e-mail é opcional.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--tenant-accent)]" />
                  Sem login obrigatório
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--tenant-accent)]" />
                  Conflitos continuam protegidos
                </span>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-[2rem] border border-[var(--border)] bg-white/88 p-4 shadow-[0_22px_65px_rgba(68,48,26,0.09)] backdrop-blur-sm sm:p-6 lg:p-8">
            <ReservaForm
              slug={barbershop.slug}
              services={services ?? []}
              barbers={barbers ?? []}
              authenticated={Boolean(user)}
              profileComplete={profileComplete}
              initialContact={{
                name:
                  profile?.full_name ??
                  user?.user_metadata?.name ??
                  "",
                phone: profile?.phone ?? "",
                email:
                  profile?.email ??
                  user?.email ??
                  "",
              }}
              initialSelection={{
                serviceId:
                  firstParam(query.service),
                barberId:
                  firstParam(query.barber),
                date:
                  firstParam(query.date),
                startAt:
                  firstParam(query.start),
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

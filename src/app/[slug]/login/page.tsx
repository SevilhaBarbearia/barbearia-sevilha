import {
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { LoginGoogleButton } from "@/components/forms/LoginGoogleButton";
import { ButtonLink } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { isGoogleAuthEnabled } from "@/lib/auth/provider-settings";
import { createClient } from "@/lib/supabase/server";

function safeInternalPath(
  value: string | undefined,
  fallback: string,
) {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\x00-\x1f]/.test(value)
  ) {
    return value;
  }

  return fallback;
}

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
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

  const requestedNext =
    safeInternalPath(
      firstParam(query.next),
      `/${barbershop.slug}/reservar`,
    );

  const { user, profile } =
    await obterUsuarioAtual();

  if (
    user &&
    profile?.phone &&
    profile.full_name
  ) {
    redirect(requestedNext);
  }

  if (user) {
    redirect(
      `/${barbershop.slug}/completar-cadastro?next=${encodeURIComponent(
        requestedNext,
      )}`,
    );
  }

  const supabase =
    await createClient();

  const [
    { data: settings },
    googleEnabled,
  ] = await Promise.all([
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
    isGoogleAuthEnabled(),
  ]);

  const brandName =
    settings?.business_name ||
    barbershop.name;

  const logoUrl =
    settings?.logo_url ||
    barbershop.logo_url;

  return (
    <main className="ui-barber-ambient fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="ui-public-brand-panel rounded-[1.5rem] border p-4">
          <Logo
            href={`/${barbershop.slug}`}
            name={brandName}
            logoUrl={logoUrl}
            publicSurface
          />
        </div>

        <Card className="mt-5">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
            <LockKeyhole className="h-5 w-5" />
          </div>

          <CardTitle>
            Minha conta
          </CardTitle>

          <CardDescription>
            Entrar é opcional para reservar. A conta serve para acompanhar
            horários, histórico e fidelidade.
          </CardDescription>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[#FAF8F4] p-4 text-sm leading-6 text-[var(--text-muted)]">
            <span className="flex items-start gap-2">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--tenant-accent)]" />
              Você pode voltar para a reserva agora e confirmar apenas com nome
              e telefone.
            </span>
          </div>

          {googleEnabled ? (
            <div className="mt-6">
              <LoginGoogleButton
                slug={barbershop.slug}
                next={requestedNext}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              O acesso com Google não está habilitado neste ambiente. Isso não
              impede uma reserva sem conta.
            </div>
          )}

          <ButtonLink
            href={`/${barbershop.slug}/reservar`}
            variant="secondary"
            className="mt-4 w-full"
          >
            Reservar sem conta
          </ButtonLink>
        </Card>
      </div>
    </main>
  );
}

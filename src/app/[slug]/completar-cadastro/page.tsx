import {
  UserRoundCheck,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { CompletarCadastroForm } from "@/components/forms/CompletarCadastroForm";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";
import { exigirUsuario } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

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

function safeInternalPath(
  value: string | undefined,
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

  return undefined;
}

export default async function CompletarCadastroPage({
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

  const { user, profile } =
    await exigirUsuario(slug);

  const supabase =
    await createClient();

  const { data: settings } =
    await supabase
      .from("business_settings")
      .select(
        "business_name,logo_url",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .maybeSingle();

  const brandName =
    settings?.business_name ||
    barbershop.name;

  const logoUrl =
    settings?.logo_url ||
    barbershop.logo_url;

  const next =
    safeInternalPath(
      firstParam(query.next),
    );

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
            <UserRoundCheck className="h-5 w-5" />
          </div>

          <CardTitle>
            Complete seu cadastro
          </CardTitle>

          <CardDescription>
            É a última etapa antes de confirmar seu horário em {brandName}.
          </CardDescription>

          <div className="mt-7">
            <CompletarCadastroForm
              slug={barbershop.slug}
              nome={
                profile?.full_name ??
                user.user_metadata?.name
              }
              email={
                profile?.email ??
                user.email
              }
              next={next}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { PlatformBrand } from "@/components/brand/PlatformBrand";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { getBarbershopBySlug } from "@/features/tenancy/server";
import { obterAdministradorAtual } from "@/lib/auth/permissoes";

export const metadata: Metadata = {
  title:
    "Administração | Agendamento online",
  robots: {
    index: false,
    follow: false,
  },
};

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

function safeAdminNext(
  value: string | undefined,
) {
  if (
    value &&
    /^\/admin\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9/_-]*)?$/.test(
      value,
    ) &&
    !value.includes("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return "/admin";
}

function slugFromNext(
  next: string,
) {
  const match =
    next.match(
      /^\/admin\/([a-z0-9]+(?:-[a-z0-9]+)*)/,
    );

  return match?.[1] ?? null;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}) {
  const query =
    await searchParams;

  const next =
    safeAdminNext(
      firstParam(query.next),
    );

  const admin =
    await obterAdministradorAtual();

  if (admin) {
    redirect(next);
  }

  const tenantSlug =
    slugFromNext(next);

  const barbershop =
    tenantSlug
      ? await getBarbershopBySlug(
          tenantSlug,
        )
      : null;

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          {barbershop ? (
            <Logo
              href={`/${barbershop.slug}`}
              name={barbershop.name}
              logoUrl={
                barbershop.logo_url
              }
            />
          ) : (
            <div className="text-white">
              <PlatformBrand />
            </div>
          )}
        </div>

        <Card className="mt-5">
          <CardTitle>
            Administração
          </CardTitle>

          <CardDescription>
            {barbershop
              ? `Acesse o painel administrativo da ${barbershop.name}.`
              : "Entre com sua conta administrativa. O sistema abrirá somente as barbearias vinculadas à sua conta."}
          </CardDescription>

          <AdminLoginForm
            next={next}
          />
        </Card>

        <Link
          href={
            barbershop
              ? `/${barbershop.slug}`
              : "/"
          }
          className="mt-6 block text-center text-sm text-zinc-300"
        >
          Voltar para o site
        </Link>
      </div>
    </main>
  );
}

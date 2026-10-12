import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformBrand } from "@/components/brand/PlatformBrand";
import { PlatformLoginForm } from "@/components/forms/PlatformLoginForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { obterPlatformAdminAtual } from "@/lib/auth/platform-permissoes";

export const metadata: Metadata = {
  title: "Plataforma | Agendamento online",
  robots: {
    index: false,
    follow: false,
  },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safePlatformNext(value: string | undefined) {
  if (
    value &&
    /^\/plataforma(?:\/[a-z0-9/_-]*)?$/.test(value) &&
    !value.includes("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return "/plataforma";
}

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const query = await searchParams;
  const next = safePlatformNext(firstParam(query.next));

  const admin = await obterPlatformAdminAtual();

  if (admin) {
    redirect(next);
  }

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="text-white">
            <PlatformBrand />
          </div>
        </div>

        <Card className="mt-5">
          <CardTitle>Plataforma</CardTitle>

          <CardDescription>
            Acesso restrito a administracao central. Este login e
            independente do painel da barbearia e nao concede acesso
            operacional a nenhum tenant.
          </CardDescription>

          <PlatformLoginForm next={next} />
        </Card>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-zinc-300"
        >
          Voltar para o site
        </Link>
      </div>
    </main>
  );
}

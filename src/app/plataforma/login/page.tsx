import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { PlatformLoginForm } from "@/components/forms/PlatformLoginForm";
import { obterPlatformAdminAtual } from "@/lib/auth/platform-permissoes";

export const metadata: Metadata = {
  title: "Plataforma | Agendamento online",
  robots: { index: false, follow: false },
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = safePlatformNext(firstParam(query.next));

  const admin = await obterPlatformAdminAtual();
  if (admin) redirect(next);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0D1621] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-300">
            <Shield className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-amber-300">
              Console central
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
              Plataforma
            </h1>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-7">
          <p className="text-sm leading-6 text-slate-400">
            Acesso restrito à administração central. Este login é
            independente do painel da barbearia e não concede acesso
            operacional a nenhum tenant.
          </p>

          <PlatformLoginForm next={next} />
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-xs font-semibold text-slate-500 transition hover:text-amber-200"
        >
          Voltar para o site
        </Link>
      </div>
    </main>
  );
}

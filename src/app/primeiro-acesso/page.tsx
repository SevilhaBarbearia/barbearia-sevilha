import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PrimeiroAcessoForm } from "./PrimeiroAcessoForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Definir senha | Agendamento online",
  robots: { index: false, follow: false },
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PrimeiroAcessoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const slug = (firstParam(query.slug) ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0F0F11] px-4 py-10">
        <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#18181B] p-7 text-center">
          <h1 className="text-lg font-extrabold text-white">
            Link expirado ou inválido
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Este link de convite já foi usado, expirou ou não é válido. Peça um
            novo link ao administrador da plataforma.
          </p>
        </div>
      </main>
    );
  }

  if (!slug) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0F0F11] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-300">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-amber-300">
              Primeiro acesso
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
              Defina sua senha
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-400">
            Você foi convidado para administrar uma barbearia na plataforma.
            Escolha uma senha para acessar o painel.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-[#18181B] p-6 sm:p-7">
          <PrimeiroAcessoForm slug={slug} email={user.email ?? ""} />
        </div>
      </div>
    </main>
  );
}

import {
  LockKeyhole,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

export default function AdminTenantNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0D1621] px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#172231] p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
          <LockKeyhole className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-2xl font-black">
          Painel indisponível
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          A barbearia não existe ou sua conta não possui acesso administrativo
          a este tenant.
        </p>

        <ButtonLink
          href="/admin"
          className="mt-6"
        >
          Voltar para administração
        </ButtonLink>
      </section>
    </main>
  );
}

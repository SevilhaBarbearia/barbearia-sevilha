import {
  Scissors,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

export default function TenantNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F3EC] px-4 py-10">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#E5D9C5] bg-white/95 p-7 text-center shadow-[0_24px_70px_rgba(85,62,32,0.10)]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#E5C98F] bg-[#FBF3E2] text-[#B88323]">
          <Scissors className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-2xl font-black text-[#24221E]">
          Página não encontrada
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#756E64]">
          O endereço pode estar incorreto ou esta barbearia não está disponível.
        </p>

        <ButtonLink
          href="/"
          className="mt-6"
        >
          Voltar para a plataforma
        </ButtonLink>
      </section>
    </main>
  );
}

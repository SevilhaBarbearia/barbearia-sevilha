import {
  Scissors,
} from "lucide-react";

export default function TenantLoading() {
  return (
    <main
      className="grid min-h-[70vh] place-items-center bg-[#F7F3EC] px-4 py-12"
      role="status"
      aria-live="polite"
      aria-label="Carregando página"
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-[#E5D9C5] bg-white/90 p-7 text-center shadow-[0_24px_70px_rgba(85,62,32,0.10)] backdrop-blur">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#E5C98F] bg-[#FBF3E2] shadow-[0_0_0_10px_rgba(214,166,60,0.06)]">
          <Scissors
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-[#B88323] motion-reduce:animate-none"
          />
        </div>

        <h2 className="mt-6 text-lg font-extrabold text-[#24221E]">
          Preparando sua tela
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#756E64]">
          Estamos carregando os
          dados da barbearia.
        </p>

        <div
          className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-[#EEE7DC]"
          aria-hidden="true"
        >
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[#D6A63C] motion-reduce:animate-none" />
        </div>
      </div>

      <span className="sr-only">
        Carregando conteúdo...
      </span>
    </main>
  );
}
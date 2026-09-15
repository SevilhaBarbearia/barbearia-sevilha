import {
  Scissors,
} from "lucide-react";

export default function AdminTenantLoading() {
  return (
    <div
      className="grid min-h-[60vh] place-items-center"
      aria-label="Carregando administração"
      aria-live="polite"
      role="status"
    >
      <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-[#172231] p-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-amber-300/20 bg-amber-300/[0.08] shadow-[0_0_0_10px_rgba(253,230,138,0.03)]">
          <Scissors
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-amber-300 motion-reduce:animate-none"
          />
        </div>

        <h2 className="mt-6 text-lg font-extrabold text-white">
          Carregando administração
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Atualizando os dados
          da barbearia.
        </p>

        <div
          className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-white/[0.07]"
          aria-hidden="true"
        >
          <div className="h-full w-2/3 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" />
        </div>
      </div>

      <span className="sr-only">
        Carregando dados...
      </span>
    </div>
  );
}
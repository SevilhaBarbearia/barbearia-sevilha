"use client";

import {
  useEffect,
} from "react";
import {
  Home,
  RotateCcw,
  Scissors,
  TriangleAlert,
} from "lucide-react";

import {
  Button,
  ButtonLink,
} from "@/components/ui/Button";

type RouteError = Error & {
  digest?: string;
};

export function RouteErrorState({
  error,
  reset,
  homeHref,
  admin = false,
}: {
  error: RouteError;
  reset: () => void;
  homeHref: string;
  admin?: boolean;
}) {
  useEffect(() => {
    /*
     * Eu não exponho a mensagem técnica na interface.
     * No console registro apenas informações não sensíveis para
     * facilitar a correlação com os logs do servidor/Vercel.
     */
    console.error(
      "[route-error]",
      {
        name:
          error.name,
        digest:
          error.digest ??
          null,
      },
    );
  }, [error]);

  const panelClass =
    admin
      ? "border-white/10 bg-[#172231] text-white shadow-[0_30px_100px_rgba(0,0,0,0.32)]"
      : "border-[#E5D9C5] bg-white/95 text-[#24221E] shadow-[0_24px_70px_rgba(85,62,32,0.12)]";

  const mutedClass =
    admin
      ? "text-slate-400"
      : "text-[#756E64]";

  const iconClass =
    admin
      ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-300"
      : "border-[#E5C98F] bg-[#FBF3E2] text-[#B88323]";

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-10">
      <section
        className={`w-full max-w-lg rounded-[2rem] border p-6 text-center sm:p-8 ${panelClass}`}
        role="alert"
      >
        <div
          className={`mx-auto grid h-20 w-20 place-items-center rounded-full border ${iconClass}`}
        >
          <span className="relative">
            <Scissors
              aria-hidden="true"
              className="h-8 w-8"
            />

            <TriangleAlert
              aria-hidden="true"
              className="absolute -bottom-2 -right-3 h-4 w-4"
            />
          </span>
        </div>

        <h1 className="mt-6 text-xl font-black">
          Não foi possível abrir esta tela
        </h1>

        <p className={`mt-3 text-sm leading-6 ${mutedClass}`}>
          Seus dados não foram apagados. Tente carregar novamente e, se o
          problema continuar, consulte os logs da aplicação.
        </p>

        {error.digest && (
          <p className={`mt-3 font-mono text-[11px] ${mutedClass}`}>
            Referência: {error.digest}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            onClick={reset}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </Button>

          <ButtonLink
            href={homeHref}
            variant="secondary"
            className="w-full"
          >
            <Home className="h-4 w-4" />
            Voltar
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

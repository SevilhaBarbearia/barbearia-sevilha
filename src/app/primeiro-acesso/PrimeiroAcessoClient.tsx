"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PrimeiroAcessoForm } from "./PrimeiroAcessoForm";

type State =
  | { status: "loading" }
  | { status: "ready"; email: string; slug: string }
  | { status: "sem-convite" }
  | { status: "erro"; mensagem: string };

export function PrimeiroAcessoClient() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();

    async function run() {
      if (typeof window !== "undefined" && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const error_code = params.get("error_code");
        const error_desc = params.get("error_description");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          window.history.replaceState(null, "", window.location.pathname);
          if (error) {
            setState({ status: "erro", mensagem: error.message });
            return;
          }
        } else if (error_code) {
          setState({
            status: "erro",
            mensagem:
              error_desc ??
              "Este link de convite já foi usado ou expirou. Peça um novo.",
          });
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setState({
          status: "erro",
          mensagem:
            "Não foi possível reconhecer este link. Ele pode ter expirado ou já ter sido usado.",
        });
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from("barbershop_members")
        .select("barbershop_id, barbershops!inner(slug)")
        .eq("profile_id", user.id)
        .eq("role", "owner")
        .eq("is_active", true)
        .maybeSingle();

      if (memberError) {
        setState({ status: "erro", mensagem: memberError.message });
        return;
      }

      const barbershop = Array.isArray(member?.barbershops)
        ? member?.barbershops[0]
        : member?.barbershops;

      if (!barbershop?.slug) {
        setState({ status: "sem-convite" });
        return;
      }

      setState({ status: "ready", email: user.email, slug: barbershop.slug });
    }

    void run();
  }, []);

  if (state.status === "loading") {
    return (
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#18181B] p-7 text-center">
        <p className="text-sm text-slate-400">Verificando seu convite...</p>
      </div>
    );
  }

  if (state.status === "erro") {
    return (
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#18181B] p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-red-300/25 bg-red-300/10 text-red-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-extrabold text-white">
          Link inválido ou expirado
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{state.mensagem}</p>
      </div>
    );
  }

  if (state.status === "sem-convite") {
    return (
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#18181B] p-7 text-center">
        <h1 className="text-lg font-extrabold text-white">
          Nenhum convite ativo
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sua conta não está vinculada a uma barbearia como dono. Peça um novo
          link ao administrador da plataforma.
        </p>
      </div>
    );
  }

  return (
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
          Escolha uma senha para acessar o painel da sua barbearia.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-[#18181B] p-6 sm:p-7">
        <PrimeiroAcessoForm slug={state.slug} email={state.email} />
      </div>
    </div>
  );
}

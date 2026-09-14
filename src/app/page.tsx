import Link from "next/link";
import {
  CalendarCheck,
  Scissors,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { PlatformBrand } from "@/components/brand/PlatformBrand";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F6F3ED] text-[#1F201D]">
      <header className="border-b border-[#DED8CE] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <PlatformBrand />

          <Link
            href="/admin/login"
            className="rounded-full border border-[#DED8CE] bg-white px-4 py-2 text-sm font-bold transition hover:border-[#B8873F]"
          >
            Administração
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-78px)] max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#B8873F]/25 bg-[#B8873F]/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#805B2A]">
            <Scissors className="h-4 w-4" />
            Agendamento online
          </span>

          <h1 className="mt-6 max-w-3xl text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[0.96] tracking-[-0.055em]">
            Uma experiência simples para reservar seu próximo horário.
          </h1>

          <p className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.15rem)] leading-8 text-[#6B675F]">
            Cada barbearia possui sua própria identidade, serviços,
            profissionais e agenda.
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6B675F]">
            Para realizar uma reserva, acesse o link público da sua barbearia.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-[#DED8CE] bg-white p-6 shadow-[0_24px_70px_rgba(68,48,26,0.10)]">
            <CalendarCheck className="h-7 w-7 text-[#B8873F]" />
            <h2 className="mt-5 text-xl font-extrabold">Reserva rápida</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B675F]">
              Serviço, profissional, data e horário em um fluxo direto.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-[#DED8CE] bg-[#ECE7DE] p-5">
              <Smartphone className="h-6 w-6 text-[#805B2A]" />
              <p className="mt-4 font-extrabold">Mobile-first</p>
            </div>

            <div className="rounded-[1.75rem] border border-[#DED8CE] bg-[#252623] p-5 text-white">
              <ShieldCheck className="h-6 w-6 text-[#D9B679]" />
              <p className="mt-4 font-extrabold">
                Dados isolados por barbearia
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

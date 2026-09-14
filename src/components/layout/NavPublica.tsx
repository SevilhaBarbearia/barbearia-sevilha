import Link from "next/link";
import { CalendarCheck, UserRound } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";

export function NavPublica({
  slug,
  name,
  logoUrl,
}: {
  slug: string;
  name: string;
  logoUrl?: string | null;
}) {
  const base = `/${slug}`;

  return (
    <header className="ui-nav-publica sticky top-0 z-40 border-b border-white/10 bg-zinc-950/78 shadow-lg shadow-black/20 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-2.5 sm:px-6 sm:py-3">
        <Logo href={base} name={name} logoUrl={logoUrl} />

        <div className="ui-nav-menu hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 text-sm font-semibold text-zinc-300 md:flex">
          <Link
            href={`${base}#servicos`}
            className="ui-nav-link rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            Serviços
          </Link>
          <Link
            href={`${base}#barbeiros`}
            className="ui-nav-link rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            Barbeiros
          </Link>
          <Link
            href={`${base}#contato`}
            className="ui-nav-link rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            Contato
          </Link>
          <Link
            href={`${base}/cliente/agendamentos`}
            className="ui-nav-link inline-flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            <UserRound className="h-4 w-4" />
            Minha conta
          </Link>
        </div>

        <ButtonLink href={`${base}/reservar`} className="shrink-0">
          <CalendarCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Reservar agora</span>
          <span className="sm:hidden">Reservar</span>
        </ButtonLink>
      </nav>
    </header>
  );
}

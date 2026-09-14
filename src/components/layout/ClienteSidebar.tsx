import Link from "next/link";
import {
  CalendarCheck,
  ClipboardClock,
  History,
  UserRound,
} from "lucide-react";

export function ClienteSidebar({ slug = "sevilha" }: { slug?: string }) {
  const base = `/${slug}`;
  const links = [
    {
      label: "Meus agendamentos",
      href: `${base}/cliente/agendamentos`,
      icon: ClipboardClock,
    },
    {
      label: "Novo agendamento",
      href: `${base}/reservar`,
      icon: CalendarCheck,
    },
    {
      label: "Fidelidade",
      href: `${base}/cliente/fidelidade`,
      icon: CalendarCheck,
    },
    { label: "Perfil", href: `${base}/cliente/perfil`, icon: UserRound },
    { label: "Histórico", href: `${base}/cliente/historico`, icon: History },
  ];
  return (
    <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 shadow-premium backdrop-blur-xl md:w-80">
      <p className="mb-4 px-2 text-lg font-black text-white">Área do Cliente</p>
      <nav className="grid gap-2">
        {links.map(({ label, href, icon: Icone }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-brand-500/10 hover:text-white"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg lg:h-9 lg:w-9 lg:rounded-xl bg-white/[0.06] text-brand-100">
              <Icone className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

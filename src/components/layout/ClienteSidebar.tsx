import Link from "next/link";
import {
  CalendarCheck,
  ClipboardClock,
  Gift,
  History,
  UserRound,
} from "lucide-react";

export function ClienteSidebar({
  slug,
}: {
  slug: string;
}) {
  const base = `/${slug}`;

  const links = [
    {
      label:
        "Meus agendamentos",
      href: `${base}/cliente/agendamentos`,
      icon: ClipboardClock,
    },
    {
      label:
        "Novo agendamento",
      href: `${base}/reservar`,
      icon: CalendarCheck,
    },
    {
      label: "Fidelidade",
      href: `${base}/cliente/fidelidade`,
      icon: Gift,
    },
    {
      label: "Perfil",
      href: `${base}/cliente/perfil`,
      icon: UserRound,
    },
    {
      label: "Histórico",
      href: `${base}/cliente/historico`,
      icon: History,
    },
  ];

  return (
    <aside className="ui-client-sidebar overflow-hidden rounded-[1.75rem] border p-3 md:sticky md:top-24 md:w-72 lg:w-80">
      <p className="ui-client-sidebar-title mb-3 px-3 pt-2 text-lg font-extrabold">
        Minha conta
      </p>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible">
        {links.map(
          ({
            label,
            href,
            icon: Icone,
          }) => (
            <Link
              key={href}
              href={href}
              className="ui-client-sidebar-link inline-flex shrink-0 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold transition hover:border-[var(--border)] md:w-full"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
                <Icone className="h-4 w-4" />
              </span>

              {label}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}

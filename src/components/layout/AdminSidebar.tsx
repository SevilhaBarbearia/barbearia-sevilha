import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageSquareText,
  Scissors,
  Settings,
  TrendingUp,
  UsersRound,
  ClipboardList,
  Home,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { sairAdministrador } from "@/lib/auth/admin-actions";

export function AdminSidebar({
  slug,
  name,
  logoUrl,
}: {
  slug: string;
  name: string;
  logoUrl?: string | null;
}) {
  const base = `/admin/${slug}`;

  const links = [
    { label: "Dashboard", href: base, icon: LayoutDashboard },
    { label: "Agenda do dia", href: `${base}/agenda`, icon: CalendarDays },
    { label: "Reservas", href: `${base}/reservas`, icon: ClipboardList },
    { label: "Serviços", href: `${base}/servicos`, icon: Scissors },
    { label: "Barbeiros", href: `${base}/barbeiros`, icon: UsersRound },
    { label: "Horários", href: `${base}/horarios`, icon: Clock3 },
    { label: "Fidelidade", href: `${base}/fidelidade`, icon: Gift },
    {
      label: "Satisfação",
      href: `${base}/satisfacao`,
      icon: MessageSquareText,
    },
    { label: "Pagamentos", href: `${base}/pagamentos`, icon: CreditCard },
    { label: "Faturamento", href: `${base}/faturamento`, icon: TrendingUp },
    { label: "Configurações", href: `${base}/configuracoes`, icon: Settings },
  ];

  return (
    <aside className="ui-admin-sidebar border-b border-white/10 bg-zinc-950/88 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:sticky md:top-0 md:min-h-screen md:w-72 md:border-b-0 md:border-r md:p-4 lg:w-80 lg:p-6">
      <div className="mb-6 flex items-center justify-between gap-3 md:block">
        <Logo href={base} name={name} logoUrl={logoUrl} />

        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white sm:mt-5 md:mt-4"
        >
          <Home className="h-4 w-4" />
          Site
        </Link>
      </div>

      <div className="mb-3 hidden px-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-500 md:block">
        Gestão
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
        {links.map(({ label, href, icon: Icone }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-white/0 px-3 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-white sm:text-sm md:w-full lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-brand-100 lg:h-9 lg:w-9 lg:rounded-xl">
              <Icone className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <ActionForm action={sairAdministrador} className="mt-6">
        <Button type="submit" variant="secondary" className="w-full">
          Sair da administração
        </Button>
      </ActionForm>
    </aside>
  );
}

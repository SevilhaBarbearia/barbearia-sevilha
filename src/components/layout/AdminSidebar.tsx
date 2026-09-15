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

import { AdminNav } from "@/components/admin/AdminNav";
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
    {
      label: "Dashboard",
      href: base,
      icon: LayoutDashboard,
    },
    {
      label: "Agenda do dia",
      href: `${base}/agenda`,
      icon: CalendarDays,
    },
    {
      label: "Reservas",
      href: `${base}/reservas`,
      icon: ClipboardList,
    },
    {
      label: "Serviços",
      href: `${base}/servicos`,
      icon: Scissors,
    },
    {
      label: "Barbeiros",
      href: `${base}/barbeiros`,
      icon: UsersRound,
    },
    {
      label: "Horários",
      href: `${base}/horarios`,
      icon: Clock3,
    },
    {
      label: "Fidelidade",
      href: `${base}/fidelidade`,
      icon: Gift,
    },
    {
      label: "Satisfação",
      href: `${base}/satisfacao`,
      icon: MessageSquareText,
    },
    {
      label: "Pagamentos",
      href: `${base}/pagamentos`,
      icon: CreditCard,
    },
    {
      label: "Faturamento",
      href: `${base}/faturamento`,
      icon: TrendingUp,
    },
    {
      label: "Configurações",
      href: `${base}/configuracoes`,
      icon: Settings,
    },
  ];

  return (
    <aside className="ui-admin-sidebar border-b border-white/10 bg-[#111B27] p-4 shadow-[8px_0_40px_rgba(0,0,0,0.18)] md:sticky md:top-0 md:h-screen md:w-72 md:overflow-y-auto md:border-b-0 md:border-r md:p-4 lg:w-80 lg:p-5">
      <div className="mb-6 flex items-center justify-between gap-3 md:block">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <Logo
            href={base}
            name={name}
            logoUrl={logoUrl}
          />
        </div>

        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white sm:mt-5 md:mt-4"
        >
          <Home className="h-4 w-4" />
          Site
        </Link>
      </div>

      <div className="mb-3 hidden px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 md:block">
        Gestão da barbearia
      </div>

      <AdminNav links={links} />

      <ActionForm
        action={sairAdministrador}
        className="mt-6"
      >
        <input
          type="hidden"
          name="slug"
          value={slug}
        />

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
        >
          Sair da administração
        </Button>
      </ActionForm>
    </aside>
  );
}

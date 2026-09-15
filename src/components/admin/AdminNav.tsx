"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageSquareText,
  Scissors,
  Settings,
  TrendingUp,
  UsersRound,
} from "lucide-react";

export type AdminIconName =
  | "dashboard"
  | "agenda"
  | "reservas"
  | "servicos"
  | "barbeiros"
  | "horarios"
  | "fidelidade"
  | "satisfacao"
  | "pagamentos"
  | "faturamento"
  | "configuracoes";

const ICONS = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  reservas: ClipboardList,
  servicos: Scissors,
  barbeiros: UsersRound,
  horarios: Clock3,
  fidelidade: Gift,
  satisfacao: MessageSquareText,
  pagamentos: CreditCard,
  faturamento: TrendingUp,
  configuracoes: Settings,
} satisfies Record<
  AdminIconName,
  typeof LayoutDashboard
>;

export function AdminNav({
  links,
}: {
  links: Array<{
    label: string;
    href: string;
    icon: AdminIconName;
  }>;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
      {links.map(
        ({
          label,
          href,
          icon,
        }) => {
          const Icon =
            ICONS[icon];

          const active =
            pathname === href ||
            (href !== links[0]?.href &&
              pathname.startsWith(
                `${href}/`,
              ));

          return (
            <Link
              key={href}
              href={href}
              aria-current={
                active
                  ? "page"
                  : undefined
              }
              className={[
                "inline-flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition sm:text-sm md:w-full lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3",
                active
                  ? "border-amber-300/25 bg-amber-300/[0.09] text-white shadow-[inset_3px_0_0_rgba(253,230,138,0.85)]"
                  : "border-white/0 text-slate-300 hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-8 w-8 place-items-center rounded-lg border transition lg:h-9 lg:w-9 lg:rounded-xl",
                  active
                    ? "border-amber-300/20 bg-amber-300/[0.1] text-amber-300"
                    : "border-white/[0.06] bg-white/[0.04] text-slate-400",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </span>

              {label}
            </Link>
          );
        },
      )}
    </nav>
  );
}

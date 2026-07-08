import Link from 'next/link';
import { CalendarDays, Clock3, CreditCard, LayoutDashboard, Scissors, Settings, TrendingUp, UsersRound, ClipboardList, Home } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const links = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Agenda do dia', href: '/admin/agenda', icon: CalendarDays },
  { label: 'Reservas', href: '/admin/reservas', icon: ClipboardList },
  { label: 'Serviços', href: '/admin/servicos', icon: Scissors },
  { label: 'Barbeiros', href: '/admin/barbeiros', icon: UsersRound },
  { label: 'Horários', href: '/admin/horarios', icon: Clock3 },
  { label: 'Pagamentos', href: '/admin/pagamentos', icon: CreditCard },
  { label: 'Faturamento', href: '/admin/faturamento', icon: TrendingUp },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings }
];

export function AdminSidebar() {
  return (
    <aside className="border-b border-white/10 bg-zinc-950/88 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:sticky md:top-0 md:min-h-screen md:w-72 md:border-b-0 md:border-r md:p-4 lg:w-80 lg:p-6">
      <div className="mb-6 flex items-center justify-between gap-3 md:block">
        <Logo href="/admin" />
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white md:mt-4 sm:mt-5">
          <Home className="h-4 w-4" /> Site
        </Link>
      </div>

      <div className="mb-3 hidden px-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-500 md:block">Gestão</div>
      <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
        {links.map(({ label, href, icon: Icone }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-white/0 px-3 py-2.5 text-xs sm:text-sm md:w-full lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 font-bold text-zinc-300 transition hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-white "
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

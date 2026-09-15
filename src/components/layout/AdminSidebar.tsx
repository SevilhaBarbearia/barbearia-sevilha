import Link from "next/link";
import {
  Home,
} from "lucide-react";

import {
  AdminNav,
  type AdminIconName,
} from "@/components/admin/AdminNav";
import { Logo } from "@/components/brand/Logo";
import { ActionForm } from "@/components/forms/ActionForm";
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

  /*
   * IMPORTANTE:
   * AdminSidebar é Server Component e AdminNav é Client Component.
   * Portanto só enviamos dados serializáveis para o cliente.
   * Componentes/funções Lucide não podem atravessar essa fronteira.
   */
  const links: Array<{
    label: string;
    href: string;
    icon: AdminIconName;
  }> = [
    {
      label: "Dashboard",
      href: base,
      icon: "dashboard",
    },
    {
      label: "Agenda do dia",
      href: `${base}/agenda`,
      icon: "agenda",
    },
    {
      label: "Reservas",
      href: `${base}/reservas`,
      icon: "reservas",
    },
    {
      label: "Serviços",
      href: `${base}/servicos`,
      icon: "servicos",
    },
    {
      label: "Barbeiros",
      href: `${base}/barbeiros`,
      icon: "barbeiros",
    },
    {
      label: "Horários",
      href: `${base}/horarios`,
      icon: "horarios",
    },
    {
      label: "Fidelidade",
      href: `${base}/fidelidade`,
      icon: "fidelidade",
    },
    {
      label: "Satisfação",
      href: `${base}/satisfacao`,
      icon: "satisfacao",
    },
    {
      label: "Pagamentos",
      href: `${base}/pagamentos`,
      icon: "pagamentos",
    },
    {
      label: "Faturamento",
      href: `${base}/faturamento`,
      icon: "faturamento",
    },
    {
      label: "Configurações",
      href: `${base}/configuracoes`,
      icon: "configuracoes",
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

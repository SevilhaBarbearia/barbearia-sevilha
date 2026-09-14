import { ClienteSidebar } from "@/components/layout/ClienteSidebar";
import { NavPublica } from "@/components/layout/NavPublica";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { requireBarbershop } from "@/features/tenancy/server";
import { redirect } from "next/navigation";

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await obterUsuarioAtual();
  if (!user) redirect(`/${barbershop.slug}/login`);
  if (!profile?.phone || !profile.full_name)
    redirect(`/${barbershop.slug}/completar-cadastro`);

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica
        slug={barbershop.slug}
        name={barbershop.name}
        logoUrl={barbershop.logo_url}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row">
        <ClienteSidebar slug={barbershop.slug} />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";

import { ClienteSidebar } from "@/components/layout/ClienteSidebar";
import { NavPublica } from "@/components/layout/NavPublica";
import { requireBarbershop } from "@/features/tenancy/server";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const barbershop =
    await requireBarbershop(slug);

  const { user, profile } =
    await obterUsuarioAtual();

  if (!user) {
    redirect(
      `/${barbershop.slug}/login`,
    );
  }

  if (
    !profile?.phone ||
    !profile.full_name
  ) {
    redirect(
      `/${barbershop.slug}/completar-cadastro`,
    );
  }

  const supabase =
    await createClient();

  /*
   * Eu faço a associação de reservas guest no layout da área do cliente.
   *
   * Dessa forma a correção não depende de o usuário abrir primeiro
   * "Meus agendamentos". Histórico, fidelidade e as demais páginas
   * autenticadas passam pela mesma etapa de reconciliação.
   *
   * A função do banco é idempotente e só associa reservas cuja identidade
   * atende aos critérios seguros da migration 026.
   */
  const [
    { data: settings },
    { error: claimError },
  ] = await Promise.all([
    supabase
      .from("business_settings")
      .select(
        "business_name,logo_url",
      )
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .maybeSingle(),

    supabase.rpc(
      "claim_my_guest_appointments",
      {
        target_barbershop_id:
          barbershop.id,
      },
    ),
  ]);

  if (claimError) {
    /*
     * Eu não derrubo a área do cliente se a reconciliação falhar.
     * A RLS continua sendo a barreira de autorização e o erro fica
     * disponível no log do servidor para diagnóstico.
     */
    console.error(
      "[customer-layout:claim]",
      claimError.code ??
        "UNKNOWN",
      claimError.message,
    );
  }

  const brandName =
    settings?.business_name ||
    barbershop.name;

  const logoUrl =
    settings?.logo_url ||
    barbershop.logo_url;

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica
        slug={barbershop.slug}
        name={brandName}
        logoUrl={logoUrl}
      />

      <div className="ui-barber-ambient min-h-[calc(100vh-76px)]">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-9 md:flex-row md:items-start">
          <ClienteSidebar
            slug={barbershop.slug}
          />

          <section className="min-w-0 flex-1">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

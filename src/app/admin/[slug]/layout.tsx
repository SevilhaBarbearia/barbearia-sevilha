import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { getTenantUiVersion } from "@/lib/ui-rollout";

export default async function AdminTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const uiVersion = await getTenantUiVersion(barbershop.slug);

  return (
    <main
      className="fundo-premium min-h-screen"
      data-ui-version={uiVersion}
    >
      <div className="flex flex-col md:flex-row">
        <AdminSidebar
          slug={barbershop.slug}
          name={barbershop.name}
          logoUrl={barbershop.logo_url}
        />

        <section className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
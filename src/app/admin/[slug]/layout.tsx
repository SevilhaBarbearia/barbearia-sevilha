import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireBarbershopManager } from "@/features/tenancy/server";

export default async function AdminTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  /*
   * Esta validação é obrigatória em TODA rota /admin/[slug].
   * Um owner/manager de outro tenant recebe 404 antes de qualquer dado
   * administrativo ser renderizado.
   */
  const { barbershop } =
    await requireBarbershopManager(
      slug,
    );

  return (
    <main className="min-h-screen bg-[#0D1621] text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminSidebar
          slug={barbershop.slug}
          name={barbershop.name}
          logoUrl={
            barbershop.logo_url
          }
        />

        <section className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.045),transparent_26%),radial-gradient(circle_at_top_left,rgba(253,230,138,0.045),transparent_24%),#0D1621] p-4 sm:p-5 md:p-7 lg:p-8">
          <div className="mx-auto w-full max-w-[1680px]">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

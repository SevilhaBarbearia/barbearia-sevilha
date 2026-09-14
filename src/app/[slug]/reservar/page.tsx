import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { ReservaForm } from "@/components/forms/ReservaForm";
import { NavPublica } from "@/components/layout/NavPublica";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershop } from "@/features/tenancy/server";

export const dynamic = "force-dynamic";

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await obterUsuarioAtual();
  if (!user) redirect(`/${barbershop.slug}/login`);
  if (!profile?.phone || !profile.full_name)
    redirect(`/${barbershop.slug}/completar-cadastro`);

  const supabase = await createClient();
  const [{ data: services }, { data: barbers }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("barbers")
      .select("*, barber_services(service_id, is_active)")
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica
        slug={barbershop.slug}
        name={barbershop.name}
        logoUrl={barbershop.logo_url}
      />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Badge>
          <CalendarCheck className="h-3.5 w-3.5" /> Reserva guiada
        </Badge>
        <Card className="mt-5">
          <CardTitle>Nova reserva em {barbershop.name}</CardTitle>
          <CardDescription>
            Escolha serviço, profissional e um horário disponível.
          </CardDescription>
          <div className="mt-8">
            <ReservaForm
              slug={barbershop.slug}
              services={services ?? []}
              barbers={barbers ?? []}
            />
          </div>
        </Card>
      </section>
    </main>
  );
}

import { Plus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  AlternarStatusBarbeiroForm,
  BarbeiroAdminForm,
} from "@/components/forms/admin/BarbeiroAdminForm";
import { requireBarbershopManager } from "@/features/tenancy/server";
import type { Barber, BusinessHour, Service } from "@/lib/db/types";

type BarberWithServices = Barber & {
  barber_services?: Array<{ service_id: string; is_active: boolean }> | null;
};

export default async function BarbersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const [barbersResult, servicesResult, hoursResult] = await Promise.all([
    supabase
      .from("barbers")
      .select("*, barber_services(service_id, is_active)")
      .eq("barbershop_id", barbershop.id)
      .order("name"),
    supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .order("name"),
    supabase
      .from("business_hours")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .order("day_of_week"),
  ]);
  const barbers = (barbersResult.data ?? []) as BarberWithServices[];
  const services = (servicesResult.data ?? []) as Service[];
  const hours = (hoursResult.data ?? []) as BusinessHour[];
  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <UsersRound className="h-4 w-4" /> Equipe
        </Badge>
        <h1 className="mt-3 text-3xl font-black text-white">Barbeiros</h1>
      </div>
      <Card>
        <CardTitle>
          <Plus className="mr-2 inline h-5 w-5" />
          Novo barbeiro
        </CardTitle>
        <div className="mt-6">
          <BarbeiroAdminForm slug={barbershop.slug} servicos={services} />
        </div>
      </Card>
      {barbers.map((barber) => {
        const hour =
          hours.find(
            (item) => item.barber_id === barber.id && item.day_of_week === 1,
          ) ?? null;
        return (
          <Card key={barber.id}>
            <div className="flex justify-between gap-4">
              <div>
                <CardTitle>{barber.name}</CardTitle>
                <CardDescription>
                  {barber.bio || "Sem biografia."}
                </CardDescription>
              </div>
              <AlternarStatusBarbeiroForm
                slug={barbershop.slug}
                barbeiro={barber}
              />
            </div>
            <div className="mt-6">
              <BarbeiroAdminForm
                slug={barbershop.slug}
                barbeiro={barber}
                servicos={services}
                horarioPadrao={hour}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

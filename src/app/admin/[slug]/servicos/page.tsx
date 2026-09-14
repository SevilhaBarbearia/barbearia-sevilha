import { Plus, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import {
  AlternarStatusServicoForm,
  ServicoAdminForm,
} from "@/components/forms/admin/ServicoAdminForm";
import { requireBarbershopManager } from "@/features/tenancy/server";
import type { Service } from "@/lib/db/types";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("barbershop_id", barbershop.id)
    .order("is_active", { ascending: false })
    .order("name");
  const services = (data ?? []) as Service[];
  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <Scissors className="h-4 w-4" /> Catálogo
        </Badge>
        <h1 className="mt-3 text-3xl font-black text-white">Serviços</h1>
      </div>
      <Card>
        <CardTitle>
          <Plus className="mr-2 inline h-5 w-5" />
          Novo serviço
        </CardTitle>
        <div className="mt-6">
          <ServicoAdminForm slug={barbershop.slug} />
        </div>
      </Card>
      {error && (
        <Card>
          <CardDescription>{error.message}</CardDescription>
        </Card>
      )}
      {services.map((service) => (
        <Card key={service.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>
                {formatarMoeda(Number(service.price))} •{" "}
                {service.duration_minutes} minutos
              </CardDescription>
            </div>
            <AlternarStatusServicoForm
              slug={barbershop.slug}
              servico={service}
            />
          </div>
          <div className="mt-6">
            <ServicoAdminForm slug={barbershop.slug} servico={service} />
          </div>
        </Card>
      ))}
    </div>
  );
}

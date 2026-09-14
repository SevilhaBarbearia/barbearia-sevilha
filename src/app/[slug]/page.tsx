import Image from "next/image";
import {
  CalendarCheck,
  Clock3,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";
import { NavPublica } from "@/components/layout/NavPublica";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { requireBarbershop } from "@/features/tenancy/server";

export const dynamic = "force-dynamic";

export default async function BarbershopHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const supabase = await createClient();
  const [{ data: services }, { data: barbers }, { data: settings }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("price"),
      supabase
        .from("barbers")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("business_settings")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .maybeSingle(),
    ]);

  const reserveUrl = `/${barbershop.slug}/reservar`;
  const coverUrl = settings?.cover_url || barbershop.cover_url;

  return (
    <main className="fundo-premium min-h-screen overflow-hidden">
      <NavPublica
        slug={barbershop.slug}
        name={barbershop.name}
        logoUrl={settings?.logo_url || barbershop.logo_url}
      />

      <section className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <Badge>
            <Sparkles className="h-3.5 w-3.5" /> Atendimento com hora marcada
          </Badge>
          <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            {barbershop.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
            {settings?.description ||
              barbershop.description ||
              "Escolha seu serviço, profissional e horário em poucos cliques."}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href={reserveUrl}>
              <CalendarCheck className="h-4 w-4" /> Reservar agora
            </ButtonLink>
            <ButtonLink
              href={`/${barbershop.slug}#servicos`}
              variant="secondary"
            >
              <Scissors className="h-4 w-4" /> Ver serviços
            </ButtonLink>
          </div>
        </div>

        <div className="hero-vidro overflow-hidden rounded-[2rem] p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950">
            <Image
              src={coverUrl || "/hero-barbearia.svg"}
              alt={`Ambiente da ${barbershop.name}`}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Badge>
          <Scissors className="h-3.5 w-3.5" /> Serviços
        </Badge>
        <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">
          Escolha seu atendimento
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {services?.map((service) => (
            <Card key={service.id}>
              {service.image_url && (
                <div className="relative mb-4 aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={service.image_url}
                    alt={service.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{service.name}</CardTitle>
                <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-brand-100">
                  <Clock3 className="mr-1 inline h-3 w-3" />
                  {service.duration_minutes} min
                </span>
              </div>
              <CardDescription>
                {service.description ||
                  "Atendimento profissional com horário reservado."}
              </CardDescription>
              <p className="mt-5 text-2xl font-black text-brand-100">
                {formatarMoeda(Number(service.price))}
              </p>
            </Card>
          ))}
          {!services?.length && (
            <Card className="md:col-span-3">
              <CardDescription>
                Nenhum serviço disponível no momento.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      <section id="barbeiros" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Badge>
          <Star className="h-3.5 w-3.5" /> Equipe
        </Badge>
        <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">
          Profissionais disponíveis
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {barbers?.map((barber) => (
            <Card key={barber.id}>
              {barber.photo_url && (
                <div className="relative mb-4 aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={barber.photo_url}
                    alt={barber.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <CardTitle>{barber.name}</CardTitle>
              <CardDescription>
                {barber.bio || "Profissional disponível para agendamento."}
              </CardDescription>
            </Card>
          ))}
          {!barbers?.length && (
            <Card className="md:col-span-3">
              <CardDescription>
                Nenhum profissional disponível no momento.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      <section
        id="contato"
        className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6"
      >
        <Card className="grid gap-6 bg-gradient-to-br from-white/[0.09] to-brand-500/[0.08] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <CardTitle>{settings?.business_name || barbershop.name}</CardTitle>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300">
              {settings?.address && (
                <p>
                  <MapPin className="mr-2 inline h-4 w-4 text-brand-100" />
                  {settings.address}
                </p>
              )}
              {(settings?.whatsapp || settings?.phone) && (
                <p>
                  <Phone className="mr-2 inline h-4 w-4 text-brand-100" />
                  {settings.whatsapp || settings.phone}
                </p>
              )}
            </div>
          </div>
          <ButtonLink href={reserveUrl}>
            <CalendarCheck className="h-4 w-4" /> Fazer reserva
          </ButtonLink>
        </Card>
      </section>
    </main>
  );
}

import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { NavPublica } from "@/components/layout/NavPublica";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getNextAvailableSlot } from "@/features/availability/next-slot";
import { requireBarbershop } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantUiVersion } from "@/lib/ui-rollout";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HomeData = {
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number | string;
    duration_minutes: number;
    image_url: string | null;
  }>;
  barbers: Array<{
    id: string;
    name: string;
    bio: string | null;
    photo_url: string | null;
  }>;
  settings:
    | {
        business_name?: string | null;
        description?: string | null;
        address?: string | null;
        phone?: string | null;
        whatsapp?: string | null;
        instagram?: string | null;
        logo_url?: string | null;
        cover_url?: string | null;
      }
    | null;
};

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNextSlot(startAt: string, timezone: string) {
  const date = new Date(startAt);

  const day = capitalize(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      weekday: "short",
      day: "2-digit",
      month: "short",
    })
      .format(date)
      .replace(".", ""),
  );

  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return { day, time };
}

function LegacyHome({
  barbershop,
  data,
}: {
  barbershop: Awaited<ReturnType<typeof requireBarbershop>>;
  data: HomeData;
}) {
  const { services, barbers, settings } = data;
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
            <Sparkles className="h-3.5 w-3.5" />
            Atendimento com hora marcada
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
              <CalendarCheck className="h-4 w-4" />
              Reservar agora
            </ButtonLink>

            <ButtonLink
              href={`/${barbershop.slug}#servicos`}
              variant="secondary"
            >
              <Scissors className="h-4 w-4" />
              Ver serviços
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

      <section
        id="servicos"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6"
      >
        <Badge>
          <Scissors className="h-3.5 w-3.5" />
          Serviços
        </Badge>

        <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">
          Escolha seu atendimento
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {services.map((service) => (
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

          {!services.length && (
            <Card className="md:col-span-3">
              <CardDescription>
                Nenhum serviço disponível no momento.
              </CardDescription>
            </Card>
          )}
        </div>
      </section>

      <section
        id="barbeiros"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6"
      >
        <Badge>
          <Star className="h-3.5 w-3.5" />
          Equipe
        </Badge>

        <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">
          Profissionais disponíveis
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {barbers.map((barber) => (
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

          {!barbers.length && (
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
            <CalendarCheck className="h-4 w-4" />
            Fazer reserva
          </ButtonLink>
        </Card>
      </section>
    </main>
  );
}

async function WarmPremiumHome({
  barbershop,
  data,
}: {
  barbershop: Awaited<ReturnType<typeof requireBarbershop>>;
  data: HomeData;
}) {
  const { services, barbers, settings } = data;

  const reserveUrl = `/${barbershop.slug}/reservar`;
  const coverUrl = settings?.cover_url || barbershop.cover_url;
  const logoUrl = settings?.logo_url || barbershop.logo_url;

  const nextSlot = await getNextAvailableSlot({
    barbershopId: barbershop.id,
    timezone: barbershop.timezone,
  });

  const formattedNextSlot = nextSlot
    ? formatNextSlot(nextSlot.startAt, barbershop.timezone)
    : null;

  const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl}/${barbershop.slug}`
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings?.business_name || barbershop.name,
    description:
      settings?.description ||
      barbershop.description ||
      "Barbearia com agendamento online.",
    ...(publicUrl ? { url: publicUrl } : {}),
    ...(coverUrl || logoUrl ? { image: coverUrl || logoUrl } : {}),
    ...(settings?.phone || settings?.whatsapp
      ? { telephone: settings?.phone || settings?.whatsapp }
      : {}),
    ...(settings?.address ? { address: settings.address } : {}),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <NavPublica
        slug={barbershop.slug}
        name={barbershop.name}
        logoUrl={logoUrl}
      />

      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_20%_0%,var(--tenant-accent-soft),transparent_55%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-24">
          <div>
            <Badge>
              <Sparkles className="h-3.5 w-3.5" />
              Atendimento com hora marcada
            </Badge>

            <h1 className="ui-display mt-7 max-w-3xl font-extrabold text-[var(--text)]">
              Seu próximo corte começa com um horário bem escolhido.
            </h1>

            <p className="ui-body mt-6 max-w-2xl text-[var(--text-muted)]">
              {settings?.description ||
                barbershop.description ||
                `${barbershop.name}: escolha o serviço, o profissional e o melhor horário para você.`}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href={reserveUrl} className="w-full sm:w-auto">
                <CalendarCheck className="h-4 w-4" />
                Reservar horário
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>

              <ButtonLink
                href={`/${barbershop.slug}#servicos`}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <Scissors className="h-4 w-4" />
                Conhecer serviços
              </ButtonLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--tenant-accent)]" />
                Reserva online
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--tenant-accent)]" />
                Escolha seu profissional
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--tenant-accent)]" />
                Horários em tempo real
              </span>
            </div>

            <div className="mt-9 max-w-xl rounded-[1.5rem] border border-[var(--border)] bg-white p-4 shadow-[0_18px_50px_rgba(59,43,24,0.08)] sm:p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
                  <Clock3 className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Próximo horário encontrado
                  </p>

                  {nextSlot && formattedNextSlot ? (
                    <>
                      <p className="mt-1 text-lg font-extrabold text-[var(--text)]">
                        {formattedNextSlot.day}, às {formattedNextSlot.time}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {nextSlot.barberName} · {nextSlot.serviceName}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-lg font-extrabold text-[var(--text)]">
                        Consulte a agenda disponível
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Veja os horários livres para o serviço que você deseja.
                      </p>
                    </>
                  )}
                </div>

                <ButtonLink
                  href={reserveUrl}
                  variant="ghost"
                  className="hidden shrink-0 px-3 sm:inline-flex"
                >
                  Ver agenda
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--tenant-accent-soft)] blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white p-2.5 shadow-[0_32px_90px_rgba(68,48,26,0.16)] sm:p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem] bg-[#252623] sm:aspect-[5/4] lg:aspect-[4/5]">
                <Image
                  src={coverUrl || "/hero-barbearia.svg"}
                  alt={`Ambiente da ${barbershop.name}`}
                  fill
                  className="object-cover"
                  priority
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5 pt-20 text-white sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                    {settings?.business_name || barbershop.name}
                  </p>
                  <p className="mt-2 max-w-md text-xl font-extrabold leading-tight sm:text-2xl">
                    Cuidado nos detalhes. Facilidade desde o agendamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-[0_18px_45px_rgba(68,48,26,0.12)] sm:block">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
                  <UsersRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-lg font-extrabold">{barbers.length || 0}</p>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    profissionais disponíveis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="servicos"
        className="border-y border-[var(--border)] bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <Badge>
                <Scissors className="h-3.5 w-3.5" />
                Serviços
              </Badge>

              <h2 className="ui-h2 mt-5 font-extrabold text-[var(--text)]">
                Escolha o cuidado que combina com você.
              </h2>
            </div>

            <p className="ui-body max-w-2xl text-[var(--text-muted)] md:justify-self-end">
              Valores, duração e opções disponíveis de forma clara antes de
              você reservar.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article
                key={service.id}
                className="group overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[#FAF8F4] transition duration-300 hover:-translate-y-1 hover:border-[var(--tenant-accent)] hover:shadow-[0_20px_55px_rgba(68,48,26,0.10)]"
              >
                {service.image_url ? (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={service.image_url}
                      alt={service.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/7] items-end bg-[linear-gradient(135deg,var(--tenant-accent-soft),#ECE7DE)] p-5">
                    <span className="text-5xl font-extrabold text-[color-mix(in_srgb,var(--tenant-accent)_32%,transparent)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-extrabold tracking-tight text-[var(--text)]">
                      {service.name}
                    </h3>

                    <span className="shrink-0 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]">
                      {service.duration_minutes} min
                    </span>
                  </div>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--text-muted)]">
                    {service.description ||
                      "Atendimento profissional com horário reservado."}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
                    <p className="text-2xl font-extrabold text-[var(--text)]">
                      {formatarMoeda(Number(service.price))}
                    </p>

                    <ButtonLink
                      href={reserveUrl}
                      variant="ghost"
                      className="px-3"
                    >
                      Reservar
                      <ArrowRight className="h-4 w-4" />
                    </ButtonLink>
                  </div>
                </div>
              </article>
            ))}

            {!services.length && (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardDescription>
                  Nenhum serviço disponível no momento.
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section id="barbeiros" className="bg-[#F1EDE6]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>
              <Star className="h-3.5 w-3.5" />
              Nossa equipe
            </Badge>

            <h2 className="ui-h2 mt-5 font-extrabold text-[var(--text)]">
              Escolha quem vai cuidar do seu estilo.
            </h2>

            <p className="ui-body mt-4 text-[var(--text-muted)]">
              Conheça os profissionais disponíveis e escolha com quem deseja
              agendar.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber) => (
              <article
                key={barber.id}
                className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-white shadow-[0_14px_40px_rgba(68,48,26,0.06)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#252623]">
                  {barber.photo_url ? (
                    <Image
                      src={barber.photo_url}
                      alt={barber.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[linear-gradient(145deg,#252623,#373832)]">
                      <span className="grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/5 text-3xl font-extrabold text-white">
                        {barber.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-extrabold text-[var(--text)]">
                      {barber.name}
                    </h3>

                    <span className="h-2.5 w-2.5 rounded-full bg-[#287A55]" />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                    {barber.bio || "Profissional disponível para agendamento."}
                  </p>

                  <ButtonLink
                    href={reserveUrl}
                    variant="secondary"
                    className="mt-5 w-full"
                  >
                    Ver horários
                    <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                </div>
              </article>
            ))}

            {!barbers.length && (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardDescription>
                  Nenhum profissional disponível no momento.
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section id="contato" className="bg-[#252623] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">
              {settings?.business_name || barbershop.name}
            </p>

            <h2 className="ui-h2 mt-4 max-w-2xl font-extrabold text-white">
              Seu horário pode estar a poucos cliques.
            </h2>

            <div className="mt-6 grid gap-3 text-sm text-white/70">
              {settings?.address && (
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-accent)]" />
                  {settings.address}
                </p>
              )}

              {(settings?.whatsapp || settings?.phone) && (
                <p className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--tenant-accent)]" />
                  {settings.whatsapp || settings.phone}
                </p>
              )}
            </div>
          </div>

          <div className="lg:text-right">
            <ButtonLink href={reserveUrl} className="w-full sm:w-auto">
              <CalendarCheck className="h-4 w-4" />
              Agendar agora
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>

            <p className="mt-3 text-xs text-white/45">
              Consulte a disponibilidade atual antes de confirmar.
            </p>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-4 bottom-4 z-30 md:hidden">
        <ButtonLink
          href={reserveUrl}
          className="w-full shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
        >
          <CalendarCheck className="h-4 w-4" />
          Reservar horário
        </ButtonLink>
      </div>
    </main>
  );
}

export default async function BarbershopHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const uiVersion = await getTenantUiVersion(barbershop.slug);
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

  const data: HomeData = {
    services: (services ?? []) as HomeData["services"],
    barbers: (barbers ?? []) as HomeData["barbers"],
    settings: settings as HomeData["settings"],
  };

  if (uiVersion === "legacy") {
    return <LegacyHome barbershop={barbershop} data={data} />;
  }

  return <WarmPremiumHome barbershop={barbershop} data={data} />;
}

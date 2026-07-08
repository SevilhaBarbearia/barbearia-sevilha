import Image from 'next/image';
import { CalendarCheck, Clock3, MapPin, Phone, Scissors, ShieldCheck, Sparkles, Star, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { NavPublica } from '@/components/layout/NavPublica';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';


const beneficios: Array<{ icone: LucideIcon; titulo: string; texto: string }> = [
  { icone: Clock3, titulo: 'Sem espera no WhatsApp', texto: 'O cliente vê horários reais e reserva sozinho.' },
  { icone: ShieldCheck, titulo: 'Regras protegidas', texto: 'Evita agendamento duplicado e reserva fora do expediente.' },
  { icone: UserRoundCheck, titulo: 'Cliente identificado', texto: 'Nome, e-mail e telefone ficam salvos para contato.' }
];

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: services }, { data: barbers }, { data: settings }] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('price'),
    supabase.from('barbers').select('*').eq('is_active', true).order('name'),
    supabase.from('business_settings').select('*').limit(1).maybeSingle()
  ]);

  const nomeBarbearia = settings?.business_name ?? 'Sevilha Barbearia';

  return (
    <main className="fundo-premium min-h-screen overflow-hidden">
      <NavPublica />

      <section className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-[680px] grade-barbearia opacity-60" />

        <div>
          <Badge><Sparkles className="h-3.5 w-3.5" /> Experiência premium de agendamento</Badge>
          <h1 className="mt-6 max-w-4xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl xl:text-6xl">
            Visual de barbearia, agenda profissional e reserva em poucos cliques.
          </h1>
          <p className="mt-4 max-w-2xl sm:mt-6 text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            O cliente escolhe serviço, barbeiro, data e horário disponível. A barbearia controla reservas, atendimento e pagamento presencial em um painel simples e seguro.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <ButtonLink href="/reservar" className="min-w-[170px]">
              <CalendarCheck className="h-4 w-4" /> Reservar agora
            </ButtonLink>
            <ButtonLink href="/#servicos" variant="secondary" className="min-w-[160px]">
              <Scissors className="h-4 w-4" /> Ver serviços
            </ButtonLink>
          </div>

          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-3">
            {[
              ['24h', 'reserva online'],
              ['0', 'conflito de agenda'],
              ['100%', 'mobile first']
            ].map(([valor, texto]) => (
              <div key={texto} className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/20 backdrop-blur">
                <strong className="block text-xl font-black text-brand-100 sm:text-3xl">{valor}</strong>
                <span className="mt-1 block text-sm font-medium text-zinc-300">{texto}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-vidro relative rounded-[1.35rem] sm:rounded-[2rem] p-3 sm:p-4">
          <div className="absolute -right-8 -top-8 z-10 rounded-2xl sm:rounded-3xl border border-brand-500/35 bg-zinc-950/82 p-4 shadow-premium backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-brand-950">
                <Scissors className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-100/80">Hoje</p>
                <p className="text-sm font-black text-white">Agenda controlada</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-zinc-950">
            <Image
              src="/hero-barbearia.svg"
              alt="Ilustração premium de uma barbearia com cadeira, espelho e poste de barbeiro"
              width={920}
              height={720}
              priority
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="mt-3 sm:mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Próximo horário</p>
              <p className="mt-2 text-xl font-black text-white sm:text-2xl">14:30</p>
              <p className="text-sm text-zinc-300">Corte + barba</p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-brand-500/25 bg-brand-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-100/80">Pagamento</p>
              <p className="mt-2 text-xl font-black text-white sm:text-2xl">Presencial</p>
              <p className="text-sm text-zinc-300">Pix, dinheiro ou cartão local</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {beneficios.map(({ icone: Icone, titulo, texto }) => (
            <Card key={titulo} className="group hover:-translate-y-1 hover:border-brand-500/35 hover:bg-white/[0.085]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 sm:h-12 sm:w-12 sm:rounded-2xl text-brand-100 ring-1 ring-brand-500/25 transition group-hover:bg-brand-500 group-hover:text-brand-950">
                <Icone className="h-5 w-5" />
              </span>
              <CardTitle className="mt-4 sm:mt-5">{titulo}</CardTitle>
              <CardDescription>{texto}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge><Scissors className="h-3.5 w-3.5" /> Serviços</Badge>
            <h2 className="mt-3 sm:mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Escolha seu atendimento</h2>
            <p className="mt-3 max-w-2xl text-zinc-300">Cards mais visuais, preço claro e duração destacada para facilitar a decisão do cliente.</p>
          </div>
          <ButtonLink href="/reservar"><CalendarCheck className="h-4 w-4" /> Agendar</ButtonLink>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {services?.map((servico) => (
            <Card key={servico.id} className="group overflow-hidden p-0 hover:-translate-y-1 hover:border-brand-500/35">
              <div
                className="relative h-32 bg-gradient-to-br from-brand-950 via-zinc-950 to-black sm:h-40"
                style={servico.image_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,7,6,0.10), rgba(8,7,6,0.86)), url(${servico.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!servico.image_url && (
                  <div className="absolute inset-0 grid place-items-center grade-barbearia">
                    <span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-premium sm:h-16 sm:w-16 sm:rounded-[1.5rem]">
                      <Scissors className="h-8 w-8" />
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {/* Título e duração ficam na mesma linha para evitar sobreposição visual no card. */}
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="leading-snug">{servico.name}</CardTitle>
                  <span className="shrink-0 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-100">
                    {servico.duration_minutes} min
                  </span>
                </div>

                <CardDescription>{servico.description ?? 'Atendimento profissional com horário reservado e acabamento premium.'}</CardDescription>
                <div className="mt-4 sm:mt-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-zinc-400">A partir de</span>
                  <strong className="text-xl font-black text-brand-100 sm:text-2xl">{formatarMoeda(Number(servico.price))}</strong>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="barbeiros" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <Badge><Star className="h-3.5 w-3.5" /> Equipe</Badge>
        <h2 className="mt-3 sm:mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Barbeiros disponíveis</h2>
        <p className="mt-3 max-w-2xl text-zinc-300">A escolha por profissional aumenta a confiança e reduz dúvidas antes da reserva.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {barbers?.map((barber) => (
            <Card key={barber.id} className="group overflow-hidden p-0 hover:-translate-y-1 hover:border-brand-500/35">
              <div
                className="h-44 bg-gradient-to-br from-zinc-900 via-brand-950 to-black sm:h-56 lg:h-64"
                style={barber.photo_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,7,6,0), rgba(8,7,6,0.82)), url(${barber.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!barber.photo_url && (
                  <div className="grid h-full place-items-center grade-barbearia">
                    <span className="grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-[2.25rem] border border-brand-500/40 bg-black/28 text-brand-100 shadow-premium">
                      <Scissors className="h-10 w-10" />
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <CardTitle>{barber.name}</CardTitle>
                <CardDescription>{barber.bio ?? 'Especialista em cortes masculinos, barba, acabamento e atendimento com horário marcado.'}</CardDescription>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="contato" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <Card className="grid gap-8 overflow-hidden bg-gradient-to-br from-white/[0.09] to-brand-500/[0.08] md:grid-cols-[1fr_0.72fr] md:items-center">
          <div>
            <Badge>Contato</Badge>
            <h2 className="mt-3 sm:mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">{nomeBarbearia}</h2>
            <p className="mt-3 max-w-2xl text-zinc-300">Reserve online e, se precisar, entre em contato pelos canais cadastrados pela barbearia.</p>
            <div className="mt-6 grid gap-3 text-sm font-medium text-zinc-200">
              {settings?.address && <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-brand-100" /> {settings.address}</p>}
              {(settings?.phone || settings?.whatsapp) && <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-brand-100" /> {settings.whatsapp ?? settings.phone}</p>}
            </div>
          </div>
          <div className="rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-black/22 p-4 sm:p-5">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-100/80">Pronto para reservar?</p>
            <p className="mt-2 text-xl font-black text-white sm:text-2xl">Escolha o melhor horário agora.</p>
            <ButtonLink href="/reservar" className="mt-6 w-full"><CalendarCheck className="h-4 w-4" /> Fazer reserva</ButtonLink>
          </div>
        </Card>
      </section>
    </main>
  );
}

import Image from 'next/image';
import { redirect } from 'next/navigation';
import { CalendarCheck, CreditCard, Scissors } from 'lucide-react';
import { ReservaForm } from '@/components/forms/ReservaForm';
import { NavPublica } from '@/components/layout/NavPublica';
import { Badge } from '@/components/ui/Badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { obterUsuarioAtual } from '@/lib/auth/permissoes';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReservarPage() {
  const { user, profile } = await obterUsuarioAtual();
  if (!user) redirect('/login');
  if (!profile?.phone || !profile?.full_name) redirect('/completar-cadastro');

  const supabase = await createClient();
  const [{ data: services }, { data: barbers }] = await Promise.all([
    supabase.from('services').select('*').eq('is_active', true).order('name'),
    supabase.from('barbers').select('*, barber_services(service_id, is_active)').eq('is_active', true).order('name')
  ]);

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <aside className="hero-vidro overflow-hidden rounded-[1.35rem] sm:rounded-[2rem] p-4 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-zinc-950">
            <Image src="/hero-barbearia.svg" alt="Ilustração de barbearia" width={920} height={720} className="h-auto w-full" priority />
          </div>
          <div className="mt-4 sm:mt-5">
            <Badge><CalendarCheck className="h-3.5 w-3.5" /> Reserva guiada</Badge>
            <h1 className="mt-3 sm:mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Escolha seu melhor horário.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              O sistema valida expediente, bloqueios e conflitos de agenda antes de confirmar sua reserva.
            </p>
          </div>
          <div className="mt-4 sm:mt-5 grid gap-3 text-sm text-zinc-300">
            <p className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Scissors className="h-5 w-5 text-brand-100" /> Serviço e barbeiro escolhidos por você.</p>
            <p className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><CreditCard className="h-5 w-5 text-brand-100" /> Pagamento feito presencialmente.</p>
          </div>
        </aside>

        <Card>
          <CardTitle>Nova reserva</CardTitle>
          <CardDescription>
            Escolha serviço, barbeiro e um horário disponível. O pagamento será feito presencialmente na barbearia.
          </CardDescription>
          <div className="mt-8">
            <ReservaForm services={services ?? []} barbers={barbers ?? []} />
          </div>
        </Card>
      </section>
    </main>
  );
}

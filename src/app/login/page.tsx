import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Scissors, ShieldCheck, Smartphone } from 'lucide-react';
import { LoginGoogleButton } from '@/components/forms/LoginGoogleButton';
import { Logo } from '@/components/brand/Logo';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { obterUsuarioAtual } from '@/lib/auth/permissoes';

export default async function LoginPage() {
  const { user, profile } = await obterUsuarioAtual();
  if (user && profile?.phone) redirect('/reservar');
  if (user && !profile?.phone) redirect('/completar-cadastro');

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[1.35rem] sm:rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-premium backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden min-h-[560px] overflow-hidden bg-zinc-950 lg:block">
          {/* object-contain evita corte da ilustração em produção e preserva o visual no card. */}
          <Image
            src="/hero-barbearia.svg"
            alt="Ambiente visual de barbearia"
            fill
            className="object-contain object-center p-6 sm:p-8"
            sizes="(min-width: 1024px) 48vw, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-100">Reserva online</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Entre para confirmar seu horário.</h1>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <Logo />
          <Card className="mt-8 border-white/10 bg-black/18 shadow-none">
            <CardTitle>Entrar na barbearia</CardTitle>
            <CardDescription>
              No MVP, o login principal é com Google. Depois do primeiro acesso, pediremos seu telefone/WhatsApp para confirmação de reserva.
            </CardDescription>
            <div className="mt-8"><LoginGoogleButton /></div>
          </Card>

          <div className="mt-6 grid gap-3 text-sm text-zinc-300">
            <p className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><ShieldCheck className="h-5 w-5 text-brand-100" /> Seus dados ficam protegidos por autenticação Supabase.</p>
            <p className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Smartphone className="h-5 w-5 text-brand-100" /> O telefone será usado apenas para contato da reserva.</p>
            <p className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Scissors className="h-5 w-5 text-brand-100" /> Pagamento somente presencial na barbearia.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

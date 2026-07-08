import Image from 'next/image';
import { CompletarCadastroForm } from '@/components/forms/CompletarCadastroForm';
import { Logo } from '@/components/brand/Logo';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { exigirUsuario } from '@/lib/auth/permissoes';

export default async function CompletarCadastroPage() {
  const { user, profile } = await exigirUsuario();

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[1.35rem] sm:rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-premium backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden min-h-[560px] overflow-hidden bg-zinc-950 lg:block">
          <Image src="/hero-barbearia.svg" alt="Ambiente visual de barbearia" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-100">Cadastro</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Dados certos evitam erro na reserva.</h1>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <Logo />
          <Card className="mt-8 border-white/10 bg-black/18 shadow-none">
            <CardTitle>Complete seu cadastro</CardTitle>
            <CardDescription>
              Para concluir reservas, a barbearia precisa do seu telefone/WhatsApp salvo no perfil.
            </CardDescription>
            <div className="mt-8">
              <CompletarCadastroForm nome={profile?.full_name ?? user.user_metadata?.name} email={profile?.email ?? user.email} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

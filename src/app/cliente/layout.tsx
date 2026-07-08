import { ClienteSidebar } from '@/components/layout/ClienteSidebar';
import { NavPublica } from '@/components/layout/NavPublica';
import { obterUsuarioAtual } from '@/lib/auth/permissoes';
import { redirect } from 'next/navigation';

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await obterUsuarioAtual();
  if (!user) redirect('/login');
  if (!profile?.phone || !profile?.full_name) redirect('/completar-cadastro');

  return (
    <main className="fundo-premium min-h-screen">
      <NavPublica />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row">
        <ClienteSidebar />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}

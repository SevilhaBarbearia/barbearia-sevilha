import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { AdminLoginForm } from '@/components/forms/AdminLoginForm';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { obterAdministradorAtual } from '@/lib/auth/permissoes';

export const metadata: Metadata = {
  title: 'Administração | Sevilha Barbearia',
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage() {
  if (await obterAdministradorAtual()) redirect('/admin');
  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <Card className="mt-8">
          <CardTitle>Administração</CardTitle>
          <CardDescription>Entre com a conta administrativa para acompanhar reservas, agenda e pagamentos.</CardDescription>
          <AdminLoginForm />
        </Card>
        <Link href="/login" className="mt-6 block text-center text-sm text-zinc-300">É cliente? Acesse seus agendamentos</Link>
      </div>
    </main>
  );
}
